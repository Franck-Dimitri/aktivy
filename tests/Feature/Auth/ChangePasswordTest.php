<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_with_a_temporary_password_are_sent_to_the_change_password_page()
    {
        $user = User::factory()->fieldAgent()->mustChangePassword()->create();

        $this->actingAs($user)->get(route('terrain.home'))->assertRedirect(route('password.change'));
        $this->actingAs($user)->get(route('password.change'))->assertOk();
    }

    public function test_users_can_replace_their_temporary_password()
    {
        $user = User::factory()->fieldAgent()->mustChangePassword()->create();

        $this->actingAs($user)->put(route('password.change.update'), [
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertRedirect(route('terrain.home', absolute: false));

        $user->refresh();
        $this->assertFalse($user->must_change_password);
        $this->assertTrue(Hash::check('new-password', $user->password));
        $this->actingAs($user)->get(route('terrain.home'))->assertOk();
    }

    public function test_the_new_password_must_differ_from_the_temporary_one()
    {
        $user = User::factory()->mustChangePassword()->create();

        $this->actingAs($user)->put(route('password.change.update'), [
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors('password');

        $this->assertTrue($user->refresh()->must_change_password);
    }

    public function test_users_without_a_temporary_password_are_sent_home()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('password.change'))->assertRedirect(route('dashboard', absolute: false));
    }
}
