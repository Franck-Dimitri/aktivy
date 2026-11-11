<?php

namespace Tests\Feature;

use App\Enums\Plan;
use App\Models\Company;
use App\Models\DailyReport;
use App\Models\DailyReportLine;
use App\Models\Site;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Les comptes de démo arrivent avec de quoi tout essayer, et le seeder peut être relancé sans doublon.
 */
class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_demo_company_gets_sites_affectations_and_history_once()
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $company = Company::where('slug', 'demo-distribution')->firstOrFail();
        $hostess = User::where('phone', '+237690000001')->firstOrFail();
        $supervisor = User::where('email', 'superviseur@demo.test')->firstOrFail();

        $this->assertSame(Plan::Business, $company->currentPlan());
        $this->assertSame(4, $company->sites()->count());
        $this->assertSame(6, $company->products()->count());
        $this->assertEqualsCanonicalizing(['Santa Lucia Akwa', 'Mahima Bonapriso'], Site::whereIn('id', $supervisor->managedSiteIds())->pluck('name')->all());

        $reports = DailyReport::where('user_id', $hostess->id)->get();
        $this->assertGreaterThanOrEqual(10, $reports->count());
        $this->assertTrue($reports->every(fn (DailyReport $r) => $r->isSubmitted() && $r->report_date->isBefore(today())), 'aujourd’hui reste libre');
        $this->assertSame(3, DailyReportLine::whereIn('daily_report_id', $reports->pluck('id'))->whereNotNull('external_shop')->count());

        // Le stock est cohérent : la clôture d'une journée est l'ouverture de la suivante
        $soap = $company->products()->where('name', 'Savon Lux 90 g')->value('id');
        $lines = DailyReportLine::query()
            ->join('daily_reports as r', 'r.id', '=', 'daily_report_lines.daily_report_id')
            ->join('site_products as sp', 'sp.id', '=', 'daily_report_lines.site_product_id')
            ->where('r.user_id', $hostess->id)->where('sp.product_id', $soap)
            ->orderBy('r.report_date')
            ->get(['daily_report_lines.opening_stock', 'daily_report_lines.closing_stock']);
        foreach ($lines->slice(1)->values() as $i => $line) {
            $this->assertSame($lines[$i]->closing_stock, $line->opening_stock);
        }

        // Le comptable voit les chiffres du site, sans pouvoir le modifier
        $akwa = $company->sites()->where('name', 'Santa Lucia Akwa')->firstOrFail();
        $accountant = User::where('email', 'comptable@demo.test')->firstOrFail();
        $this->withoutVite()->actingAs($accountant)->get(route('sites.show', $akwa))->assertOk()->assertInertia(fn ($page) => $page
            ->where('auth.can.manageTeam', false)
            ->has('performance.best_products', 5)
            ->where('performance.best_hostesses.0.name', $hostess->name));
    }
}
