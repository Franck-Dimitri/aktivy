<?php

namespace Tests\Feature\Settings;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Le seul gérant d'une entreprise (et le dernier administrateur de la plateforme) ne peut pas supprimer
 * son compte : l'entreprise resterait sans responsable.
 */
class AccountDeletionGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_only_manager_cannot_delete_their_account()
    {
        $manager = User::factory()->create(); // gérant, seul dans son entreprise

        $this->actingAs($manager)->get(route('profile.edit'))
            ->assertInertia(fn (Assert $page) => $page->where('deletionBlocker', fn ($reason) => str_contains($reason, 'seul gérant')));

        $this->actingAs($manager)->from(route('profile.edit'))
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasErrors('account')
            ->assertRedirect(route('profile.edit'));

        $this->assertAuthenticatedAs($manager);
        $this->assertNotSoftDeleted($manager);
    }

    public function test_a_manager_can_leave_when_another_active_manager_remains()
    {
        $manager = User::factory()->create();
        User::factory()->create(['company_id' => $manager->company_id, 'role' => Role::CompanyAdmin]);

        $this->actingAs($manager)->get(route('profile.edit'))
            ->assertInertia(fn (Assert $page) => $page->where('deletionBlocker', null));

        $this->actingAs($manager)->delete(route('profile.destroy'), ['password' => 'password'])->assertSessionHasNoErrors();
        $this->assertSoftDeleted($manager);
    }

    public function test_a_suspended_co_manager_does_not_count()
    {
        $manager = User::factory()->create();
        User::factory()->create(['company_id' => $manager->company_id, 'role' => Role::CompanyAdmin, 'status' => AccountStatus::Suspended]);

        $this->actingAs($manager)->delete(route('profile.destroy'), ['password' => 'password'])->assertSessionHasErrors('account');
        $this->assertNotSoftDeleted($manager);
    }

    public function test_the_last_platform_admin_cannot_delete_their_account()
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->delete(route('profile.destroy'), ['password' => 'password'])->assertSessionHasErrors('account');
        $this->assertNotSoftDeleted($admin);

        User::factory()->superAdmin()->create();
        $this->actingAs($admin)->delete(route('profile.destroy'), ['password' => 'password'])->assertSessionHasNoErrors();
        $this->assertSoftDeleted($admin);
    }
}
