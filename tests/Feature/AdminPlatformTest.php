<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\Company;
use App\Models\User;
use App\Notifications\CompanyInvitation;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Espace super administrateur : tableau de bord, fiche entreprise, création directe et invitation.
 */
class AdminPlatformTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->admin = User::factory()->superAdmin()->create();
    }

    private function newCompanyPayload(array $overrides = []): array
    {
        return [
            'name' => 'Kalis’s Distribution',
            'sector' => 'Distribution / Négoce',
            'city' => 'Douala',
            'manager_name' => 'Paul Kalis',
            'manager_email' => 'Paul@Kalis.cm',
            'manager_phone' => '690112233',
            ...$overrides,
        ];
    }

    public function test_only_the_super_admin_opens_the_platform_pages()
    {
        $manager = User::factory()->create();

        foreach ([route('admin.dashboard'), route('admin.companies.create'), route('admin.companies.show', $manager->company)] as $url) {
            $this->actingAs($manager)->get($url)->assertForbidden();
            $this->actingAs($this->admin)->get($url)->assertOk();
        }
    }

    public function test_the_dashboard_lists_what_needs_attention()
    {
        $quiet = User::factory()->create()->company;
        $unverified = User::factory()->unverified()->create();

        $this->actingAs($this->admin)->get(route('admin.dashboard'))
            ->assertInertia(fn ($page) => $page
                ->component('admin/dashboard')
                ->where('companies.active', 2)
                ->where('inactive', fn ($rows) => collect($rows)->pluck('id')->contains($quiet->id))
                ->where('unverified_managers', fn ($rows) => collect($rows)->pluck('id')->contains($unverified->id))
                ->has('usage.revenue_month'));
    }

    public function test_the_super_admin_creates_a_company_and_its_manager_is_invited()
    {
        Notification::fake();

        $this->actingAs($this->admin)->post(route('admin.companies.store'), $this->newCompanyPayload())
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $company = Company::where('name', 'Kalis’s Distribution')->firstOrFail();
        $manager = $company->users()->firstOrFail();

        $this->assertSame(AccountStatus::Active, $company->status);
        $this->assertSame(Role::CompanyAdmin, $manager->role);
        $this->assertSame('paul@kalis.cm', $manager->email);
        $this->assertTrue($manager->must_change_password);
        $this->assertNull($manager->email_verified_at);
        $this->assertNotEmpty($company->activeModules(), 'l’essai des modules commence tout de suite');

        Notification::assertSentTo($manager, CompanyInvitation::class);
        $this->assertDatabaseHas('audit_logs', ['action' => 'company.created_by_admin', 'company_id' => $company->id]);
    }

    public function test_an_email_already_used_is_refused()
    {
        $taken = User::factory()->create();

        $this->actingAs($this->admin)->post(route('admin.companies.store'), $this->newCompanyPayload(['manager_email' => $taken->email]))
            ->assertSessionHasErrors('manager_email');
    }

    public function test_the_invitation_confirms_the_email_and_leads_to_the_password_page()
    {
        Notification::fake();
        $this->actingAs($this->admin)->post(route('admin.companies.store'), $this->newCompanyPayload());
        $manager = User::where('email', 'paul@kalis.cm')->firstOrFail();
        auth()->logout();

        $url = URL::temporarySignedRoute('invitation.accept', now()->addDays(7), ['user' => $manager->id]);

        $response = $this->get($url);
        $response->assertRedirect();
        $this->assertStringContainsString('/reset-password/', $response->headers->get('Location'));
        $this->assertNotNull($manager->fresh()->email_verified_at);

        // Le mot de passe choisi depuis le lien n'est pas redemandé ensuite
        $token = basename(parse_url($response->headers->get('Location'), PHP_URL_PATH));
        $this->post(route('password.update'), [
            'token' => $token,
            'email' => $manager->email,
            'password' => 'Kalis-Motriks-2026!',
            'password_confirmation' => 'Kalis-Motriks-2026!',
        ])->assertSessionHasNoErrors();
        $this->assertFalse($manager->fresh()->must_change_password);

        // Le lien ne sert plus
        $this->get($url)->assertRedirect(route('login'));
    }

    public function test_an_invitation_link_without_a_valid_signature_is_refused()
    {
        $manager = User::factory()->mustChangePassword()->create();

        $this->get(route('invitation.accept', $manager))->assertForbidden();
        $this->get(URL::temporarySignedRoute('invitation.accept', now()->subMinute(), ['user' => $manager->id]))->assertForbidden();
    }

    public function test_the_company_page_shows_its_manager_and_can_be_corrected()
    {
        $manager = User::factory()->unverified()->create();
        $company = $manager->company;

        $this->actingAs($this->admin)->get(route('admin.companies.show', $company))
            ->assertInertia(fn ($page) => $page
                ->component('admin/companies/show')
                ->where('managers.0.id', $manager->id)
                ->where('managers.0.verified', false));

        $this->actingAs($this->admin)->put(route('admin.companies.update', $company), [
            'name' => 'GBS Illiko',
            'city' => 'Yaoundé',
        ])->assertSessionHasNoErrors();

        $this->assertSame('Yaoundé', $company->fresh()->city);
        $this->assertDatabaseHas('audit_logs', ['action' => 'company.updated_by_admin', 'company_id' => $company->id]);
    }

    public function test_the_super_admin_helps_a_manager_without_seeing_any_password()
    {
        Notification::fake();
        $manager = User::factory()->unverified()->create();
        $company = $manager->company;

        $this->actingAs($this->admin)->post(route('admin.companies.managers.verification', [$company, $manager]))->assertSessionHasNoErrors();
        Notification::assertSentTo($manager, VerifyEmail::class);

        $this->actingAs($this->admin)->post(route('admin.companies.managers.password', [$company, $manager]))->assertSessionHasNoErrors();
        Notification::assertSentTo($manager, ResetPassword::class);

        // Pas d'invitation à renvoyer : ce gérant a choisi son mot de passe lui-même
        $this->actingAs($this->admin)->post(route('admin.companies.managers.invitation', [$company, $manager]))->assertStatus(422);
    }

    public function test_a_manager_of_another_company_can_not_be_targeted()
    {
        $manager = User::factory()->create();
        $other = User::factory()->create()->company;

        $this->actingAs($this->admin)->post(route('admin.companies.managers.password', [$other, $manager]))->assertNotFound();
    }
}
