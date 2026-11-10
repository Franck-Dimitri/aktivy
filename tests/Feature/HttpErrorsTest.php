<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Erreurs lisibles : page Motriks pour un accès refusé ou introuvable, message sur la page
 * pour une action refusée, JSON inchangé pour les appels en arrière-plan.
 */
class HttpErrorsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_a_forbidden_page_shows_the_motriks_error_page()
    {
        $supervisor = User::factory()->supervisor()->create();

        $this->actingAs($supervisor)->get(route('company.settings.edit'))
            ->assertForbidden()
            ->assertInertia(fn ($page) => $page->component('error')
                ->where('status', 403)
                ->where('title', 'Accès non autorisé')
                ->where('home', $supervisor->homeUrl())
                ->where('message', fn (string $m) => str_contains($m, 'autorisation')));
    }

    public function test_a_forbidden_action_returns_to_the_page_with_the_message()
    {
        $supervisor = User::factory()->supervisor()->create();
        $hostess = User::factory()->fieldAgent()->create(['company_id' => $supervisor->company_id]);

        // Supprimer un compte : réservé au gérant
        $this->actingAs($supervisor)
            ->from(route('personnel.index'))
            ->withHeaders(['X-Inertia' => 'true', 'X-Requested-With' => 'XMLHttpRequest'])
            ->delete(route('personnel.destroy', $hostess))
            ->assertRedirect(route('personnel.index'))
            ->assertSessionHas('error')
            ->assertSessionHasErrors('autorisation');

        $this->assertNotSoftDeleted($hostess);
    }

    public function test_a_french_abort_message_is_kept_and_a_missing_page_hides_technical_details()
    {
        $admin = User::factory()->superAdmin()->create();
        $manager = User::factory()->create();

        // Message précis donné par abort(422, '…') : affiché tel quel
        $this->actingAs($admin)
            ->from(route('admin.companies.show', $manager->company))
            ->withHeaders(['X-Inertia' => 'true', 'X-Requested-With' => 'XMLHttpRequest'])
            ->post(route('admin.users.reactivate', $manager))
            ->assertSessionHas('error', 'Ce compte n’est pas suspendu.');

        $this->flushHeaders();
        $this->actingAs($admin)->get('/admin/entreprises/999999')
            ->assertNotFound()
            ->assertInertia(fn ($page) => $page->component('error')
                ->where('status', 404)
                ->where('message', fn (string $m) => ! str_contains($m, 'model')));
    }

    public function test_a_visitor_on_an_unknown_page_is_sent_back_to_the_home_page()
    {
        $this->get('/une-page-qui-n-existe-pas')
            ->assertNotFound()
            ->assertInertia(fn ($page) => $page->component('error')->where('home', '/')->where('signed_in', false));
    }

    public function test_json_requests_keep_their_json_error()
    {
        $supervisor = User::factory()->supervisor()->create();

        $this->actingAs($supervisor)->getJson(route('company.settings.edit'))
            ->assertForbidden()
            ->assertJsonStructure(['message']);
    }
}
