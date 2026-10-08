<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{Role, string}>
     */
    public static function homeRoutes(): array
    {
        return [
            'super admin' => [Role::SuperAdmin, 'admin.dashboard'],
            'company admin' => [Role::CompanyAdmin, 'dashboard'],
            'supervisor' => [Role::Supervisor, 'dashboard'],
            'field agent' => [Role::FieldAgent, 'terrain.home'],
            'accountant' => [Role::Accountant, 'dashboard'],
        ];
    }

    #[DataProvider('homeRoutes')]
    public function test_users_are_redirected_to_the_home_of_their_role_after_login(Role $role, string $home)
    {
        $user = User::factory()->role($role)->create(['email' => 'user@example.com', 'email_verified_at' => now()]);

        $response = $this->post(route('login.store'), [
            'login' => 'user@example.com',
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route($home, absolute: false));
    }

    #[DataProvider('homeRoutes')]
    public function test_users_can_only_open_the_home_of_their_role(Role $role, string $home)
    {
        $user = User::factory()->role($role)->create();

        foreach (['admin.dashboard', 'dashboard', 'terrain.home'] as $route) {
            $this->actingAs($user)->get(route($route))->assertStatus($route === $home ? 200 : 403);
        }
    }

    #[DataProvider('homeRoutes')]
    public function test_logged_in_users_visiting_the_login_page_are_sent_to_their_home(Role $role, string $home)
    {
        $user = User::factory()->role($role)->create();

        $this->actingAs($user)->get(route('login'))->assertRedirect(route($home, absolute: false));
    }

    public function test_passkey_logins_are_sent_to_the_home_of_the_role()
    {
        $user = User::factory()->fieldAgent()->create();
        $request = request();
        $request->setUserResolver(fn () => $user);
        $request->setLaravelSession(app('session.store'));

        $response = app(PasskeyLoginResponseContract::class)->toResponse($request);

        $this->assertSame(route('terrain.home'), $response->getTargetUrl());
    }

    public function test_the_role_and_company_are_shared_with_the_frontend()
    {
        $user = User::factory()->supervisor()->create();

        $this->actingAs($user)->get(route('dashboard'))->assertInertia(fn ($page) => $page
            ->where('auth.user.role', 'supervisor')
            ->where('auth.company.name', $user->company->name),
        );
    }
}
