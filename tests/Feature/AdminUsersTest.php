<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\AffectationStatus;
use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Company;
use App\Models\SiteProduct;
use App\Models\User;
use App\Notifications\Auth\QueuedVerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Administration : tous les comptes des entreprises (recherche, modification, suspension,
 * suppression douce et restauration) et catalogue des produits sur la fiche entreprise.
 */
class AdminUsersTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->admin = User::factory()->superAdmin()->create();
        $this->manager = User::factory()->create(['name' => 'Paul Gérant']);
    }

    public function test_the_admin_lists_and_filters_the_accounts_of_every_company()
    {
        $hostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id, 'name' => 'Awa Ngono', 'phone' => '+237690112233']);
        User::factory()->fieldAgent()->create(); // autre entreprise
        User::factory()->supervisor()->create(['company_id' => $this->manager->company_id])->delete();

        $this->actingAs($this->admin)->get(route('admin.users.index'))
            ->assertInertia(fn ($page) => $page->component('admin/users/index')
                ->where('users.total', 4) // gérant, 2 hôtesses, superviseur supprimé ; pas le super administrateur
                ->where('counts.hostesses', 2)
                ->where('counts.deleted', 1));

        $this->actingAs($this->admin)->get(route('admin.users.index', ['q' => '112233']))
            ->assertInertia(fn ($page) => $page->where('users.total', 1)->where('users.data.0.id', $hostess->id));

        $this->actingAs($this->admin)->get(route('admin.users.index', ['company' => $this->manager->company_id, 'role' => 'field_agent']))
            ->assertInertia(fn ($page) => $page->where('users.total', 1)->where('users.data.0.company.id', $this->manager->company_id));

        $this->actingAs($this->admin)->get(route('admin.users.index', ['status' => 'deleted']))
            ->assertInertia(fn ($page) => $page->where('users.total', 1)->where('users.data.0.status', 'deleted'));

        $this->actingAs($this->manager)->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_the_admin_edits_a_hostess_and_changes_a_role_within_the_plan_limits()
    {
        Notification::fake();
        $hostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);

        $this->actingAs($this->admin)->put(route('admin.users.update', $hostess), [
            'name' => 'Awa Ngono', 'email' => 'Awa@Illiko.cm', 'phone' => '690 44 55 66', 'role' => 'supervisor',
        ])->assertSessionHasNoErrors();

        $hostess->refresh();
        $this->assertSame('awa@illiko.cm', $hostess->email);
        $this->assertSame('+237690445566', $hostess->phone);
        $this->assertSame(Role::Supervisor, $hostess->role);
        Notification::assertSentTo($hostess, QueuedVerifyEmail::class);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.updated_by_admin', 'company_id' => $this->manager->company_id]);

        // Starter : aucun superviseur ; les comptables, eux, ne sont pas comptés
        $this->manager->company->update(['plan' => Plan::Starter]);
        $other = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $this->actingAs($this->admin)->put(route('admin.users.update', $other), [
            'name' => $other->name, 'phone' => $other->phone, 'role' => 'supervisor',
        ])->assertSessionHasErrors('role');
        $this->actingAs($this->admin)->put(route('admin.users.update', $other), [
            'name' => $other->name, 'phone' => $other->phone, 'role' => 'accountant',
        ])->assertSessionHasNoErrors();

        // Sans e-mail ni téléphone, impossible de se connecter
        $this->actingAs($this->admin)->put(route('admin.users.update', $other), [
            'name' => $other->name, 'role' => 'field_agent',
        ])->assertSessionHasErrors('phone');
    }

    public function test_a_manager_keeps_his_role_and_his_email()
    {
        $this->actingAs($this->admin)->put(route('admin.users.update', $this->manager), [
            'name' => 'X', 'email' => $this->manager->email, 'role' => 'field_agent',
        ])->assertSessionHasErrors('role');

        $this->actingAs($this->admin)->put(route('admin.users.update', $this->manager), [
            'name' => 'X', 'email' => '',
        ])->assertSessionHasErrors('email');

        $this->actingAs($this->admin)->put(route('admin.users.update', $this->admin), [
            'name' => 'X', 'email' => 'x@y.cm',
        ])->assertNotFound();
    }

    public function test_the_admin_suspends_reactivates_deletes_and_restores_an_account()
    {
        $hostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $site = $this->manager->company->sites()->create(['name' => 'Santa Lucia Odza', 'type' => 'supermarche', 'city' => 'Yaoundé', 'created_by' => $this->manager->id]);
        $affectation = $this->manager->company->affectations()->create([
            'site_id' => $site->id, 'user_id' => $hostess->id, 'starts_on' => today(), 'assigned_by' => $this->manager->id, 'status' => AffectationStatus::Active,
        ]);

        $this->actingAs($this->admin)->post(route('admin.users.suspend', $hostess))->assertSessionHasNoErrors();
        $this->assertSame(AccountStatus::Suspended, $hostess->fresh()->status);

        $this->actingAs($this->admin)->post(route('admin.users.reactivate', $hostess));
        $this->assertSame(AccountStatus::Active, $hostess->fresh()->status);

        $this->actingAs($this->admin)->delete(route('admin.users.destroy', $hostess));
        $this->assertSoftDeleted($hostess);
        $this->assertSame(AffectationStatus::Completed, $affectation->fresh()->status);

        $this->actingAs($this->admin)->post(route('admin.users.restore', $hostess->uuid));
        $this->assertNotSoftDeleted($hostess);

        foreach (['suspended', 'reactivated', 'deleted', 'restored'] as $action) {
            $this->assertDatabaseHas('audit_logs', ['action' => "user.{$action}_by_admin"]);
        }
    }

    public function test_the_only_manager_of_a_company_cannot_be_deleted()
    {
        $this->actingAs($this->admin)->delete(route('admin.users.destroy', $this->manager))->assertSessionHas('error');
        $this->assertNotSoftDeleted($this->manager);

        $second = User::factory()->create(['company_id' => $this->manager->company_id]);
        $this->actingAs($this->admin)->delete(route('admin.users.destroy', $second));
        $this->assertSoftDeleted($second);
    }

    public function test_the_company_sheet_shows_its_products_with_their_stock()
    {
        $company = $this->manager->company;
        $site = $company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);
        $product = $company->products()->create(['name' => 'Moringa', 'unit' => 'sachet', 'price' => 3000]);
        SiteProduct::create(['company_id' => $company->id, 'site_id' => $site->id, 'product_id' => $product->id, 'current_stock' => 4, 'alert_threshold' => 5, 'critical_threshold' => 2]);
        Company::factory()->create()->products()->create(['name' => 'Autre', 'unit' => 'pièce']);

        $this->actingAs($this->admin)->get(route('admin.companies.show', $company))
            ->assertInertia(fn ($page) => $page
                ->has('products', 1)
                ->where('products.0.name', 'Moringa')
                ->where('products.0.price', 3000)
                ->where('products.0.sites_count', 1)
                ->where('products.0.total_stock', 4)
                ->where('products.0.low_count', 1));
    }
}
