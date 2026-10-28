<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\Affectation;
use App\Models\AuditLog;
use App\Models\DailyReport;
use App\Models\Event;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\Reports\SalesReport;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Lot « chiffres fiables » : journal du stock, packs d'événement dans les rapports,
 * correction et validation par le responsable, contrôle du pointage.
 */
class StockAndReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $agent;

    private Site $site;

    private SiteProduct $soap;

    private SiteProduct $cream;

    private Affectation $affectation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();

        $this->manager = User::factory()->create();
        $this->agent = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $this->site = $this->manager->company->sites()->create([
            'name' => 'Santa Lucia',
            'type' => 'autre',
            'city' => 'Douala',
            'latitude' => 4.0511,
            'longitude' => 9.7679,
            'created_by' => $this->manager->id,
        ]);
        $this->soap = $this->stock('Savon', 500, 50);
        $this->cream = $this->stock('Crème', 1000, 20);
        $this->affectation = $this->manager->company->affectations()->create([
            'site_id' => $this->site->id,
            'user_id' => $this->agent->id,
            'assigned_by' => $this->manager->id,
            'starts_on' => now()->toDateString(),
            'status' => AffectationStatus::Active,
        ]);
    }

    private function stock(string $name, int $price, int $quantity): SiteProduct
    {
        $product = $this->manager->company->products()->create(['name' => $name, 'unit' => 'pièce', 'price' => $price]);

        $this->actingAs($this->manager)->post(route('sites.inventory.store', $this->site), [
            'product_id' => $product->id,
            'current_stock' => $quantity,
            'alert_threshold' => 5,
            'critical_threshold' => 2,
        ])->assertSessionHasNoErrors();

        return SiteProduct::where('product_id', $product->id)->firstOrFail();
    }

    private function checkIn(array $position = []): DailyReport
    {
        $this->actingAs($this->agent)->post(route('terrain.visit.store'), [
            'affectation_id' => $this->affectation->id,
            ...$position,
        ])->assertSessionHasNoErrors();

        return DailyReport::where('user_id', $this->agent->id)->with('lines')->firstOrFail();
    }

    private function lineOf(DailyReport $report, SiteProduct $stock): int
    {
        return $report->lines->firstWhere('site_product_id', $stock->id)->id;
    }

    private function submit(DailyReport $report, int $soaps, int $creams, array $packs = []): void
    {
        $this->actingAs($this->agent)->post(route('terrain.report.submit', $report->visit_id), [
            'lines' => [
                ['id' => $this->lineOf($report, $this->soap), 'units_sold' => $soaps],
                ['id' => $this->lineOf($report, $this->cream), 'units_sold' => $creams],
            ],
            'packs' => $packs,
        ])->assertSessionHasNoErrors();
    }

    public function test_every_stock_change_is_written_to_the_journal()
    {
        $this->actingAs($this->manager)
            ->post(route('sites.inventory.restock', [$this->site, $this->soap]), ['quantity' => 30, 'notes' => 'BL 1245'])
            ->assertSessionHasNoErrors();
        $this->actingAs($this->manager)->put(route('sites.inventory.update', [$this->site, $this->soap]), [
            'current_stock' => 75,
            'alert_threshold' => 5,
            'critical_threshold' => 2,
            'notes' => 'Casse',
        ])->assertSessionHasNoErrors();

        $this->submit($this->checkIn(), soaps: 5, creams: 0);

        $this->assertSame(70, $this->soap->fresh()->current_stock);
        $this->assertSame(
            [
                [StockMovement::INITIAL, 50, 50],
                [StockMovement::RESTOCK, 30, 80],
                [StockMovement::ADJUSTMENT, -5, 75],
                [StockMovement::SALE, -5, 70],
            ],
            StockMovement::where('site_product_id', $this->soap->id)->orderBy('id')->get()
                ->map(fn ($m) => [$m->type, $m->quantity, $m->stock_after])->all(),
        );

        $this->actingAs($this->manager)->get(route('sites.show', $this->site))
            ->assertInertia(fn ($page) => $page->has('stock_movements', 5));
    }

    public function test_packs_sold_during_an_event_count_in_stock_sales_and_the_event()
    {
        $event = $this->manager->company->events()->create([
            'name' => 'Lancement crème',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'status' => 'active',
            'created_by' => $this->manager->id,
        ]);
        // Lot : 2 savons + 1 crème pour 1 500 (au lieu de 2 000)
        $pack = $event->packs()->create(['name' => 'Duo beauté', 'type' => 'grouped_discount', 'price' => 1500]);
        $pack->lines()->create(['product_id' => $this->soap->product_id, 'quantity' => 2, 'role' => 'paid']);
        $pack->lines()->create(['product_id' => $this->cream->product_id, 'quantity' => 1, 'role' => 'paid']);
        $this->affectation->forceFill(['event_id' => $event->id])->save();

        $report = $this->checkIn();
        $this->assertSame($event->id, $report->event_id);

        $this->actingAs($this->agent)->get(route('terrain.report.show', $report->visit_id))
            ->assertInertia(fn ($page) => $page->where('report.packs.0.value', 1500));

        // 3 savons à l'unité, 1 crème à l'unité, 2 packs
        $this->submit($report, soaps: 3, creams: 1, packs: [['id' => $pack->id, 'quantity' => 2]]);

        $lines = $report->fresh()->lines->keyBy('site_product_id');
        $this->assertSame(7, $lines[$this->soap->id]->units_sold);
        $this->assertSame(3, $lines[$this->cream->id]->units_sold);
        $this->assertEqualsWithDelta(3 * 500 + 1 * 1000 + 2 * 1500, $lines->sum('revenue'), 0.01);
        $this->assertSame(43, $this->soap->fresh()->current_stock);
        $this->assertSame(17, $this->cream->fresh()->current_stock);

        $today = CarbonImmutable::now();
        $sales = new SalesReport($this->manager->company, $today->startOfDay(), $today->endOfDay(), eventId: $event->id);
        $this->assertEqualsWithDelta(5500, $sales->totals()['revenue'], 0.01);
    }

    public function test_a_manager_corrects_a_report_then_validates_it()
    {
        $report = $this->checkIn();
        $this->submit($report, soaps: 40, creams: 0);
        $this->assertSame(10, $this->soap->fresh()->current_stock);

        // L'hôtesse voulait dire 4
        $this->actingAs($this->manager)->put(route('daily-reports.update', $report), [
            'lines' => [
                ['id' => $this->lineOf($report, $this->soap), 'units_sold' => 4],
                ['id' => $this->lineOf($report, $this->cream), 'units_sold' => 0],
            ],
        ])->assertSessionHasNoErrors();

        $report->refresh();
        $this->assertSame(46, $this->soap->fresh()->current_stock);
        $this->assertEqualsWithDelta(2000, $report->totalRevenue(), 0.01);
        $this->assertNotNull($report->corrected_at);
        $this->assertTrue(StockMovement::where('type', StockMovement::CORRECTION)->where('quantity', 36)->exists());
        $this->assertTrue(AuditLog::where('action', 'daily_report.corrected')->exists());

        $this->actingAs($this->manager)->post(route('daily-reports.validate', $report))->assertSessionHasNoErrors();
        $this->assertTrue($report->fresh()->isValidated());

        // Validé : plus de correction possible
        $this->actingAs($this->manager)->put(route('daily-reports.update', $report), [
            'lines' => [['id' => $this->lineOf($report, $this->soap), 'units_sold' => 1]],
        ])->assertStatus(422);
    }

    public function test_only_managers_and_supervisors_can_correct_a_report()
    {
        $report = $this->checkIn();
        $this->submit($report, soaps: 2, creams: 0);
        $accountant = User::factory()->accountant()->create(['company_id' => $this->manager->company_id]);
        $payload = ['lines' => [['id' => $this->lineOf($report, $this->soap), 'units_sold' => 9]]];

        $this->actingAs($accountant)->put(route('daily-reports.update', $report), $payload)->assertForbidden();
        $this->actingAs($this->agent)->put(route('daily-reports.update', $report), $payload)->assertForbidden();
        $this->actingAs($this->manager)->get(route('daily-reports.show', $report))
            ->assertInertia(fn ($page) => $page->where('can_correct', true));
        $this->actingAs($accountant)->get(route('daily-reports.show', $report))
            ->assertInertia(fn ($page) => $page->where('can_correct', false));
    }

    public function test_a_draft_report_can_not_be_corrected_by_the_manager()
    {
        $report = $this->checkIn();

        $this->actingAs($this->manager)->put(route('daily-reports.update', $report), [
            'lines' => [['id' => $this->lineOf($report, $this->soap), 'units_sold' => 1]],
        ])->assertStatus(422);
    }

    public function test_a_check_in_far_from_the_site_is_flagged()
    {
        // Yaoundé, à environ 200 km du site de Douala
        $report = $this->checkIn(['latitude' => 3.8480, 'longitude' => 11.5021]);

        $this->assertGreaterThan(150000, $report->visit->checkin_distance_m);
        $this->actingAs($this->manager)->get(route('daily-reports.index'))
            ->assertInertia(fn ($page) => $page->where('reports.0.off_site', true));
    }

    public function test_a_check_in_on_the_site_is_not_flagged()
    {
        $report = $this->checkIn(['latitude' => 4.0512, 'longitude' => 9.7680]);

        $this->assertLessThan(50, $report->visit->checkin_distance_m);
        $this->assertFalse($report->visit->isOffSite());
    }
}
