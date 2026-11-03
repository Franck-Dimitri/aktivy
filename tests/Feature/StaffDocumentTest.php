<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\AuditLog;
use App\Models\StaffDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StaffDocumentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        Storage::fake('local');
    }

    private function upload(User $by, User $member, string $name = 'cni.pdf')
    {
        return $this->actingAs($by)->post(route('personnel.documents.store', $member), [
            'type' => 'id_card',
            'file' => UploadedFile::fake()->create($name, 200, 'application/pdf'),
        ]);
    }

    public function test_a_manager_attaches_reads_and_removes_a_document()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);

        $this->upload($manager, $agent)->assertSessionHasNoErrors();
        $document = StaffDocument::firstOrFail();
        $this->assertSame('Pièce d’identité', $document->title);
        Storage::disk('local')->assertExists($document->path);

        $this->actingAs($manager)->get(route('personnel.show', $agent))
            ->assertInertia(fn ($page) => $page->has('documents', 1)->where('documents.0.is_pdf', true));
        $this->actingAs($manager)->get(route('personnel.documents.show', [$agent, $document]))->assertOk();

        $this->actingAs($manager)->delete(route('personnel.documents.destroy', [$agent, $document]))->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($document->path);
        $this->assertSame(2, AuditLog::withoutGlobalScopes()->whereIn('action', ['staff.document_added', 'staff.document_removed'])->count());
    }

    public function test_documents_are_closed_to_other_companies_the_hostess_and_the_wrong_supervisor()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $this->upload($manager, $agent);
        $document = StaffDocument::firstOrFail();

        $site = $manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $manager->id]);
        $other = $manager->company->sites()->create(['name' => 'Deido', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $manager->id]);
        $supervisor = User::factory()->supervisor()->create(['company_id' => $manager->company_id]);
        foreach ([[$agent, $site], [$supervisor, $other]] as [$member, $s]) {
            $manager->company->affectations()->create(['site_id' => $s->id, 'user_id' => $member->id, 'assigned_by' => $manager->id, 'starts_on' => now()->toDateString(), 'status' => AffectationStatus::Active]);
        }

        $url = route('personnel.documents.show', [$agent, $document]);
        $this->actingAs(User::factory()->create())->get($url)->assertForbidden();
        $this->actingAs($agent)->get($url)->assertForbidden();
        $this->actingAs($supervisor)->get($url)->assertForbidden();
        $this->upload($supervisor, $agent)->assertForbidden();
    }

    public function test_only_pdf_and_images_are_accepted_and_the_manager_has_no_file_managed_by_others()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $supervisor = User::factory()->supervisor()->create(['company_id' => $manager->company_id]);

        $this->actingAs($manager)->post(route('personnel.documents.store', $agent), [
            'type' => 'other',
            'file' => UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream'),
        ])->assertSessionHasErrors('file');

        $this->upload($supervisor, $manager)->assertForbidden();
    }
}
