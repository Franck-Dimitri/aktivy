<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Enums\Plan;
use App\Models\Affectation;
use App\Models\DailyReport;
use App\Models\Product;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use App\Support\Reports\SalesReport;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Ventes en boutique extérieure, stock et PDF côté hôtesse.
 */
class ExternalSalesTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $agent;

    private Site $site;

    private SiteProduct $soap;

    private Affectation $affectation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();

        $this->manager = User::factory()->create();
        $this->agent = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $this->site = $this->manager->company->sites()->create(['name' => 'Santa Lucia', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);

        $product = $this->manager->company->products()->create(['name' => 'Savon', 'unit' => 'pièce', 'price' => 500]);
        $this->actingAs($this->manager)->post(route('sites.inventory.store', $this->site), [
            'product_id' => $product->id, 'current_stock' => 40, 'alert_threshold' => 10, 'critical_threshold' => 3,
        ])->assertSessionHasNoErrors();
        $this->soap = SiteProduct::where('product_id', $product->id)->firstOrFail();

        $this->affectation = $this->manager->company->affectations()->create([
            'site_id' => $this->site->id, 'user_id' => $this->agent->id, 'assigned_by' => $this->manager->id,
            'starts_on' => now()->toDateString(), 'status' => AffectationStatus::Active,
        ]);
    }

    private function checkIn(): DailyReport
    {
        $this->actingAs($this->agent)->post(route('terrain.visit.store'), ['affectation_id' => $this->affectation->id])->assertSessionHasNoErrors();

        return DailyReport::where('user_id', $this->agent->id)->firstOrFail();
    }

    private function line(DailyReport $report): int
    {
        return $report->lines()->firstOrFail()->id;
    }

    public function test_external_sales_count_in_the_day_but_leave_the_point_of_sale_stock_alone()
    {
        $report = $this->checkIn();

        $this->actingAs($this->agent)->post(route('terrain.report.submit', $report->visit), [
            'lines' => [['id' => $this->line($report), 'units_sold' => 4]],
            'external_sales' => [
                ['shop' => '  Boutique  Chez Mama ', 'product_id' => $this->soap->product_id, 'units' => 6],
                ['shop' => 'boutique chez mama', 'product_id' => $this->soap->product_id, 'units' => 2],
                ['shop' => 'Quincaillerie Akwa', 'product_id' => $this->soap->product_id, 'units' => 1],
            ],
        ])->assertSessionHasNoErrors();

        $report->refresh();

        // Le stock du point de vente ne perd que les 4 unités vendues sur place
        $this->assertSame(36, $this->soap->fresh()->current_stock);

        // Même boutique saisie deux fois : additionnée ; le nom est nettoyé
        $external = $report->externalLines()->orderBy('external_shop')->get();
        $this->assertSame(['Boutique Chez Mama', 'Quincaillerie Akwa'], $external->pluck('external_shop')->all());
        $this->assertSame([8, 1], $external->pluck('units_sold')->all());

        // Chiffre d'affaires : 4 + 8 + 1 savons à 500
        $this->assertSame(6500.0, $report->totalRevenue());
        $this->assertSame(1, $report->lines()->count(), 'les ventes extérieures ne sont pas des lignes du stock');

        $sales = new SalesReport($this->manager->company, CarbonImmutable::today(), CarbonImmutable::today()->endOfDay());
        $this->assertSame(6500.0, $sales->totals()['revenue']);
        $this->assertSame(4500.0, $sales->totals()['external_revenue']);

        // Le responsable voit les ventes à part
        $this->actingAs($this->manager)->get(route('daily-reports.show', $report))->assertInertia(fn ($page) => $page
            ->where('report.total_revenue', 6500)
            ->has('report.external_sales', 2)
            ->where('report.external_sales.0.shop', 'Boutique Chez Mama')
            ->where('report.external_sales.0.revenue', 4000));
        $this->actingAs($this->manager)->get(route('daily-reports.index'))->assertInertia(fn ($page) => $page
            ->where('reports.0.revenue', 6500)
            ->where('reports.0.external_revenue', 4500));
    }

    public function test_only_the_products_of_her_point_of_sale_can_be_sold_outside()
    {
        $report = $this->checkIn();
        $other = $this->manager->company->products()->create(['name' => 'Lait', 'unit' => 'boîte', 'price' => 800]);

        $this->actingAs($this->agent)->put(route('terrain.report.update', $report->visit), [
            'lines' => [['id' => $this->line($report), 'units_sold' => 0]],
            'external_sales' => [['shop' => 'Chez Mama', 'product_id' => $other->id, 'units' => 2]],
        ])->assertSessionHasErrors('external_sales');

        $this->actingAs($this->agent)->put(route('terrain.report.update', $report->visit), [
            'lines' => [['id' => $this->line($report), 'units_sold' => 0]],
            'external_sales' => [['shop' => '   ', 'product_id' => $this->soap->product_id, 'units' => 2]],
        ])->assertSessionHasErrors('external_sales.0.shop');

        $this->assertSame(0, $report->externalLines()->count());
    }

    public function test_the_draft_replaces_external_sales_and_an_old_app_leaves_them_untouched()
    {
        $report = $this->checkIn();
        $lines = [['id' => $this->line($report), 'units_sold' => 0]];

        $this->actingAs($this->agent)->put(route('terrain.report.update', $report->visit), [
            'lines' => $lines,
            'external_sales' => [['shop' => 'Chez Mama', 'product_id' => $this->soap->product_id, 'units' => 3]],
        ])->assertSessionHasNoErrors();
        $this->assertSame(3, (int) $report->externalLines()->sum('units_sold'));

        // Sans le champ (application pas encore mise à jour) : rien n'est effacé
        $this->actingAs($this->agent)->put(route('terrain.report.update', $report->visit), ['lines' => $lines])->assertSessionHasNoErrors();
        $this->assertSame(3, (int) $report->externalLines()->sum('units_sold'));

        // Liste vide : tout est retiré
        $this->actingAs($this->agent)->put(route('terrain.report.update', $report->visit), ['lines' => $lines, 'external_sales' => []])->assertSessionHasNoErrors();
        $this->assertSame(0, $report->externalLines()->count());

        $this->actingAs($this->agent)->get(route('terrain.report.show', $report->visit))->assertInertia(fn ($page) => $page
            ->where('report.external_products.0.id', $this->soap->product_id)
            ->where('report.external_products.0.unit_price', 500));
    }

    public function test_the_hostess_sees_her_stock_and_her_external_shops()
    {
        $report = $this->checkIn();
        $this->actingAs($this->agent)->post(route('terrain.report.submit', $report->visit), [
            'lines' => [['id' => $this->line($report), 'units_sold' => 35]],
            'external_sales' => [['shop' => 'Chez Mama', 'product_id' => $this->soap->product_id, 'units' => 2]],
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->agent)->get(route('terrain.stock'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('terrain/stock')
            ->where('sites.0.name', 'Santa Lucia')
            ->where('sites.0.products.0.stock', 5)
            ->where('sites.0.products.0.status', 'warning'));

        $this->actingAs($this->agent)->get(route('terrain.external-shops'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('terrain/boutiques')
            ->where('summary.month_revenue', 1000)
            ->where('shops.0.shop', 'Chez Mama')
            ->has('days', 1));
    }

    public function test_the_hostess_downloads_the_pdf_of_her_own_reports_only_from_pro()
    {
        $report = $this->checkIn();
        $this->actingAs($this->agent)->post(route('terrain.report.submit', $report->visit), [
            'lines' => [['id' => $this->line($report), 'units_sold' => 2]],
            'external_sales' => [['shop' => 'Chez Mama', 'product_id' => $this->soap->product_id, 'units' => 2]],
        ])->assertSessionHasNoErrors();

        $this->manager->company->setPlan(Plan::Pro, today()->addMonth());
        $this->actingAs($this->agent->fresh())->get(route('terrain.reports.index'))->assertInertia(fn ($page) => $page->where('pdf.available', true));
        $response = $this->actingAs($this->agent->fresh())->get(route('terrain.reports.pdf', $report));
        $response->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $response->headers->get('Content-Type'));

        // Le rapport d'une collègue : introuvable
        $colleague = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $this->actingAs($colleague)->get(route('terrain.reports.pdf', $report))->assertNotFound();

        // Starter : la page indique le forfait nécessaire
        $this->manager->company->setPlan(Plan::Starter);
        $this->actingAs($this->agent->fresh())->get(route('terrain.reports.index'))->assertInertia(fn ($page) => $page
            ->where('pdf.available', false)
            ->where('pdf.plan', 'Motriks Pro'));
        $this->actingAs($this->agent->fresh())->get(route('terrain.reports.pdf', $report))->assertInertia(fn ($page) => $page->component('module-locked'));
    }
}
