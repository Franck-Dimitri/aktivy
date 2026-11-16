<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\AffectationStatus;
use App\Models\Site;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Listes de l'espace entreprise paginées côté serveur : les filtres restent dans l'URL d'une page
 * à l'autre, les compteurs du haut portent sur tout le périmètre, et le superviseur reste limité
 * à ses sites quelle que soit la page demandée.
 */
class CompanyListPaginationTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->manager = User::factory()->create();
    }

    private function site(string $name, string $city = 'Douala'): Site
    {
        return $this->manager->company->sites()->create([
            'name' => $name,
            'type' => 'autre',
            'city' => $city,
            'created_by' => $this->manager->id,
        ]);
    }

    private function assign(User $member, Site $site, AffectationStatus $status = AffectationStatus::Active): void
    {
        $this->manager->company->affectations()->create([
            'site_id' => $site->id,
            'user_id' => $member->id,
            'assigned_by' => $this->manager->id,
            'starts_on' => now()->toDateString(),
            'status' => $status,
        ]);
    }

    private function ticket(User $agent, array $attributes = []): Ticket
    {
        return Ticket::create([
            'company_id' => $agent->company_id,
            'user_id' => $agent->id,
            'subject' => 'Demande',
            'body' => 'Merci de regarder.',
            'priority' => 'normal',
            ...$attributes,
        ]);
    }

    private function hostess(array $attributes = []): User
    {
        return User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id, ...$attributes]);
    }

    public function test_tickets_are_paginated_with_counts_on_all_of_them()
    {
        $agent = $this->hostess();
        foreach (range(1, 28) as $i) {
            $this->ticket($agent, ['subject' => "Rupture {$i}"]);
        }
        $this->ticket($agent, ['subject' => 'Rupture résolue', 'status' => 'closed', 'response' => 'Livré.']);
        $this->ticket($agent, ['subject' => 'Urgent', 'priority' => 'urgent']);

        $this->actingAs($this->manager)->get(route('tickets.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('tickets/index')
                ->has('tickets.data', 25)
                ->where('tickets.total', 29)
                ->where('tickets.last_page', 2)
                ->where('filters.filtre', 'pending')
                ->where('counts.all', 30)
                ->where('counts.pending', 29)
                ->where('counts.unanswered', 29)
                ->where('counts.urgent', 1)
                ->where('counts.closed', 1));

        $this->actingAs($this->manager)->get(route('tickets.index', ['page' => 2]))
            ->assertInertia(fn ($page) => $page->has('tickets.data', 4)->where('tickets.current_page', 2));

        // Onglet et recherche appliqués par le serveur, compteurs inchangés
        $this->actingAs($this->manager)->get(route('tickets.index', ['filtre' => 'closed', 'q' => 'résolue']))
            ->assertInertia(fn ($page) => $page
                ->has('tickets.data', 1)
                ->where('tickets.data.0.subject', 'Rupture résolue')
                ->where('filters.q', 'résolue')
                ->where('counts.all', 30));
    }

    public function test_the_search_finds_a_ticket_by_the_name_of_the_hostess_whatever_the_case()
    {
        $this->ticket($this->hostess(['name' => 'Aïcha Mbarga']));
        $this->ticket($this->hostess(['name' => 'Brice Tchoua']));

        $this->actingAs($this->manager)->get(route('tickets.index', ['q' => 'mbarga']))
            ->assertInertia(fn ($page) => $page->has('tickets.data', 1)->where('tickets.data.0.agent_name', 'Aïcha Mbarga'));
    }

    public function test_the_next_page_keeps_the_search_and_the_filters()
    {
        foreach (range(1, 40) as $i) {
            $this->site(sprintf('Akwa %02d', $i));
        }
        $this->site('Bonapriso');

        $this->actingAs($this->manager)->get(route('sites.index', ['q' => 'akwa']))
            ->assertInertia(fn ($page) => $page
                ->component('sites/index')
                ->has('sites.data', 36)
                ->where('sites.total', 40)
                ->where('sites.next_page_url', fn (string $url) => str_contains($url, 'q=akwa') && str_contains($url, 'page=2'))
                // Les compteurs du haut portent sur tous les sites, pas sur la recherche ni sur la page
                ->where('stats.total', 41)
                ->where('stats.active', 41));

        $this->actingAs($this->manager)->get(route('sites.index', ['q' => 'akwa', 'page' => 2]))
            ->assertInertia(fn ($page) => $page
                ->has('sites.data', 4)
                ->where('sites.data.3.name', 'Akwa 40')
                ->where('filters.q', 'akwa'));
    }

    public function test_a_page_past_the_end_sends_back_to_the_last_one_with_the_filters()
    {
        foreach (range(1, 3) as $i) {
            $this->manager->company->products()->create(['name' => "Jus {$i}", 'unit' => 'pièce', 'is_active' => false]);
        }

        $this->actingAs($this->manager)->get(route('products.index', ['statut' => 'inactive', 'page' => 4]))
            ->assertRedirect(route('products.index', ['statut' => 'inactive', 'page' => 1]));
    }

    public function test_products_are_filtered_by_the_server_with_stats_on_the_whole_catalog()
    {
        $company = $this->manager->company;
        foreach (range(1, 38) as $i) {
            $company->products()->create(['name' => sprintf('Savon %02d', $i), 'unit' => 'pièce']);
        }
        $company->products()->create(['name' => 'Ancien savon', 'sku' => 'OLD-1', 'unit' => 'pièce', 'is_active' => false]);

        $this->actingAs($this->manager)->get(route('products.index'))
            ->assertInertia(fn ($page) => $page
                ->has('products.data', 36)
                ->where('products.last_page', 2)
                ->where('stats.total', 39)
                ->where('stats.active', 38)
                ->where('stats.inactive', 1)
                ->where('stats.deployed', 0));

        $this->actingAs($this->manager)->get(route('products.index', ['statut' => 'inactive', 'q' => 'old']))
            ->assertInertia(fn ($page) => $page
                ->has('products.data', 1)
                ->where('products.data.0.sku', 'OLD-1')
                ->where('filters.statut', 'inactive')
                ->where('stats.total', 39));

        // Une valeur inconnue dans l'URL est ignorée, pas une erreur
        $this->actingAs($this->manager)->get(route('products.index', ['statut' => 'nimporte']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('filters.statut', null)->where('products.total', 39));
    }

    public function test_personnel_filters_sort_and_counts()
    {
        $site = $this->site('Akwa');
        $busy = $this->hostess(['name' => 'Zoé']);
        $this->assign($busy, $site);
        $this->manager->company->visits()->create([
            'user_id' => $busy->id, 'site_id' => $site->id,
            'checked_in_at' => now(), 'status' => 'in_progress',
        ]);
        $this->hostess(['name' => 'Alice', 'status' => AccountStatus::Suspended]);
        User::factory()->supervisor()->create(['company_id' => $this->manager->company_id, 'name' => 'Bernard']);

        $this->actingAs($this->manager)->get(route('personnel.index', ['tri' => 'visits']))
            ->assertInertia(fn ($page) => $page
                ->component('personnel/index')
                ->where('staff.total', 3)
                ->where('staff.data.0.name', 'Zoé')
                ->where('counts.all', 3)
                ->where('counts.field_agent', 2)
                ->where('counts.supervisor', 1)
                ->where('counts.suspended', 1)
                ->where('counts.on_site', 1));

        $this->actingAs($this->manager)->get(route('personnel.index', ['role' => 'field_agent', 'en_poste' => 1]))
            ->assertInertia(fn ($page) => $page
                ->has('staff.data', 1)
                ->where('staff.data.0.name', 'Zoé')
                ->where('filters.en_poste', true)
                ->where('counts.all', 3));
    }

    public function test_affectations_are_paginated_with_stats_on_all_of_them()
    {
        $site = $this->site('Akwa');
        foreach (range(1, 37) as $i) {
            $this->assign($this->hostess(), $site);
        }
        $this->assign($this->hostess(), $site, AffectationStatus::Cancelled);

        $this->actingAs($this->manager)->get(route('affectations.index'))
            ->assertInertia(fn ($page) => $page
                ->component('affectations/index')
                ->has('affectations.data', 36)
                ->where('stats.total', 38)
                ->where('stats.active', 37)
                ->where('stats.current', 37)
                ->where('stats.cancelled', 1)
                // Les listes des fenêtres (choix d'un membre ou d'un site) restent complètes
                ->has('staff', 38)
                ->has('sites', 1));

        $this->actingAs($this->manager)->get(route('affectations.index', ['statut' => 'cancelled']))
            ->assertInertia(fn ($page) => $page->has('affectations.data', 1)->where('stats.total', 38));
    }

    public function test_a_supervisor_stays_limited_to_his_sites_on_every_page()
    {
        $supervisor = User::factory()->supervisor()->create(['company_id' => $this->manager->company_id]);
        $mySite = $this->site('Akwa');
        $this->assign($supervisor, $mySite);

        $mine = $this->hostess();
        $this->assign($mine, $mySite);
        $this->ticket($mine, ['subject' => 'Chez moi']);

        // Beaucoup d'activité ailleurs, de quoi remplir plusieurs pages
        foreach (range(1, 40) as $i) {
            $other = $this->hostess();
            $this->assign($other, $this->site("Ailleurs {$i}"));
            $this->ticket($other, ['subject' => "Ailleurs {$i}"]);
        }

        $this->actingAs($supervisor)->get(route('sites.index'))
            ->assertInertia(fn ($page) => $page
                ->where('sites.total', 1)
                ->where('sites.data.0.id', $mySite->id)
                ->where('stats.total', 1));

        $this->actingAs($supervisor)->get(route('tickets.index', ['filtre' => 'all']))
            ->assertInertia(fn ($page) => $page
                ->where('tickets.total', 1)
                ->where('tickets.data.0.subject', 'Chez moi')
                ->where('counts.all', 1));

        $this->actingAs($supervisor)->get(route('affectations.index'))
            ->assertInertia(fn ($page) => $page
                ->where('affectations.total', 2)
                ->where('stats.total', 2)
                ->where('affectations.data', fn ($rows) => collect($rows)->every(fn ($a) => $a['site_id'] === $mySite->id)));

        $this->actingAs($supervisor)->get(route('personnel.index'))
            ->assertInertia(fn ($page) => $page
                ->where('staff.total', 1)
                ->where('staff.data.0.id', $mine->id)
                ->where('counts.all', 1));

        // Une page plus loin ne révèle rien de plus : retour à la seule page de son périmètre
        $this->actingAs($supervisor)->get(route('sites.index', ['page' => 2]))
            ->assertRedirect(route('sites.index', ['page' => 1]));
        $this->actingAs($supervisor)->get(route('tickets.index', ['filtre' => 'all', 'page' => 2]))
            ->assertRedirect(route('tickets.index', ['filtre' => 'all', 'page' => 1]));
    }
}
