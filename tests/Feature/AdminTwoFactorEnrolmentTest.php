<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Double authentification imposée au super administrateur (en production) : les appels de fond de
 * l'application ne doivent jamais renvoyer vers la page Sécurité, sinon le navigateur la rechargeait
 * en silence et Fortify annulait l'activation en cours (secret effacé, code toujours refusé).
 */
class AdminTwoFactorEnrolmentTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->app->detectEnvironment(fn () => 'production');
        $this->admin = User::factory()->superAdmin()->create();
    }

    public function test_the_admin_without_two_factor_is_sent_to_the_security_page()
    {
        $this->actingAs($this->admin)->get(route('admin.dashboard'))->assertRedirect(route('security.edit'));
    }

    public function test_background_calls_are_never_redirected()
    {
        $this->actingAs($this->admin)->getJson(route('notifications.pulse'))->assertOk()->assertJsonStructure(['latest', 'unread']);
        $this->actingAs($this->admin)->getJson(route('notifications.recent'))->assertOk();

        // Toute autre requête JSON : refus net, sans redirection à suivre
        $this->actingAs($this->admin)->getJson(route('admin.users.index'))->assertForbidden();
    }

    public function test_a_pending_activation_survives_the_background_pulse()
    {
        // En « production », le test perd l'exemption CSRF des tests : on envoie un jeton valide
        $this->actingAs($this->admin)
            ->withSession(['auth.password_confirmed_at' => time(), '_token' => 'jeton-de-test'])
            ->post(route('two-factor.enable'), ['_token' => 'jeton-de-test'])
            ->assertRedirect();

        $secret = $this->admin->fresh()->two_factor_secret;
        $this->assertNotNull($secret);

        // Le pouls passe pendant que l'administrateur scanne le QR code
        $this->actingAs($this->admin)->getJson(route('notifications.pulse'))->assertOk();

        $this->assertSame($secret, $this->admin->fresh()->two_factor_secret);
    }

    public function test_once_confirmed_the_admin_reaches_the_administration()
    {
        $this->admin->forceFill([
            'two_factor_secret' => encrypt('JBSWY3DPEHPK3PXP'),
            'two_factor_confirmed_at' => now(),
        ])->save();

        $this->actingAs($this->admin)->get(route('admin.dashboard'))->assertOk();
    }
}
