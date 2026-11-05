<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\Site;
use App\Models\User;
use App\Models\WeeklyTarget;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Onglet « Objectifs » : qui a atteint son objectif, et calcul d'une échelle depuis l'autre.
 */
class ObjectivesPageTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private Site $site;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        // Jeudi 5 novembre 2026 (novembre : 30 jours)
        $this->travelTo(CarbonImmutable::parse('2026-11-05 10:00'));

        $this->manager = User::factory()->create();
        $this->site = $this->manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);
    }

    private function hostess(string $name): User
    {
        $h = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id, 'name' => $name]);
        $this->manager->company->affectations()->create([
            'site_id' => $this->site->id, 'user_id' => $h->id, 'assigned_by' => $this->manager->id,
            'starts_on' => '2026-10-01', 'status' => AffectationStatus::Active,
        ]);

        return $h;
    }

    /** Un rapport envoyé avec une seule ligne de vente, inséré directement (sans passer par la saisie). */
    private function sold(User $h, string $date, int $revenue): void
    {
        $now = now();
        $company = $h->company_id;
        $product = DB::table('products')->insertGetId(['company_id' => $company, 'name' => "Jus {$h->id}", 'created_at' => $now, 'updated_at' => $now]);
        $stock = DB::table('site_products')->insertGetId(['company_id' => $company, 'site_id' => $this->site->id, 'product_id' => $product, 'created_at' => $now, 'updated_at' => $now]);
        $visit = DB::table('visits')->insertGetId(['company_id' => $company, 'site_id' => $this->site->id, 'user_id' => $h->id, 'checked_in_at' => "$date 08:00:00", 'status' => 'completed', 'created_at' => $now, 'updated_at' => $now]);
        $report = DB::table('daily_reports')->insertGetId(['company_id' => $company, 'site_id' => $this->site->id, 'user_id' => $h->id, 'visit_id' => $visit, 'report_date' => $date, 'status' => 'submitted', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('daily_report_lines')->insert(['daily_report_id' => $report, 'site_product_id' => $stock, 'product_name' => 'Jus', 'unit' => 'bouteille', 'units_sold' => 1, 'revenue' => $revenue, 'created_at' => $now, 'updated_at' => $now]);
    }

    public function test_the_page_ranks_who_reached_their_weekly_target()
    {
        $awa = $this->hostess('Awa');
        $brenda = $this->hostess('Brenda');
        $carole = $this->hostess('Carole');
        foreach ([$awa, $brenda] as $h) {
            WeeklyTarget::create(['company_id' => $h->company_id, 'user_id' => $h->id, 'week_start' => '2026-11-02', 'amount' => 10000]);
        }
        $this->sold($awa, '2026-11-03', 12000);
        $this->sold($brenda, '2026-11-03', 2000);

        $this->actingAs($this->manager)->get(route('reports.objectives'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('reports/objectives')
                ->where('overview.summary.with_target', 2)
                ->where('overview.summary.reached', 1)
                ->where('overview.summary.behind', 1)
                ->where('overview.rows.0.name', 'Awa')
                ->where('overview.rows.0.status', 'reached')
                ->where('overview.rows.1.name', 'Brenda')
                ->where('overview.rows.1.status', 'behind')
                ->where('overview.rows.2.name', 'Carole')
                ->where('overview.rows.2.status', 'none'));
    }

    public function test_the_monthly_target_is_calculated_from_the_weekly_one()
    {
        $awa = $this->hostess('Awa');
        WeeklyTarget::create(['company_id' => $awa->company_id, 'user_id' => $awa->id, 'week_start' => '2026-10-26', 'amount' => 7000]);

        // 7 000 par semaine = 1 000 par jour, sur les 30 jours de novembre
        $this->actingAs($this->manager)->get(route('reports.objectives', ['period' => 'month']))
            ->assertInertia(fn ($page) => $page
                ->where('overview.rows.0.target', 30000)
                ->where('overview.rows.0.source', 'derived'));
    }

    public function test_the_weekly_target_is_calculated_from_the_monthly_one()
    {
        $awa = $this->hostess('Awa');
        $this->actingAs($this->manager)->post(route('reports.targets.save'), ['user_id' => $awa->id, 'amount' => 300000]);

        // Semaine du 2 novembre : 300 000 × 7 / 30 = 70 000
        $this->actingAs($this->manager)->get(route('reports.objectives', ['period' => 'week']))
            ->assertInertia(fn ($page) => $page
                ->where('overview.rows.0.target', 70000)
                ->where('overview.rows.0.source', 'derived'));
    }

    public function test_the_accountant_can_view_but_not_edit()
    {
        $accountant = User::factory()->accountant()->create(['company_id' => $this->manager->company_id]);

        $this->actingAs($accountant)->get(route('reports.objectives'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('canEditTargets', false));
    }

    public function test_an_unknown_period_is_refused()
    {
        $this->actingAs($this->manager)->get(route('reports.objectives', ['period' => 'year']))->assertSessionHasErrors('period');
    }
}
