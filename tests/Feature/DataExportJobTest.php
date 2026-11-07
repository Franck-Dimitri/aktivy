<?php

namespace Tests\Feature;

use App\Jobs\BuildCompanyDataExport;
use App\Models\DataExport;
use App\Models\User;
use App\Notifications\DataExportNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * L'export complet est préparé en arrière-plan, puis téléchargeable pendant 24 h.
 */
class DataExportJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake(DataExport::DISK);
    }

    public function test_preparing_queues_the_export_instead_of_building_it_in_the_request()
    {
        Queue::fake();
        $manager = User::factory()->create();

        $this->actingAs($manager)->post(route('company.data-export.prepare'))->assertSessionHasNoErrors();

        Queue::assertPushed(BuildCompanyDataExport::class);
        $this->assertSame(DataExport::PENDING, DataExport::firstOrFail()->status);

        // Un second clic pendant la préparation ne relance pas tout
        $this->actingAs($manager)->post(route('company.data-export.prepare'))->assertSessionHas('info');
        Queue::assertPushed(BuildCompanyDataExport::class, 1);
    }

    public function test_the_manager_is_notified_and_downloads_the_file()
    {
        Notification::fake();
        $manager = User::factory()->create();

        $this->actingAs($manager)->post(route('company.data-export.prepare'));

        $export = DataExport::firstOrFail();
        $this->assertSame(DataExport::READY, $export->status);
        Storage::disk(DataExport::DISK)->assertExists($export->path);
        Notification::assertSentTo($manager, DataExportNotification::class, fn ($n) => $n->type === 'data_export_ready');

        $this->actingAs($manager)->get(route('company.data-export'))
            ->assertInertia(fn (Assert $page) => $page->where('export.status', 'ready')->where('export.id', $export->id));

        $this->actingAs($manager)->get(route('company.data-export.download', $export))->assertOk()->assertDownload();
    }

    public function test_another_company_cannot_download_the_file()
    {
        $manager = User::factory()->create();
        $this->actingAs($manager)->post(route('company.data-export.prepare'));
        $export = DataExport::firstOrFail();

        $this->actingAs(User::factory()->create())->get(route('company.data-export.download', $export))->assertNotFound();
    }

    public function test_the_file_expires_after_a_day_and_is_pruned()
    {
        $manager = User::factory()->create();
        $this->actingAs($manager)->post(route('company.data-export.prepare'));
        $export = DataExport::firstOrFail();

        $this->travel(DataExport::AVAILABLE_HOURS + 1)->hours();

        $this->actingAs($manager)->get(route('company.data-export.download', $export))
            ->assertRedirect(route('company.data-export'))
            ->assertSessionHas('warning');

        $this->artisan('model:prune', ['--model' => [DataExport::class]])->assertSuccessful();
        Storage::disk(DataExport::DISK)->assertMissing($export->path);
        $this->assertModelMissing($export);
    }

    public function test_a_new_export_replaces_the_previous_file()
    {
        $manager = User::factory()->create();
        $this->actingAs($manager)->post(route('company.data-export.prepare'));
        $first = DataExport::firstOrFail();

        $this->travel(25)->minutes();
        $this->actingAs($manager)->post(route('company.data-export.prepare'));

        $this->assertModelMissing($first);
        Storage::disk(DataExport::DISK)->assertMissing($first->path);
        $this->assertSame(1, DataExport::count());
    }
}
