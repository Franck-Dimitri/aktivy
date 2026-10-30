<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\DailyReport;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Lot « confort terrain » : photos des rapports et documents PDF.
 */
class FieldComfortTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $agent;

    private Site $site;

    private DailyReport $report;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        Storage::fake('local');
        Storage::fake('public');

        $this->manager = User::factory()->create();
        $this->agent = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $this->site = $this->manager->company->sites()->create([
            'name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id,
        ]);
        $product = $this->manager->company->products()->create(['name' => 'Savon é', 'unit' => 'pièce', 'price' => 500]);
        SiteProduct::create([
            'company_id' => $this->manager->company_id,
            'site_id' => $this->site->id,
            'product_id' => $product->id,
            'current_stock' => 20,
        ]);
        $affectation = $this->manager->company->affectations()->create([
            'site_id' => $this->site->id,
            'user_id' => $this->agent->id,
            'assigned_by' => $this->manager->id,
            'starts_on' => now()->toDateString(),
            'status' => AffectationStatus::Active,
        ]);
        $this->actingAs($this->agent)->post(route('terrain.visit.store'), ['affectation_id' => $affectation->id])
            ->assertSessionHasNoErrors();
        $this->report = DailyReport::where('user_id', $this->agent->id)->with('lines')->firstOrFail();
    }

    private function addPhoto(): void
    {
        $this->actingAs($this->agent)->post(route('terrain.report.photos.store', $this->report->visit_id), [
            'photo' => UploadedFile::fake()->image('rayon.jpg', 800, 600),
            'caption' => 'Rayon',
        ])->assertSessionHasNoErrors();
    }

    private function submit(): void
    {
        $this->actingAs($this->agent)->post(route('terrain.report.submit', $this->report->visit_id), [
            'lines' => [['id' => $this->report->lines->first()->id, 'units_sold' => 2]],
        ])->assertSessionHasNoErrors();
    }

    public function test_a_photo_is_private_to_the_hostess_and_the_managers_of_the_site()
    {
        $this->addPhoto();
        $photo = $this->report->photos()->firstOrFail();
        Storage::disk('local')->assertExists($photo->path);

        $this->actingAs($this->agent)->get(route('report-photos.show', $photo))->assertOk();
        $this->actingAs($this->manager)->get(route('report-photos.show', $photo))->assertOk();
        $this->actingAs(User::factory()->create())->get(route('report-photos.show', $photo))->assertForbidden();
        $this->actingAs(User::factory()->supervisor()->create(['company_id' => $this->manager->company_id]))
            ->get(route('report-photos.show', $photo))->assertForbidden();
        $this->actingAs(User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]))
            ->get(route('report-photos.show', $photo))->assertForbidden();
    }

    public function test_photos_are_limited_and_can_only_be_removed_before_submission()
    {
        for ($i = 0; $i < 6; $i++) {
            $this->addPhoto();
        }
        $this->actingAs($this->agent)->post(route('terrain.report.photos.store', $this->report->visit_id), [
            'photo' => UploadedFile::fake()->image('trop.jpg'),
        ])->assertSessionHasErrors('photo');

        $photo = $this->report->photos()->firstOrFail();
        $path = $photo->path;
        $this->actingAs($this->agent)->delete(route('terrain.report.photos.destroy', [$this->report->visit_id, $photo]))
            ->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($path);

        $this->submit();
        $this->actingAs($this->agent)
            ->delete(route('terrain.report.photos.destroy', [$this->report->visit_id, $this->report->photos()->firstOrFail()]))
            ->assertStatus(422);
    }

    public function test_a_hostess_can_not_add_a_photo_to_the_report_of_a_colleague()
    {
        $colleague = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);

        $this->actingAs($colleague)->post(route('terrain.report.photos.store', $this->report->visit_id), [
            'photo' => UploadedFile::fake()->image('x.jpg'),
        ])->assertForbidden();
    }

    public function test_the_daily_report_pdf_is_generated_with_its_photos()
    {
        $this->addPhoto();
        $this->submit();

        $response = $this->actingAs($this->manager)->get(route('daily-reports.pdf', $this->report))->assertOk();

        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_the_sales_summary_pdf_is_generated_and_limited_to_the_company()
    {
        $this->submit();

        $response = $this->actingAs($this->manager)->get(route('reports.pdf'))->assertOk();
        $this->assertStringStartsWith('%PDF', $response->getContent());

        $this->actingAs($this->agent)->get(route('reports.pdf'))->assertForbidden();
        $this->actingAs(User::factory()->create())->get(route('daily-reports.pdf', $this->report))->assertForbidden();
    }
}
