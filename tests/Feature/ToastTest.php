<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Messages de confirmation : ceux des contrôleurs (`->with('success')`) et ceux du compte
 * (connexion, déconnexion) arrivent en toast sur la page suivante.
 */
class ToastTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_a_session_success_message_becomes_a_toast_on_the_next_page()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['success' => 'Site créé.'])
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->hasFlash('toast', ['type' => 'success', 'message' => 'Site créé.']));
    }

    public function test_an_error_message_becomes_an_error_toast()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['error' => 'Action impossible.'])
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->hasFlash('toast.type', 'error'));
    }

    public function test_logging_in_welcomes_the_user_by_first_name()
    {
        User::factory()->create(['name' => 'Awa Mbarga', 'email' => 'awa@example.cm']);

        $this->post(route('login.store'), ['login' => 'awa@example.cm', 'password' => 'password'])
            ->assertSessionHas('inertia.flash_data.toast', ['type' => 'success', 'message' => 'Bon retour, Awa !']);
    }

    public function test_logging_out_says_goodbye()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('logout'))
            ->assertRedirect('/')
            ->assertSessionHas('inertia.flash_data.toast', ['type' => 'success', 'message' => 'Vous êtes déconnecté. À bientôt !']);
    }
}
