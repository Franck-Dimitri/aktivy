<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_changes_are_audited()
    {
        $admin = User::factory()->create();
        $user = User::factory()->for($admin->company)->fieldAgent()->create();

        $this->actingAs($admin);
        $user->update(['role' => Role::Supervisor]);

        $log = AuditLog::firstWhere('action', 'user.role_changed');
        $this->assertSame($admin->id, $log->user_id);
        $this->assertTrue($log->auditable->is($user));
        $this->assertSame(['role' => 'field_agent'], $log->old_values);
        $this->assertSame(['role' => 'supervisor'], $log->new_values);
    }

    public function test_successful_logins_are_recorded()
    {
        $user = User::factory()->create();

        $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'password',
        ]);

        $this->assertNotNull($user->refresh()->last_login_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.login', 'user_id' => $user->id]);
    }

    public function test_failed_logins_on_an_existing_account_are_recorded()
    {
        $user = User::factory()->create();

        $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login_failed',
            'auditable_id' => $user->id,
            'company_id' => $user->company_id,
        ]);
    }
}
