<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Application installée (start_url /app) : comme une application mobile, directement l'espace
 * de l'utilisateur ou la connexion, jamais la landing.
 */
class AppLaunchTest extends TestCase
{
    use RefreshDatabase;

    private const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36';

    private const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

    private const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_l_application_ouvre_la_connexion_pour_un_visiteur(): void
    {
        $this->get('/app')->assertRedirect(route('login'));
    }

    public function test_l_application_ouvre_l_espace_de_l_utilisateur_connecte(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/app')->assertRedirect($user->homeUrl());
    }

    public function test_sur_telephone_un_utilisateur_connecte_va_dans_son_espace(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->withHeader('User-Agent', self::ANDROID)->get('/')->assertRedirect($user->homeUrl());
    }

    public function test_les_visiteurs_sur_telephone_et_les_utilisateurs_sur_ordinateur_voient_la_landing(): void
    {
        $this->withHeader('User-Agent', self::IPHONE)->get('/')->assertOk();

        $this->actingAs(User::factory()->create())->withHeader('User-Agent', self::DESKTOP)->get('/')->assertOk();
    }

    public function test_le_manifeste_demarre_l_application_sur_app(): void
    {
        $manifest = json_decode((string) file_get_contents(public_path('manifest.json')), true);

        $this->assertSame('/app', $manifest['start_url']);
        // Même identifiant : les installations existantes restent la même application
        $this->assertSame('/', $manifest['id']);
    }
}
