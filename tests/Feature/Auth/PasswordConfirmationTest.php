<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PasswordConfirmationTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirm_password_screen_can_be_rendered()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('password.confirm'));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('auth/confirm-password'),
        );
    }

    public function test_the_right_password_unlocks_the_security_page()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('security.edit'))->assertRedirect(route('password.confirm'));

        $this->actingAs($user)->post(route('password.confirm.store'), ['password' => 'password'])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('security.edit'));

        $this->actingAs($user)->get(route('security.edit'))->assertOk();
    }

    public function test_a_hostess_who_logs_in_by_phone_can_confirm_too()
    {
        $hostess = User::factory()->fieldAgent()->create(['email' => null, 'phone' => '+237690000099']);

        $this->actingAs($hostess)->post(route('password.confirm.store'), ['password' => 'password'])->assertSessionHasNoErrors();
        $this->actingAs($hostess)->post(route('password.confirm.store'), ['password' => 'mauvais'])->assertSessionHasErrors('password');
    }

    public function test_password_confirmation_requires_authentication()
    {
        $response = $this->get(route('password.confirm'));

        $response->assertRedirect(route('login'));
    }
}
