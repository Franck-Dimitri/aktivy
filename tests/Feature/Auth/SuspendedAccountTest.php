<?php

namespace Tests\Feature\Auth;

use App\Enums\AccountStatus;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuspendedAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_suspended_users_can_not_log_in()
    {
        $user = User::factory()->suspended()->create();

        $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'password',
        ])->assertSessionHasErrors('login');

        $this->assertGuest();
    }

    public function test_users_of_a_suspended_company_can_not_log_in()
    {
        $user = User::factory()->for(Company::factory()->suspended())->create();

        $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'password',
        ])->assertSessionHasErrors('login');

        $this->assertGuest();
    }

    public function test_users_are_logged_out_when_their_account_gets_suspended()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();

        $user->update(['status' => AccountStatus::Suspended]);

        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_archived_users_can_not_log_in()
    {
        $user = User::factory()->create();
        $user->delete();

        $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'password',
        ])->assertSessionHasErrors('login');

        $this->assertGuest();
    }
}
