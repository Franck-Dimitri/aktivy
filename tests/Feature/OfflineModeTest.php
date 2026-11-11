<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Enums\VisitStatus;
use App\Models\Affectation;
use App\Models\DailyReport;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Mode hors ligne de l'hôtesse : les actions faites sans réseau arrivent plus tard, en arrière-plan,
 * avec l'heure du téléphone. Chacune peut arriver deux fois (réponse perdue) sans rien créer de plus.
 */
class OfflineModeTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $agent;

    private Site $site;

    private SiteProduct $stock;

    private Affectation $affectation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->manager = User::factory()->create();
        $this->agent = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $this->site = $this->manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);
        $product = $this->manager->company->products()->create(['name' => 'Savon', 'unit' => 'pièce', 'price' => 500]);
        $this->stock = SiteProduct::create(['company_id' => $this->manager->company_id, 'site_id' => $this->site->id, 'product_id' => $product->id, 'current_stock' => 10]);
        $this->affectation = $this->manager->company->affectations()->create([
            'site_id' => $this->site->id, 'user_id' => $this->agent->id, 'assigned_by' => $this->manager->id,
            'starts_on' => now()->subDays(5)->toDateString(), 'status' => AffectationStatus::Active,
        ]);
    }

    /** Envoi en arrière-plan, comme resources/js/lib/sync.ts. */
    private function sync(string $method, string $url, array $data = [])
    {
        return $this->actingAs($this->agent)
            ->withHeaders(['X-Motriks-Sync' => '1', 'Accept' => 'application/json'])
            ->json($method, $url, $data);
    }

    private function checkin(string $uuid, string $at): \Illuminate\Testing\TestResponse
    {
        return $this->sync('POST', route('terrain.visit.store'), [
            'affectation_id' => $this->affectation->id, 'latitude' => null, 'longitude' => null,
            'uuid' => $uuid, 'checked_in_at' => $at,
        ]);
    }

    public function test_the_home_page_carries_the_kit_to_work_without_network()
    {
        $this->actingAs($this->agent)->get(route('terrain.home'))
            ->assertInertia(fn ($page) => $page
                ->where('offline_kit.affectation_id', $this->affectation->id)
                ->where('offline_kit.report.lines.0.id', -$this->stock->id)
                ->where('offline_kit.report.lines.0.site_product_id', $this->stock->id)
                ->where('offline_kit.report.lines.0.opening_stock', 10));
    }

    public function test_an_offline_checkin_keeps_the_phone_time_and_its_identifier_and_is_received_once()
    {
        $uuid = (string) Str::uuid();
        $at = now()->subHours(3)->startOfMinute();

        $this->checkin($uuid, $at->toIso8601String())->assertOk()->assertJson(['ok' => true, 'visit' => $uuid]);
        // Réponse perdue : le téléphone renvoie la même prise de service
        $this->checkin($uuid, $at->toIso8601String())->assertOk()->assertJson(['ok' => true, 'visit' => $uuid]);

        $visit = Visit::sole();
        $this->assertSame($uuid, $visit->uuid);
        $this->assertTrue($visit->checked_in_at->equalTo($at));
        $this->assertNotNull($visit->checkin_synced_at);
        $this->assertSame(1, DailyReport::count());
        // Aucun message « flash » ne reste pour l'écran suivant de l'hôtesse
        $this->assertFalse(session()->has('success'));
    }

    public function test_a_phone_clock_in_the_future_or_a_too_old_action_is_refused()
    {
        $this->checkin((string) Str::uuid(), now()->addHour()->toIso8601String())->assertStatus(422)->assertJsonValidationErrors('checked_in_at');
        $this->checkin((string) Str::uuid(), now()->subHours(49)->toIso8601String())->assertStatus(422)->assertJsonValidationErrors('checked_in_at');

        $this->assertSame(0, Visit::count());
    }

    public function test_the_report_typed_offline_finds_its_lines_by_product_and_keeps_the_phone_time()
    {
        $uuid = (string) Str::uuid();
        $this->checkin($uuid, now()->subHours(4)->toIso8601String());
        $submittedAt = now()->subHour()->startOfMinute();

        $payload = [
            'notes' => 'Bonne journée',
            // Numéro provisoire de la trousse hors ligne, et le produit du point de vente
            'lines' => [['id' => -$this->stock->id, 'site_product_id' => $this->stock->id, 'units_sold' => 4, 'notes' => null, 'counted_stock' => null]],
            'packs' => [],
            'queued' => true,
            'submitted_at' => $submittedAt->toIso8601String(),
        ];

        $this->sync('POST', route('terrain.report.submit', $uuid), $payload)->assertOk()->assertJson(['ok' => true]);
        $this->sync('POST', route('terrain.report.submit', $uuid), $payload)->assertOk();

        $report = DailyReport::sole();
        $this->assertSame('submitted', $report->status);
        $this->assertTrue($report->submitted_at->equalTo($submittedAt));
        $this->assertNotNull($report->submit_synced_at);
        $this->assertSame(4, $report->lines()->first()->units_sold);
        $this->assertSame(6, $this->stock->fresh()->current_stock);
    }

    public function test_an_offline_checkout_keeps_the_phone_time_and_can_arrive_twice()
    {
        $uuid = (string) Str::uuid();
        $in = now()->subHours(8)->startOfMinute();
        $this->checkin($uuid, $in->toIso8601String());
        $out = $in->copy()->addHours(7);

        $this->sync('PATCH', route('terrain.visit.checkout', $uuid), ['checked_out_at' => $out->toIso8601String()])->assertOk();
        $this->sync('PATCH', route('terrain.visit.checkout', $uuid), ['checked_out_at' => $out->toIso8601String()])->assertOk();

        $visit = Visit::sole();
        $this->assertSame(VisitStatus::Completed, $visit->status);
        $this->assertTrue($visit->checked_out_at->equalTo($out));
        $this->assertSame(420, $visit->duration_minutes);
        $this->assertNotNull($visit->checkout_synced_at);
    }

    public function test_a_checkout_before_the_checkin_is_refused()
    {
        $uuid = (string) Str::uuid();
        $this->checkin($uuid, now()->subHours(2)->toIso8601String());

        $this->sync('PATCH', route('terrain.visit.checkout', $uuid), ['checked_out_at' => now()->subHours(3)->toIso8601String()])
            ->assertStatus(422)
            ->assertJsonValidationErrors('checked_out_at');
    }

    public function test_an_unclosed_day_does_not_swallow_the_next_day_typed_offline()
    {
        $yesterday = $this->agent->company->visits()->create([
            'site_id' => $this->site->id, 'user_id' => $this->agent->id,
            'checked_in_at' => now()->subDay(), 'status' => 'in_progress',
        ]);
        $uuid = (string) Str::uuid();

        $this->checkin($uuid, now()->subMinutes(30)->toIso8601String())->assertOk()->assertJson(['visit' => $uuid]);

        $this->assertSame(VisitStatus::Incomplete, $yesterday->fresh()->status);
        $this->assertSame('in_progress', Visit::where('uuid', $uuid)->sole()->status->value);
    }

    public function test_a_second_checkin_the_same_day_joins_the_existing_visit()
    {
        $this->actingAs($this->agent)->post(route('terrain.visit.store'), ['affectation_id' => $this->affectation->id]);
        $existing = Visit::sole();

        // Le téléphone ne le savait pas (accueil gardé d'avant) : ses envois suivent la visite du jour
        $this->checkin((string) Str::uuid(), now()->subMinute()->toIso8601String())->assertOk()->assertJson(['visit' => $existing->uuid]);

        $this->assertSame(1, Visit::count());
    }

    public function test_a_sync_request_stopped_by_a_redirect_stays_on_the_phone()
    {
        // Prise de service en ligne déjà faite : la réponse normale est une redirection
        $this->actingAs($this->agent)->post(route('terrain.visit.store'), ['affectation_id' => $this->affectation->id]);

        // Sans heure du téléphone, ce n'est pas un envoi hors ligne reconnu : le téléphone garde l'action
        $this->sync('POST', route('terrain.visit.store'), ['affectation_id' => $this->affectation->id])
            ->assertStatus(428);
    }

    public function test_the_manager_sees_what_was_done_offline()
    {
        $uuid = (string) Str::uuid();
        $this->checkin($uuid, now()->subHours(2)->setTime(8, 2)->toIso8601String());
        $report = DailyReport::sole();

        $this->actingAs($this->manager)->get(route('daily-reports.show', $report))
            ->assertInertia(fn ($page) => $page
                ->where('report.offline_trace.0.label', 'Prise de service')
                ->where('report.offline_trace.0.at', '08:02'));
    }
}
