<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\Affectation;
use App\Models\DailyReport;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use App\Notifications\HostessesNotCheckedIn;
use App\Notifications\IncidentReported;
use App\Notifications\ReportReminder;
use App\Notifications\StockCritical;
use App\Notifications\TicketCreated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Lot « suivi au quotidien » : notifications, activité du jour, alertes de stock.
 */
class NotificationsAndActivityTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $supervisor;

    private User $otherSupervisor;

    private User $agent;

    private Site $site;

    private SiteProduct $soap;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        // 9 h du matin : le créneau de 8 h est dépassé de plus de 30 minutes
        $this->travelTo(today()->setTime(9, 0));

        $this->manager = User::factory()->create();
        $this->supervisor = User::factory()->supervisor()->create(['company_id' => $this->manager->company_id]);
        $this->otherSupervisor = User::factory()->supervisor()->create(['company_id' => $this->manager->company_id]);
        $this->agent = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $this->site = $this->site('Akwa');
        $otherSite = $this->site('Bonapriso');

        $product = $this->manager->company->products()->create(['name' => 'Savon', 'unit' => 'pièce', 'price' => 500]);
        $this->soap = SiteProduct::create([
            'company_id' => $this->manager->company_id,
            'site_id' => $this->site->id,
            'product_id' => $product->id,
            'current_stock' => 10,
            'alert_threshold' => 6,
            'critical_threshold' => 3,
        ]);

        $this->assign($this->supervisor, $this->site);
        $this->assign($this->otherSupervisor, $otherSite);
        $this->assign($this->agent, $this->site, '08:00');
    }

    private function site(string $name): Site
    {
        return $this->manager->company->sites()->create([
            'name' => $name,
            'type' => 'autre',
            'city' => 'Douala',
            'created_by' => $this->manager->id,
        ]);
    }

    private function assign(User $member, Site $site, ?string $slot = null): Affectation
    {
        return $this->manager->company->affectations()->create([
            'site_id' => $site->id,
            'user_id' => $member->id,
            'assigned_by' => $this->manager->id,
            'starts_on' => today()->toDateString(),
            'slot_start' => $slot,
            'status' => AffectationStatus::Active,
        ]);
    }

    private function checkIn(): DailyReport
    {
        $this->actingAs($this->agent)->post(route('terrain.visit.store'), [
            'affectation_id' => $this->agent->affectations()->value('id'),
        ])->assertSessionHasNoErrors();

        return DailyReport::where('user_id', $this->agent->id)->with('lines')->firstOrFail();
    }

    private function submit(DailyReport $report, int $sold, ?string $incident = null): void
    {
        $this->actingAs($this->agent)->post(route('terrain.report.submit', $report->visit_id), [
            'lines' => [['id' => $report->lines->first()->id, 'units_sold' => $sold]],
            'incident_notes' => $incident,
        ])->assertSessionHasNoErrors();
    }

    public function test_an_incident_notifies_the_manager_and_the_supervisor_of_the_site_only()
    {
        Notification::fake();

        $this->submit($this->checkIn(), 1, 'Présentoir cassé');

        Notification::assertSentTo([$this->manager, $this->supervisor], IncidentReported::class);
        Notification::assertNotSentTo([$this->otherSupervisor, $this->agent], IncidentReported::class);
    }

    public function test_critical_stock_is_reported_once_when_the_threshold_is_crossed()
    {
        Notification::fake();

        // 10 → 5 : sous l'alerte mais pas critique ; puis 5 → 2 : critique
        $this->actingAs($this->manager)->put(route('sites.inventory.update', [$this->site, $this->soap]), [
            'current_stock' => 5, 'alert_threshold' => 6, 'critical_threshold' => 3,
        ]);
        Notification::assertNothingSentTo($this->manager);

        $this->submit($this->checkIn(), 3);
        Notification::assertSentToTimes($this->manager, StockCritical::class, 1);

        // Déjà sous le seuil : pas de nouvelle alerte
        $this->actingAs($this->manager)->put(route('sites.inventory.update', [$this->site, $this->soap]), [
            'current_stock' => 1, 'alert_threshold' => 6, 'critical_threshold' => 3,
        ]);
        Notification::assertSentToTimes($this->manager, StockCritical::class, 1);
    }

    public function test_a_new_ticket_notifies_the_hostess_managers()
    {
        Notification::fake();

        $this->actingAs($this->agent)->post(route('terrain.tickets.store'), [
            'subject' => 'Plus de sacs',
            'body' => 'Il n’y a plus de sacs au stand.',
            'priority' => 'urgent',
        ])->assertSessionHasNoErrors();

        Notification::assertSentTo([$this->manager, $this->supervisor], TicketCreated::class);
        Notification::assertNotSentTo($this->otherSupervisor, TicketCreated::class);
    }

    public function test_a_hostess_who_has_not_checked_in_is_reported_once_a_day()
    {
        Notification::fake();

        $this->artisan('notifications:attendance')->assertSuccessful();
        $this->artisan('notifications:attendance')->assertSuccessful();

        Notification::assertSentToTimes($this->manager, HostessesNotCheckedIn::class, 1);
        Notification::assertSentTo($this->supervisor, HostessesNotCheckedIn::class);
        Notification::assertNotSentTo($this->otherSupervisor, HostessesNotCheckedIn::class);
    }

    public function test_nobody_is_reported_before_the_end_of_the_grace_period_or_after_check_in()
    {
        Notification::fake();

        $this->travelTo(today()->setTime(8, 15));
        $this->artisan('notifications:attendance');
        Notification::assertNothingSent();

        $this->travelTo(today()->setTime(9, 0));
        $this->checkIn();
        $this->artisan('notifications:attendance');
        Notification::assertNotSentTo($this->manager, HostessesNotCheckedIn::class);
    }

    public function test_a_hostess_with_a_draft_report_gets_an_evening_reminder()
    {
        Notification::fake();
        $this->checkIn();

        $this->artisan('notifications:report-reminders')->assertSuccessful();

        Notification::assertSentTo($this->agent, ReportReminder::class, fn ($n, $channels) => $channels === ['database']);
    }

    public function test_notifications_are_listed_counted_opened_and_marked_as_read()
    {
        $report = $this->checkIn();
        $this->submit($report, 1, 'Présentoir cassé');

        $this->actingAs($this->manager)->get(route('notifications.index'))
            ->assertInertia(fn ($page) => $page
                ->where('auth.unreadNotifications', 1)
                ->where('notifications.0.kind', 'incident')
                ->where('notifications.0.read', false));

        $id = $this->manager->notifications()->value('id');
        $this->actingAs($this->manager)->get(route('notifications.open', $id))
            ->assertRedirect(route('daily-reports.show', $report, absolute: false));
        $this->assertSame(0, $this->manager->unreadNotifications()->count());

        // Une notification d'un autre utilisateur ne s'ouvre pas
        $this->actingAs($this->otherSupervisor)->get(route('notifications.open', $id))->assertNotFound();
    }

    public function test_the_activity_board_shows_who_is_on_site_and_who_is_missing()
    {
        $late = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $this->assign($late, $this->site, '08:00');
        $this->checkIn();

        $this->actingAs($this->manager)->get(route('activity.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('totals.expected', 2)
                ->where('totals.on_site', 1)
                ->where('totals.missing', 1)
                ->has('sites', 1));

        // Le superviseur d'un autre site ne voit pas ce site
        $this->actingAs($this->otherSupervisor)->get(route('activity.index'))
            ->assertInertia(fn ($page) => $page->has('sites', 0));
    }

    public function test_stock_alerts_list_products_under_their_threshold_most_urgent_first()
    {
        $cream = $this->manager->company->products()->create(['name' => 'Crème', 'unit' => 'pièce']);
        SiteProduct::create([
            'company_id' => $this->manager->company_id,
            'site_id' => $this->site->id,
            'product_id' => $cream->id,
            'current_stock' => 1,
            'alert_threshold' => 5,
            'critical_threshold' => 2,
        ]);
        $this->soap->update(['current_stock' => 4]);

        $this->actingAs($this->manager)->get(route('stock-alerts.index'))
            ->assertInertia(fn ($page) => $page
                ->has('alerts', 2)
                ->where('alerts.0.product_name', 'Crème')
                ->where('alerts.0.level', 'critical')
                ->where('alerts.1.level', 'warning'));

        $this->actingAs($this->otherSupervisor)->get(route('stock-alerts.index'))
            ->assertInertia(fn ($page) => $page->has('alerts', 0));
    }
}
