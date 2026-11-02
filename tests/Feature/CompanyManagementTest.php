<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CompanyManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_a_manager_updates_the_identity_of_the_company()
    {
        Storage::fake('public');
        $manager = User::factory()->create();

        $this->actingAs($manager)->post(route('company.settings.update'), [
            'name' => 'Beauté Cameroun',
            'primary_color' => '#1e3a8a',
            'logo' => UploadedFile::fake()->image('logo.png'),
        ])->assertSessionHasNoErrors();

        $company = $manager->company->fresh();
        $this->assertSame('Beauté Cameroun', $company->name);
        $this->assertSame('#1e3a8a', $company->primary_color);
        Storage::disk('public')->assertExists($company->logo_path);

        $this->actingAs($manager)->post(route('company.settings.update'), ['name' => 'Beauté Cameroun', 'remove_logo' => true]);
        $this->assertNull($company->fresh()->logo_path);
    }

    public function test_only_the_manager_can_open_the_settings_and_the_color_is_validated()
    {
        $manager = User::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['company_id' => $manager->company_id]);

        $this->actingAs($supervisor)->get(route('company.settings.edit'))->assertForbidden();
        $this->actingAs($manager)->get(route('company.settings.edit'))->assertOk();
        $this->actingAs($manager)->post(route('company.settings.update'), ['name' => 'X', 'primary_color' => 'url(x)'])
            ->assertSessionHasErrors('primary_color');
    }

    public function test_a_too_light_color_falls_back_to_a_readable_one_in_documents()
    {
        $this->assertSame('#1e3a8a', Company::factory()->make(['primary_color' => '#1e3a8a'])->documentColor());
        $this->assertSame('#027a48', Company::factory()->make(['primary_color' => '#ffff99'])->documentColor());
        $this->assertSame('#027a48', Company::factory()->make(['primary_color' => null])->documentColor());
    }

    public function test_the_super_admin_lists_suspends_and_reactivates_a_company()
    {
        $admin = User::factory()->superAdmin()->create();
        $manager = User::factory()->create();
        $company = $manager->company;

        $this->actingAs($admin)->get(route('admin.companies.index'))
            ->assertInertia(fn ($page) => $page->component('admin/companies/index')->has('companies', 1));

        $this->actingAs($admin)->post(route('admin.companies.suspend', $company))->assertSessionHasNoErrors();
        $this->assertSame(AccountStatus::Suspended, $company->fresh()->status);
        $this->assertSame(1, AuditLog::withoutGlobalScopes()->where('action', 'company.suspended')->count());

        // Ses utilisateurs sont sortis à la requête suivante
        $this->actingAs($manager->fresh())->get(route('dashboard'))->assertRedirect(route('login'));

        $this->actingAs($admin)->post(route('admin.companies.reactivate', $company))->assertSessionHasNoErrors();
        $this->assertSame(AccountStatus::Active, $company->fresh()->status);
    }

    public function test_a_pending_company_can_not_be_suspended_and_only_the_super_admin_has_access()
    {
        $admin = User::factory()->superAdmin()->create();
        $pending = Company::factory()->create(['status' => AccountStatus::Pending]);
        $manager = User::factory()->create();

        $this->actingAs($admin)->post(route('admin.companies.suspend', $pending))->assertStatus(422);
        $this->actingAs($manager)->get(route('admin.companies.index'))->assertForbidden();
        $this->actingAs($manager)->post(route('admin.companies.suspend', $manager->company))->assertForbidden();
    }
}
