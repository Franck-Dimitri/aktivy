<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Enums\Role;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Le superviseur ne pilote que les points de vente où il est affecté.
 */
class SupervisorScopeTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $supervisor;

    private Site $mySite;

    private Site $otherSite;

    private User $myHostess;

    private User $otherHostess;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();

        $this->manager = User::factory()->create();
        $this->supervisor = User::factory()->supervisor()->create(['company_id' => $this->manager->company_id]);
        $this->mySite = $this->site('Akwa');
        $this->otherSite = $this->site('Bonapriso');
        $this->myHostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $this->otherHostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);

        $this->assign($this->supervisor, $this->mySite);
        $this->assign($this->myHostess, $this->mySite);
        $this->assign($this->otherHostess, $this->otherSite);
    }

    private function site(string $name): Site
    {
        return $this->manager->company->sites()->create([
            'name' => $name,
            'type' => 'autre',
            'city' => 'Douala',
            'created_by' => $this->manager->id,
        ]);
    }

    private function assign(User $member, Site $site): void
    {
        $this->manager->company->affectations()->create([
            'site_id' => $site->id,
            'user_id' => $member->id,
            'assigned_by' => $this->manager->id,
            'starts_on' => now()->toDateString(),
            'status' => AffectationStatus::Active,
        ]);
    }

    public function test_a_supervisor_only_sees_his_own_sites()
    {
        $this->actingAs($this->supervisor)->get(route('sites.index'))
            ->assertInertia(fn ($page) => $page
                ->has('sites', 1)
                ->where('sites.0.id', $this->mySite->id));

        $this->actingAs($this->supervisor)->get(route('sites.show', $this->mySite))->assertOk();
        $this->actingAs($this->supervisor)->get(route('sites.show', $this->otherSite))->assertForbidden();
    }

    public function test_creating_sites_products_and_events_is_left_to_the_manager()
    {
        $this->actingAs($this->supervisor)->post(route('sites.store'), ['name' => 'X', 'type' => 'autre', 'city' => 'Douala'])->assertForbidden();
        $this->actingAs($this->supervisor)->delete(route('sites.destroy', $this->mySite))->assertForbidden();
        $this->actingAs($this->supervisor)->get(route('products.index'))->assertForbidden();
        $this->actingAs($this->supervisor)->get(route('events.index'))->assertForbidden();
    }

    public function test_a_supervisor_manages_the_hostesses_of_his_sites_and_unassigned_ones_only()
    {
        $unassigned = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);

        $this->actingAs($this->supervisor)->get(route('personnel.index'))
            ->assertInertia(fn ($page) => $page
                ->has('staff', 2)
                ->where('roles', [['value' => Role::FieldAgent->value, 'label' => Role::FieldAgent->label()]]));

        $this->actingAs($this->supervisor)->get(route('personnel.show', $unassigned))->assertOk();
        $this->actingAs($this->supervisor)->get(route('personnel.show', $this->otherHostess))->assertForbidden();
    }

    public function test_a_supervisor_can_not_create_another_supervisor()
    {
        $this->actingAs($this->supervisor)->post(route('personnel.store'), [
            'name' => 'Chef',
            'phone' => '690000077',
            'role' => Role::Supervisor->value,
            'password' => 'Motriks-2026!',
            'password_confirmation' => 'Motriks-2026!',
        ])->assertSessionHasErrors('role');
    }

    public function test_a_supervisor_can_not_assign_a_hostess_to_a_site_he_does_not_supervise()
    {
        $this->actingAs($this->supervisor)->post(route('affectations.store'), [
            'site_id' => $this->otherSite->id,
            'user_id' => $this->myHostess->id,
            'starts_on' => now()->toDateString(),
        ])->assertForbidden();
    }

    public function test_reports_and_targets_are_limited_to_the_supervisors_sites()
    {
        $this->actingAs($this->supervisor)->get(route('reports.index'))
            ->assertInertia(fn ($page) => $page
                ->where('targets.global', null)
                ->has('targets.sites', 1)
                ->has('targets.hostesses', 1)
                ->where('targets.hostesses.0.user_id', $this->myHostess->id));

        $this->actingAs($this->supervisor)->get(route('daily-reports.index'))
            ->assertInertia(fn ($page) => $page
                ->has('missing', 1)
                ->where('missing.0.user_id', $this->myHostess->id));

        $this->actingAs($this->supervisor)
            ->post(route('reports.targets.save'), ['user_id' => $this->myHostess->id, 'amount' => 50000])
            ->assertSessionHasNoErrors();
        $this->actingAs($this->supervisor)
            ->post(route('reports.targets.save'), ['user_id' => $this->otherHostess->id, 'amount' => 50000])
            ->assertForbidden();
        $this->actingAs($this->supervisor)
            ->post(route('reports.targets.save'), ['amount' => 50000])
            ->assertForbidden();
    }

    public function test_a_supervisor_without_any_site_is_told_so()
    {
        $idle = User::factory()->supervisor()->create(['company_id' => $this->manager->company_id]);

        $this->actingAs($idle)->get(route('daily-reports.index'))
            ->assertInertia(fn ($page) => $page
                ->where('auth.noSite', true)
                ->where('has_scope', false));

        $this->actingAs($idle)->get(route('sites.index'))
            ->assertInertia(fn ($page) => $page->has('sites', 0));
    }

    public function test_the_manager_still_sees_everything()
    {
        $this->actingAs($this->manager)->get(route('sites.index'))
            ->assertInertia(fn ($page) => $page->has('sites', 2)->where('auth.noSite', false));

        $this->actingAs($this->manager)->get(route('reports.index'))
            ->assertInertia(fn ($page) => $page->has('targets.hostesses', 2)->whereNot('targets.global', null));
    }
}
