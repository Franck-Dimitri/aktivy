<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\DailyReport;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use App\Models\WeeklyTarget;
use App\Notifications\LiveNotification;
use App\Notifications\ReminderNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use Tests\TestCase;

/**
 * Notifications temps réel : chaque action prévient la bonne personne, sous la cloche et en push.
 */
class LiveNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $hostess;

    private Site $site;

    private SiteProduct $juice;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Notification::fake();

        $this->manager = User::factory()->create();
        $this->hostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id, 'name' => 'Awa']);
        $this->site = $this->manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);
        $product = $this->manager->company->products()->create(['name' => 'Jus', 'unit' => 'bouteille', 'price' => 1000]);
        $this->juice = SiteProduct::create(['company_id' => $this->manager->company_id, 'site_id' => $this->site->id, 'product_id' => $product->id, 'current_stock' => 50, 'alert_threshold' => 10, 'critical_threshold' => 3]);
        $this->manager->company->affectations()->create([
            'site_id' => $this->site->id, 'user_id' => $this->hostess->id, 'assigned_by' => $this->manager->id,
            'starts_on' => now()->subWeek()->toDateString(), 'status' => AffectationStatus::Active,
        ]);
    }

    private function live(User $to, string $type): bool
    {
        return Notification::sent($to, LiveNotification::class)->contains(fn ($n) => $n->type === $type);
    }

    private function checkIn(): DailyReport
    {
        $this->actingAs($this->hostess)->post(route('terrain.visit.store'), ['affectation_id' => $this->hostess->affectations()->value('id')])->assertSessionHasNoErrors();

        return DailyReport::where('user_id', $this->hostess->id)->with('lines')->firstOrFail();
    }

    public function test_the_hostess_day_is_followed_live_by_her_managers()
    {
        $report = $this->checkIn();
        $this->assertTrue($this->live($this->manager, 'shift_started'), 'prise de service');

        $this->actingAs($this->hostess)->post(route('terrain.report.submit', $report->visit), [
            'lines' => [['id' => $report->lines->first()->id, 'units_sold' => 5]],
        ])->assertSessionHasNoErrors();
        $this->assertTrue($this->live($this->manager, 'report_submitted'), 'rapport envoyé');

        $this->actingAs($this->hostess)->patch(route('terrain.visit.checkout', $report->visit))->assertSessionHasNoErrors();
        $this->assertTrue($this->live($this->manager, 'shift_ended'), 'fin de journée');
        $this->assertFalse($this->live($this->hostess, 'shift_started'), 'L’hôtesse n’est pas notifiée de ses propres actions');
    }

    public function test_reaching_the_weekly_target_is_celebrated_once()
    {
        WeeklyTarget::create(['company_id' => $this->manager->company_id, 'user_id' => $this->hostess->id, 'week_start' => WeeklyTarget::weekOf(now())->toDateString(), 'amount' => 4000]);
        $report = $this->checkIn();

        $this->actingAs($this->hostess)->post(route('terrain.report.submit', $report->visit), [
            'lines' => [['id' => $report->lines->first()->id, 'units_sold' => 5]],
        ]);

        Notification::assertSentTo($this->hostess, LiveNotification::class, fn ($n) => $n->type === 'target_reached' && str_contains($n->title(), 'semaine'));
        Notification::assertSentTo($this->manager, LiveNotification::class, fn ($n) => $n->type === 'target_reached' && str_contains($n->title(), 'Awa'));
    }

    public function test_restock_and_low_stock()
    {
        $this->actingAs($this->manager)->post(route('sites.inventory.restock', [$this->site, $this->juice]), ['quantity' => 24])->assertSessionHasNoErrors();
        Notification::assertSentTo($this->hostess, LiveNotification::class, fn ($n) => $n->type === 'restocked' && str_contains($n->body(), '+24'));

        $this->actingAs($this->manager)->put(route('sites.inventory.update', [$this->site, $this->juice]), ['current_stock' => 8, 'alert_threshold' => 10, 'critical_threshold' => 3]);
        $this->assertTrue($this->live($this->manager, 'stock_low'));
    }

    public function test_assignments_reach_the_hostess()
    {
        $other = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);

        $this->actingAs($this->manager)->post(route('affectations.store'), [
            'site_id' => $this->site->id, 'user_id' => $other->id, 'starts_on' => now()->addDay()->toDateString(), 'slot_start' => '08:00', 'slot_end' => '16:00',
        ])->assertSessionHasNoErrors();
        Notification::assertSentTo($other, LiveNotification::class, fn ($n) => $n->type === 'assigned_to_site' && str_contains($n->body(), '08:00'));

        $event = $this->manager->company->events()->create(['name' => 'Foire', 'start_date' => now()->toDateString(), 'end_date' => now()->addDays(3)->toDateString(), 'created_by' => $this->manager->id]);
        $this->actingAs($this->manager)->post(route('events.hostesses.store', $event), ['mode' => 'existing', 'user_id' => $other->id])->assertSessionHasNoErrors();
        Notification::assertSentTo($other, LiveNotification::class, fn ($n) => $n->type === 'assigned_to_event');
    }

    public function test_plan_changes_reach_the_manager_and_signups_reach_the_platform_admin()
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->put(route('admin.companies.plan.update', $this->manager->company), ['plan' => 'pro', 'ends_on' => now()->addMonth()->toDateString()])->assertSessionHasNoErrors();
        $this->assertTrue($this->live($this->manager, 'plan_changed'));

        auth()->logout();
        $this->post(route('register.store'), [
            'company_name' => 'Nouvelle SARL', 'name' => 'Paul Nkeng', 'email' => 'paul@nouvelle.cm',
            'password' => 'Mot2passe!Solide', 'password_confirmation' => 'Mot2passe!Solide',
        ]);
        Notification::assertSentTo($admin, LiveNotification::class, fn ($n) => $n->type === 'company_registered' && str_contains($n->title(), 'Nouvelle SARL'));
    }

    public function test_notifications_are_pushed_only_to_subscribed_devices()
    {
        $notification = ReminderNotification::shiftUpcoming('Akwa', '08:00');
        $this->assertSame(['database'], $notification->via($this->hostess));

        $this->hostess->updatePushSubscription('https://push.example.com/abc', 'cGtleQ', 'YXV0aA', 'aes128gcm');
        $this->assertSame(['database', WebPushChannel::class], $notification->via($this->hostess->fresh()));

        $payload = $notification->toWebPush($this->hostess)->toArray();
        $this->assertSame('Prise de service à 08:00', $payload['title']);
        $this->assertSame('/terrain', $payload['data']['url']);
        $this->assertSame('fr', $payload['lang']);
    }

    public function test_a_device_subscribes_and_unsubscribes()
    {
        $this->actingAs($this->hostess)->postJson(route('push.subscribe'), ['endpoint' => 'https://push.example.com/xyz', 'keys' => ['p256dh' => 'cGtleQ', 'auth' => 'YXV0aA']])->assertOk();
        $this->assertSame(1, $this->hostess->pushSubscriptions()->count());

        $this->actingAs($this->hostess)->deleteJson(route('push.unsubscribe'), ['endpoint' => 'https://push.example.com/xyz'])->assertOk();
        $this->assertSame(0, $this->hostess->pushSubscriptions()->count());
    }

    public function test_the_manager_saves_the_reminder_settings()
    {
        $settings = [
            'shift_upcoming' => true, 'shift_upcoming_minutes' => 45, 'shift_late' => true, 'shift_late_minutes' => 20,
            'closing' => false, 'closing_minutes' => 0, 'report' => true, 'report_time' => '18:00',
            'missing_reports' => true, 'missing_reports_time' => '18:30', 'low_stock' => true, 'low_stock_time' => '08:30',
            'tickets' => true, 'tickets_hours' => 2, 'event_tomorrow' => true, 'event_tomorrow_time' => '16:00',
            'default_start' => '07:30', 'default_end' => '16:30', 'quiet_start' => '20:30', 'quiet_end' => '06:00',
        ];

        $this->actingAs($this->manager)->put(route('company.settings.reminders'), $settings)->assertSessionHasNoErrors();
        $this->assertSame(45, $this->manager->company->fresh()->reminder_settings['shift_upcoming_minutes']);

        $this->actingAs($this->manager)->put(route('company.settings.reminders'), ['report_time' => '25:00'] + $settings)->assertSessionHasErrors('report_time');
        $this->actingAs($this->hostess)->put(route('company.settings.reminders'), $settings)->assertForbidden();
    }
}
