<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::registration());
    }

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get(route('register'));

        $response->assertOk();
    }

    public function test_new_users_can_register()
    {
        $response = $this->post(route('register.store'), [
            'company_name' => 'Distribution Dakar',
            'name' => 'Test User',
            'email' => 'Test@Example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));

        $user = User::firstWhere('email', 'test@example.com');
        $this->assertSame(Role::CompanyAdmin, $user->role);
        $this->assertSame('Distribution Dakar', $user->company->name);
        $this->assertSame('distribution-dakar', $user->company->slug);
        $this->assertDatabaseHas('audit_logs', ['action' => 'company.registered', 'company_id' => $user->company_id]);
    }

    public function test_registration_requires_a_company_name()
    {
        $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors('company_name');

        $this->assertGuest();
    }
}
