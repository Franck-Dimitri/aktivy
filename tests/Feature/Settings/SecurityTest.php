<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_security_page_is_displayed()
    {
        $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

        Features::twoFactorAuthentication([
            'confirm' => true,
            'confirmPassword' => true,
        ]);
        /* @chisel-passkeys */
        Features::passkeys([
            'confirmPassword' => true,
        ]);
        /* @end-chisel-passkeys */

        $user = User::factory()->create();

        $this->actingAs($user)
            /* @chisel-password-confirmation */
            ->withSession(['auth.password_confirmed_at' => time()])
            /* @end-chisel-password-confirmation */
            ->get(route('security.edit'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/security')
                /* @chisel-passkeys */
                ->where('canManagePasskeys', true)
                ->where('passkeys', [])
                /* @end-chisel-passkeys */
                ->where('canManageTwoFactor', true)
                ->where('twoFactorEnabled', false),
            );
    }

    /* @chisel-password-confirmation */
    /**
     * La clé scannée doit survivre aux réaffichages de la page Sécurité (redirection obligatoire des
     * administrateurs, actualisation automatique) : sinon tous les codes sont refusés.
     */
    public function test_the_pending_two_factor_key_survives_page_reloads_until_confirmed()
    {
        $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

        Features::twoFactorAuthentication([
            'confirm' => true,
            'confirmPassword' => true,
        ]);

        $user = User::factory()->create();
        $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()]);

        $this->post('/user/two-factor-authentication')->assertRedirect();
        $secret = decrypt($user->fresh()->two_factor_secret);

        // La page a déjà été affichée il y a 10 s (état de session laissé par Fortify), puis elle est
        // réaffichée sans saisie de code : c'est ce moment qui effaçait la clé
        $this->withSession([
            'auth.password_confirmed_at' => time(),
            'two_factor_empty_at' => time() - 10,
            'two_factor_confirming_at' => time() - 10,
        ])->get(route('security.edit'))->assertOk();
        $this->assertSame($secret, decrypt($user->fresh()->two_factor_secret));

        // Réactiver ne change pas la clé déjà scannée
        $this->post('/user/two-factor-authentication')->assertRedirect();
        $this->assertSame($secret, decrypt($user->fresh()->two_factor_secret));

        $this->post('/user/confirmed-two-factor-authentication', ['code' => (new Google2FA)->getCurrentOtp($secret)])
            ->assertSessionHasNoErrors();
        $this->assertNotNull($user->fresh()->two_factor_confirmed_at);
    }

    public function test_security_page_requires_password_confirmation_when_enabled()
    {
        $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

        $user = User::factory()->create();

        Features::twoFactorAuthentication([
            'confirm' => true,
            'confirmPassword' => true,
        ]);

        $response = $this->actingAs($user)
            ->get(route('security.edit'));

        $response->assertRedirect(route('password.confirm'));
    }
    /* @end-chisel-password-confirmation */

    public function test_security_page_renders_without_two_factor_when_feature_is_disabled()
    {
        $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

        config(['fortify.features' => []]);

        $user = User::factory()->create();

        $this->actingAs($user)
            /* @chisel-password-confirmation */
            ->withSession(['auth.password_confirmed_at' => time()])
            /* @end-chisel-password-confirmation */
            ->get(route('security.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/security')
                /* @chisel-passkeys */
                ->where('canManagePasskeys', false)
                ->where('passkeys', [])
                /* @end-chisel-passkeys */
                ->where('canManageTwoFactor', false)
                ->missing('twoFactorEnabled')
                ->missing('requiresConfirmation'),
            );
    }

    public function test_password_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('security.edit'))
            ->put(route('user-password.update'), [
                'current_password' => 'password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('security.edit'));

        $this->assertTrue(Hash::check('new-password', $user->refresh()->password));
    }

    public function test_correct_password_must_be_provided_to_update_password()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('security.edit'))
            ->put(route('user-password.update'), [
                'current_password' => 'wrong-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response
            ->assertSessionHasErrors('current_password')
            ->assertRedirect(route('security.edit'));
    }
}
