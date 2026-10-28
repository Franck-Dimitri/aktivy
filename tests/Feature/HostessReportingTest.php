<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\DailyReport;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Parcours complet d'un rapport journalier : de la prise de service de l'hôtesse
 * jusqu'à sa lecture par le responsable.
 */
class HostessReportingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    private function site(User $manager, string $name = 'Santa Lucia'): Site
    {
        $site = $manager->company->sites()->create([
            'name' => $name,
            'type' => 'autre',
            'city' => 'Douala',
            'created_by' => $manager->id,
        ]);
        $product = $manager->company->products()->create(['name' => "Savon {$name}", 'unit' => 'pièce', 'price' => 500]);
        SiteProduct::create([
            'company_id' => $manager->company_id,
            'site_id' => $site->id,
            'product_id' => $product->id,
            'current_stock' => 50,
        ]);

        return $site;
    }

    private function assign(User $manager, User $member, Site $site): void
    {
        $manager->company->affectations()->create([
            'site_id' => $site->id,
            'user_id' => $member->id,
            'assigned_by' => $manager->id,
            'starts_on' => now()->toDateString(),
            'status' => AffectationStatus::Active,
        ]);
    }

    /** L'hôtesse prend son service, déclare 4 ventes et soumet son rapport. */
    private function submitReport(User $agent, int $sold = 4): DailyReport
    {
        $this->actingAs($agent)->post(route('terrain.visit.store'), [
            'affectation_id' => $agent->affectations()->value('id'),
        ])->assertSessionHasNoErrors();

        $report = DailyReport::where('user_id', $agent->id)->with('lines')->firstOrFail();
        $lines = [['id' => $report->lines->first()->id, 'units_sold' => $sold]];

        $this->actingAs($agent)->put(route('terrain.report.update', $report->visit_id), ['lines' => $lines])
            ->assertSessionHasNoErrors();
        $this->actingAs($agent)->post(route('terrain.report.submit', $report->visit_id), [
            'lines' => $lines,
            'incident_notes' => 'Présentoir abîmé',
        ])->assertSessionHasNoErrors();

        return $report->fresh();
    }

    public function test_a_submitted_report_is_visible_to_the_manager_with_its_sales_and_incident()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $this->assign($manager, $agent, $this->site($manager));

        $report = $this->submitReport($agent);
        $this->assertSame('submitted', $report->status);

        $this->actingAs($manager)->get(route('daily-reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('daily-reports/index')
                ->has('reports', 1)
                ->where('reports.0.status', 'submitted')
                ->where('reports.0.revenue', 2000)
                ->where('reports.0.has_incident', true)
                ->has('missing', 0));

        $this->actingAs($manager)->get(route('daily-reports.show', $report))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('daily-reports/show')
                ->where('report.total_units_sold', 4)
                ->where('report.incident_notes', 'Présentoir abîmé'));

        // Les ventes du rapport alimentent aussi la page des ventes
        $this->actingAs($manager)->get(route('reports.index'))
            ->assertInertia(fn ($page) => $page->where('totals.revenue', 2000));
    }

    public function test_a_hostess_who_has_not_checked_in_is_listed_as_missing()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $this->assign($manager, $agent, $this->site($manager));

        $this->actingAs($manager)->get(route('daily-reports.index'))
            ->assertInertia(fn ($page) => $page
                ->has('reports', 0)
                ->has('missing', 1)
                ->where('missing.0.user_id', $agent->id));
    }

    public function test_the_accountant_can_read_reports_but_a_hostess_can_not_read_the_manager_screen()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $accountant = User::factory()->accountant()->create(['company_id' => $manager->company_id]);
        $this->assign($manager, $agent, $this->site($manager));
        $report = $this->submitReport($agent);

        $this->actingAs($accountant)->get(route('daily-reports.show', $report))->assertOk();
        $this->actingAs($agent)->get(route('daily-reports.index'))->assertForbidden();
    }

    public function test_a_manager_sets_a_monthly_target_that_the_hostess_sees_on_her_home()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $this->assign($manager, $agent, $this->site($manager));
        $this->submitReport($agent);

        $this->actingAs($manager)->post(route('reports.targets.save'), [
            'user_id' => $agent->id,
            'amount' => 100000,
        ])->assertSessionHasNoErrors();

        $this->actingAs($manager)->get(route('reports.index'))
            ->assertInertia(fn ($page) => $page
                ->where('targets.hostesses.0.user_id', $agent->id)
                ->where('targets.hostesses.0.target', 100000)
                ->where('targets.hostesses.0.actual', 2000));

        $this->actingAs($agent)->get(route('terrain.home'))
            ->assertInertia(fn ($page) => $page
                ->where('my_target.target', 100000)
                ->where('my_target.actual', 2000));
    }

    public function test_a_hostess_without_any_point_of_sale_is_told_so()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);

        $this->actingAs($agent)->get(route('terrain.home'))
            ->assertInertia(fn ($page) => $page
                ->where('auth.noSite', true)
                ->where('affectation', null));

        $this->actingAs($agent)->post(route('terrain.visit.store'), ['affectation_id' => 999])->assertNotFound();
    }

    public function test_a_hostess_whose_assignment_starts_later_sees_when_she_starts()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $manager->company->affectations()->create([
            'site_id' => $this->site($manager)->id,
            'user_id' => $agent->id,
            'assigned_by' => $manager->id,
            'starts_on' => now()->addDays(3)->toDateString(),
            'status' => AffectationStatus::Active,
        ]);

        $this->actingAs($agent)->get(route('terrain.home'))
            ->assertInertia(fn ($page) => $page
                ->where('auth.noSite', false)
                ->where('affectation', null)
                ->where('next_affectation.site_name', 'Santa Lucia'));
    }
}
