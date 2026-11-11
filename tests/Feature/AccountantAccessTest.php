<?php

namespace Tests\Feature;

use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Le comptable suit toute l'entreprise, en lecture : tous les sites et le catalogue, sans rien modifier.
 */
class AccountantAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $accountant;

    private Site $site;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->manager = User::factory()->create();
        $this->accountant = User::factory()->accountant()->create(['company_id' => $this->manager->company_id]);

        foreach (['Akwa', 'Bonapriso'] as $name) {
            $this->site = $this->manager->company->sites()->create(['name' => $name, 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);
        }
        $this->manager->company->products()->create(['name' => 'Savon', 'unit' => 'pièce', 'price' => 500]);
    }

    public function test_the_accountant_sees_every_site_and_the_catalogue()
    {
        $this->actingAs($this->accountant)->get(route('sites.index'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('sites/index')
            ->has('sites', 2)
            ->where('auth.can.manageTeam', false));

        $this->actingAs($this->accountant)->get(route('sites.show', $this->site))->assertOk()->assertInertia(fn ($page) => $page
            ->component('sites/show')
            ->where('site.name', 'Bonapriso'));

        $this->actingAs($this->accountant)->get(route('products.index'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('products/index')
            ->has('products', 1));
    }

    public function test_the_accountant_can_not_change_anything()
    {
        $this->actingAs($this->accountant)->get(route('sites.create'))->assertForbidden();
        $this->actingAs($this->accountant)->post(route('sites.store'), ['name' => 'Nouveau', 'type' => 'autre', 'city' => 'Douala'])->assertForbidden();
        $this->actingAs($this->accountant)->put(route('sites.update', $this->site), ['name' => 'Renommé', 'type' => 'autre', 'city' => 'Douala'])->assertForbidden();
        $this->actingAs($this->accountant)->delete(route('sites.destroy', $this->site))->assertForbidden();
        $this->actingAs($this->accountant)->post(route('products.store'), ['name' => 'Lait', 'unit' => 'boîte'])->assertForbidden();

        $this->assertSame(2, $this->manager->company->sites()->count());
        $this->assertSame('Bonapriso', $this->site->fresh()->name);
    }

    public function test_the_manager_still_opens_the_new_site_page()
    {
        // « sites/create » ne doit pas être pris pour la fiche d'un site
        $this->actingAs($this->manager)->get(route('sites.create'))->assertOk()->assertInertia(fn ($page) => $page->component('sites/create'));
        $this->actingAs($this->manager)->get(route('products.create'))->assertOk();
    }
}
