<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\DailyReport;
use App\Models\SiteProduct;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

/**
 * Contrôles bloquants de la saisie, clôture avec motif d'écart, sauvegarde chiffrée.
 */
class ClosingAndBackupTest extends TestCase
{
    use RefreshDatabase;

    private function report(): array
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $site = $manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $manager->id]);
        $product = $manager->company->products()->create(['name' => 'Savon', 'unit' => 'pièce', 'price' => 500]);
        $stock = SiteProduct::create(['company_id' => $manager->company_id, 'site_id' => $site->id, 'product_id' => $product->id, 'current_stock' => 10]);
        $affectation = $manager->company->affectations()->create([
            'site_id' => $site->id, 'user_id' => $agent->id, 'assigned_by' => $manager->id,
            'starts_on' => now()->toDateString(), 'status' => AffectationStatus::Active,
        ]);
        $this->actingAs($agent)->post(route('terrain.visit.store'), ['affectation_id' => $affectation->id]);

        return [$manager, $agent, $site, $stock, DailyReport::where('user_id', $agent->id)->with('lines')->firstOrFail()];
    }

    public function test_selling_more_than_the_stock_is_refused_by_the_server()
    {
        [, $agent, , $stock, $report] = $this->report();

        $this->actingAs($agent)->post(route('terrain.report.submit', $report->visit_id), [
            'lines' => [['id' => $report->lines->first()->id, 'units_sold' => 11]],
        ])->assertSessionHasErrors('lines');

        $this->assertSame('draft', $report->fresh()->status);
        $this->assertSame(10, $stock->fresh()->current_stock);
    }

    public function test_a_restock_during_the_day_can_be_sold()
    {
        [$manager, $agent, $site, $stock, $report] = $this->report();

        $this->actingAs($manager)->post(route('sites.inventory.restock', [$site, $stock]), ['quantity' => 5]);

        $this->actingAs($agent)->post(route('terrain.report.submit', $report->visit_id), [
            'lines' => [['id' => $report->lines->first()->id, 'units_sold' => 14]],
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, $stock->fresh()->current_stock);
        $this->assertSame(1, $report->lines()->first()->closing_stock);
    }

    public function test_a_stock_gap_requires_a_reason()
    {
        [, $agent, , $stock, $report] = $this->report();

        $this->actingAs($agent)->post(route('terrain.report.submit', $report->visit_id), [
            'lines' => [['id' => $report->lines->first()->id, 'units_sold' => 3, 'counted_stock' => 5]],
        ])->assertSessionHasErrors('lines');

        $this->assertSame('draft', $report->fresh()->status);
        $this->assertSame(10, $stock->fresh()->current_stock);
    }

    public function test_a_justified_gap_updates_the_stock_and_stays_when_the_manager_corrects_sales()
    {
        [$manager, $agent, , $stock, $report] = $this->report();
        $lineId = $report->lines->first()->id;

        $this->actingAs($agent)->post(route('terrain.report.submit', $report->visit_id), [
            'lines' => [['id' => $lineId, 'units_sold' => 3, 'counted_stock' => 5, 'gap_reason' => 'Deux flacons cassés']],
        ])->assertSessionHasNoErrors();

        $line = $report->lines()->first();
        $this->assertSame(-2, $line->stock_gap);
        $this->assertSame('Deux flacons cassés', $line->gap_reason);
        $this->assertSame(5, $line->closing_stock);
        $this->assertSame(5, $stock->fresh()->current_stock);
        $this->assertTrue(StockMovement::where('type', StockMovement::CLOSING_GAP)->where('quantity', -2)->exists());

        // Correction : 3 ventes deviennent 2 ; l'écart constaté reste, une unité revient au stock
        $this->actingAs($manager)->put(route('daily-reports.update', $report), [
            'lines' => [['id' => $lineId, 'units_sold' => 2]],
        ])->assertSessionHasNoErrors();

        $this->assertSame(6, $report->lines()->first()->closing_stock);
        $this->assertSame(6, $stock->fresh()->current_stock);
    }

    public function test_a_report_resent_after_a_network_cut_is_not_refused()
    {
        [, $agent, , $stock, $report] = $this->report();
        $payload = ['lines' => [['id' => $report->lines->first()->id, 'units_sold' => 2]], 'queued' => true];

        $this->actingAs($agent)->post(route('terrain.report.submit', $report->visit_id), $payload)->assertRedirect(route('terrain.home'));
        $this->actingAs($agent)->post(route('terrain.report.submit', $report->visit_id), $payload)->assertRedirect(route('terrain.home'));

        // Le renvoi ne décompte pas le stock une seconde fois
        $this->assertSame(8, $stock->fresh()->current_stock);
    }

    private function fakeDump(): void
    {
        Process::fake(function ($process) {
            $command = $process->command;
            $target = $command[0] === 'pg_dump' ? end($command) : $command[array_search('-out', $command) + 1];
            file_put_contents($target, 'contenu');

            return Process::result();
        });
    }

    protected function tearDown(): void
    {
        File::delete(File::glob(storage_path('backups/motriks_*')));

        parent::tearDown();
    }

    public function test_the_backup_is_encrypted_and_sent_to_telegram()
    {
        Http::fake(['*' => Http::response(['ok' => true])]);
        $this->fakeDump();
        config(['services.backup.passphrase' => 'secret', 'services.telegram.chat_id' => '42', 'services.telegram.bot_token' => 't']);

        $this->artisan('db:backup')->assertSuccessful();

        Http::assertSent(fn ($request) => str_contains($request->url(), 'sendDocument'));
        $this->assertCount(1, File::glob(storage_path('backups/*.sql.gz.enc')));
        $this->assertCount(0, File::glob(storage_path('backups/*.sql.gz')));
    }

    public function test_a_backup_is_never_sent_unencrypted()
    {
        Http::fake(['*' => Http::response(['ok' => true])]);
        $this->fakeDump();
        config(['services.backup.passphrase' => null, 'services.telegram.chat_id' => '42', 'services.telegram.bot_token' => 't']);

        $this->artisan('db:backup')->assertFailed();

        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'sendDocument'));
    }

    public function test_a_refused_telegram_upload_is_reported_as_a_failure()
    {
        Http::fake(['*' => Http::response(['ok' => false], 403)]);
        $this->fakeDump();
        config(['services.backup.passphrase' => 'secret', 'services.telegram.chat_id' => '42', 'services.telegram.bot_token' => 't']);

        $this->artisan('db:backup')->assertFailed();
    }
}
