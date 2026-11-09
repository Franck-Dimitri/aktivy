<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\Auth\QueuedVerifyEmail;
use App\Notifications\CompanyInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Documents légaux de l'entreprise (administration et gérant) et modification du gérant par l'administration.
 */
class CompanyDocumentsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        Storage::fake('local');
        $this->admin = User::factory()->superAdmin()->create();
        $this->manager = User::factory()->create();
    }

    public function test_the_admin_adds_then_replaces_a_document_of_a_company_without_file()
    {
        $company = $this->manager->company;

        $this->actingAs($this->admin)->post(route('admin.companies.documents.store', [$company, 'registration_doc']), [
            'file' => UploadedFile::fake()->create('registre.pdf', 300, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $first = $company->fresh()->registration_doc_path;
        Storage::disk('local')->assertExists($first);
        $this->assertDatabaseHas('audit_logs', ['action' => 'company.document_uploaded', 'company_id' => $company->id]);

        $this->actingAs($this->admin)->post(route('admin.companies.documents.store', [$company, 'registration_doc']), [
            'file' => UploadedFile::fake()->image('registre.jpg'),
        ])->assertSessionHasNoErrors();

        $second = $company->fresh()->registration_doc_path;
        $this->assertNotSame($first, $second);
        Storage::disk('local')->assertMissing($first);
        $this->assertDatabaseHas('audit_logs', ['action' => 'company.document_replaced', 'company_id' => $company->id]);

        $this->actingAs($this->admin)->get(route('admin.companies.show', $company))
            ->assertInertia(fn ($page) => $page
                ->where('documents.2.type', 'registration_doc')
                ->where('documents.2.uploaded', true)
                ->where('documents.0.uploaded', false));

        $this->actingAs($this->admin)->get(route('admin.onboarding.document', [$company, 'registration_doc']))->assertOk();
    }

    public function test_only_images_and_pdfs_are_accepted_and_unknown_types_do_not_exist()
    {
        $company = $this->manager->company;

        $this->actingAs($this->admin)->post(route('admin.companies.documents.store', [$company, 'id_card_front']), [
            'file' => UploadedFile::fake()->create('cni.docx', 100),
        ])->assertSessionHasErrors('file');

        $this->actingAs($this->admin)->post(route('admin.companies.documents.store', [$company, 'passport']), [
            'file' => UploadedFile::fake()->image('x.jpg'),
        ])->assertNotFound();
    }

    public function test_the_manager_updates_and_views_his_own_documents_only()
    {
        $this->actingAs($this->manager)->post(route('company.documents.store', 'id_card_front'), [
            'file' => UploadedFile::fake()->image('cni-recto.png'),
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->manager)->get(route('company.documents.show', 'id_card_front'))->assertOk();
        $this->actingAs($this->manager)->get(route('company.documents.show', 'id_card_back'))->assertNotFound();

        $this->actingAs($this->manager)->get(route('company.settings.edit'))
            ->assertInertia(fn ($page) => $page->where('documents.0.uploaded', true)->has('documents', 3));

        // Un autre gérant ne voit que les documents de sa propre entreprise
        $other = User::factory()->create();
        $this->actingAs($other)->get(route('company.documents.show', 'id_card_front'))->assertNotFound();

        // Superviseur : pas d'accès aux documents légaux
        $supervisor = User::factory()->supervisor()->create(['company_id' => $this->manager->company_id]);
        $this->actingAs($supervisor)->get(route('company.documents.show', 'id_card_front'))->assertForbidden();
        $this->actingAs($supervisor)->post(route('company.documents.store', 'id_card_front'), ['file' => UploadedFile::fake()->image('x.png')])->assertForbidden();
    }

    public function test_the_admin_changes_the_manager_email_and_it_must_be_confirmed_again()
    {
        Notification::fake();

        $this->actingAs($this->admin)->put(route('admin.companies.managers.update', [$this->manager->company, $this->manager]), [
            'name' => 'Paul Mbarga',
            'email' => 'Paul.Mbarga@Illiko.cm',
            'phone' => '690112233',
        ])->assertSessionHasNoErrors();

        $manager = $this->manager->fresh();
        $this->assertSame('paul.mbarga@illiko.cm', $manager->email);
        $this->assertSame('Paul Mbarga', $manager->name);
        $this->assertNull($manager->email_verified_at);
        Notification::assertSentTo($manager, QueuedVerifyEmail::class);
        $this->assertDatabaseHas('audit_logs', ['action' => 'manager.updated_by_admin']);
    }

    public function test_an_invited_manager_receives_the_invitation_at_the_new_address()
    {
        Notification::fake();
        $invited = User::factory()->mustChangePassword()->unverified()->create();

        $this->actingAs($this->admin)->put(route('admin.companies.managers.update', [$invited->company, $invited]), [
            'name' => $invited->name,
            'email' => 'nouveau@kaliss.cm',
        ])->assertSessionHasNoErrors();

        Notification::assertSentTo($invited->fresh(), CompanyInvitation::class);
    }

    public function test_an_email_or_phone_already_used_is_refused_and_other_companies_are_out_of_reach()
    {
        $taken = User::factory()->create(['phone' => '+237690445566']);

        $this->actingAs($this->admin)->put(route('admin.companies.managers.update', [$this->manager->company, $this->manager]), [
            'name' => 'X', 'email' => $taken->email,
        ])->assertSessionHasErrors('email');

        $this->actingAs($this->admin)->put(route('admin.companies.managers.update', [$this->manager->company, $this->manager]), [
            'name' => 'X', 'email' => 'libre@exemple.cm', 'phone' => '690445566',
        ])->assertSessionHasErrors('phone');

        $this->actingAs($this->admin)->put(route('admin.companies.managers.update', [$taken->company, $this->manager]), [
            'name' => 'X', 'email' => 'libre@exemple.cm',
        ])->assertNotFound();

        $this->actingAs($this->manager)->put(route('admin.companies.managers.update', [$this->manager->company, $this->manager]), [
            'name' => 'X', 'email' => 'libre@exemple.cm',
        ])->assertForbidden();
    }
}
