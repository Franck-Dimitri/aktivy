<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProvisionalPasswordAndVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_manager_gives_any_provisional_password_to_a_new_member()
    {
        $manager = User::factory()->create();

        $this->actingAs($manager)->post(route('personnel.store'), [
            'name' => 'Awa',
            'phone' => '690000011',
            'role' => Role::FieldAgent->value,
            'password' => '12345',
            'password_confirmation' => '12345',
        ])->assertSessionHasNoErrors();

        $member = User::where('name', 'Awa')->firstOrFail();
        $this->assertTrue($member->must_change_password);
        $this->assertTrue(Hash::check('12345', $member->password));
    }

    public function test_the_member_replaces_the_provisional_password_with_8_characters_upper_lower_and_digit()
    {
        // Règles de production (les tests tournent hors production) ; la vérification des fuites est simulée
        // (hors environnement de test, Laravel réactive la protection CSRF : on la retire ici)
        $this->app['env'] = 'production';
        $this->withoutMiddleware([PreventRequestForgery::class, ValidateCsrfToken::class]);
        Http::fake();

        $member = User::factory()->fieldAgent()->create(['password' => '12345', 'must_change_password' => true]);
        $this->actingAs($member);

        $this->get(route('dashboard'))->assertRedirect(route('password.change'));

        foreach (['Abc123', 'motriks2026', 'MOTRIKS2026', 'Motriksabc'] as $weak) {
            $this->put(route('password.change.update'), ['password' => $weak, 'password_confirmation' => $weak])
                ->assertSessionHasErrors('password');
        }

        $this->put(route('password.change.update'), ['password' => 'Motriks26', 'password_confirmation' => 'Motriks26'])
            ->assertSessionHasNoErrors();

        $this->assertFalse($member->fresh()->must_change_password);
    }

    public function test_a_new_company_confirms_its_email_before_sending_its_documents()
    {
        $manager = User::factory()->unverified()->for(Company::factory()->state(['status' => AccountStatus::Pending]))->create();
        $this->actingAs($manager);

        // La page « Confirmez votre e-mail » n'est plus court-circuitée par le dépôt des documents
        $this->get(route('dashboard'))->assertRedirect(route('onboarding.show'));
        $this->get(route('onboarding.show'))->assertRedirect(route('verification.notice'));
        $this->get(route('verification.notice'))->assertOk();
        $this->post(route('onboarding.store'), ['sector' => 'Autre', 'city' => 'Douala'])->assertRedirect(route('verification.notice'));

        $manager->markEmailAsVerified();

        $this->actingAs($manager->fresh())->get(route('onboarding.show'))->assertOk();
    }
}
