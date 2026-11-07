<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Aucun identifiant de démonstration ne doit atteindre la production :
 * ni dans la page de connexion, ni dans la base (seeder).
 */
class SecurityHygieneTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_accounts_are_offered_on_the_login_page_in_local_only()
    {
        $this->withoutVite();

        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page
            ->where('devAccounts', fn ($accounts) => collect($accounts)->pluck('login')->contains('gerant@demo.test')));

        $this->app->detectEnvironment(fn () => 'production');

        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('devAccounts', []));
    }

    public function test_the_demo_seeder_refuses_to_run_in_production()
    {
        $this->app->detectEnvironment(fn () => 'production');

        // Même en forçant la commande (sans confirmation), aucun compte n'est créé
        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true]);

        $this->assertSame(0, User::count());
    }

    public function test_the_demo_seeder_creates_only_demo_accounts()
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(5, User::count());
        $this->assertSame(0, User::where('email', 'not like', '%.test')->whereNotNull('email')->count(), 'Aucune adresse réelle dans le seeder');
    }
}
