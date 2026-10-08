<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_company_users_only_see_the_records_of_their_company()
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        AuditLog::record('test.action', $alice, actor: $alice);
        AuditLog::record('test.action', $bob, actor: $bob);

        $this->actingAs($alice);

        $this->assertSame([$alice->company_id], AuditLog::pluck('company_id')->unique()->values()->all());
    }

    public function test_records_created_by_a_company_user_belong_to_their_company()
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $log = AuditLog::create(['action' => 'test.action']);

        $this->assertSame($user->company_id, $log->company_id);
    }

    public function test_the_super_admin_sees_every_company()
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        AuditLog::record('test.action', $alice, actor: $alice);
        AuditLog::record('test.action', $bob, actor: $bob);

        $this->actingAs(User::factory()->superAdmin()->create());

        $this->assertSame(2, AuditLog::where('action', 'test.action')->count());
    }
}
