<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\DailyReport;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteStockTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Un site avec 10 savons en stock et une hôtesse affectée aujourd'hui.
     *
     * @return array{User, User, Site, SiteProduct}
     */
    private function siteWithAgent(): array
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $site = $manager->company->sites()->create([
            'name' => 'Santa Lucia',
            'type' => 'autre',
            'city' => 'Douala',
            'created_by' => $manager->id,
        ]);
        $product = $manager->company->products()->create(['name' => 'Savon', 'unit' => 'pièce', 'price' => 500]);
        $stock = SiteProduct::create([
            'company_id' => $manager->company_id,
            'site_id' => $site->id,
            'product_id' => $product->id,
            'current_stock' => 10,
        ]);
        $manager->company->affectations()->create([
            'site_id' => $site->id,
            'user_id' => $agent->id,
            'assigned_by' => $manager->id,
            'starts_on' => now()->toDateString(),
            'status' => AffectationStatus::Active,
        ]);

        return [$manager, $agent, $site, $stock];
    }

    private function checkIn(User $agent): DailyReport
    {
        $this->actingAs($agent)->post(route('terrain.visit.store'), [
            'affectation_id' => $agent->affectations()->value('id'),
        ])->assertSessionHasNoErrors();

        return DailyReport::where('user_id', $agent->id)->with('lines')->firstOrFail();
    }

    public function test_sales_are_taken_off_the_current_stock_so_a_restock_during_the_day_is_kept()
    {
        [$manager, $agent, $site, $stock] = $this->siteWithAgent();
        $report = $this->checkIn($agent);

        // Réassort de 20 unités pendant la journée
        $this->actingAs($manager)->put(route('sites.inventory.update', [$site, $stock]), [
            'current_stock' => 30,
            'alert_threshold' => 10,
            'critical_threshold' => 5,
        ])->assertSessionHasNoErrors();

        $this->actingAs($agent)->post(route('terrain.report.submit', $report->visit_id), [
            'lines' => [['id' => $report->lines->first()->id, 'units_sold' => 3]],
        ])->assertSessionHasNoErrors();

        $this->assertSame(27, $stock->fresh()->current_stock);
    }

    public function test_a_product_with_sales_history_can_not_be_removed_from_the_site()
    {
        [$manager, $agent, $site, $stock] = $this->siteWithAgent();
        $this->checkIn($agent);

        $this->actingAs($manager)
            ->delete(route('sites.inventory.destroy', [$site, $stock]))
            ->assertSessionHasErrors('inventory');

        $this->assertModelExists($stock);
    }
}
