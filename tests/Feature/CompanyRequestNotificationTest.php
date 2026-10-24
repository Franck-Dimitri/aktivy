<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\Company;
use App\Models\User;
use App\Notifications\CompanyApproved;
use App\Notifications\CompanyRejected;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CompanyRequestNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function pendingCompany(): array
    {
        $company = Company::factory()->create([
            'status' => AccountStatus::Pending,
            'onboarding_completed_at' => now(),
        ]);
        $manager = User::factory()->for($company)->role(Role::CompanyAdmin)->create();

        return [$company, $manager];
    }

    public function test_approving_a_company_emails_its_manager()
    {
        Notification::fake();
        [$company, $manager] = $this->pendingCompany();

        $this->actingAs(User::factory()->superAdmin()->create())
            ->post(route('admin.onboarding.approve', $company))
            ->assertRedirect(route('admin.onboarding.index'));

        $this->assertSame(AccountStatus::Active, $company->fresh()->status);
        Notification::assertSentTo($manager, CompanyApproved::class);
    }

    public function test_rejecting_a_company_emails_its_manager_with_the_reason()
    {
        Notification::fake();
        [$company, $manager] = $this->pendingCompany();

        $this->actingAs(User::factory()->superAdmin()->create())
            ->post(route('admin.onboarding.reject', $company), ['reason' => 'Pièce d’identité illisible.'])
            ->assertRedirect(route('admin.onboarding.index'));

        $this->assertSame(AccountStatus::Rejected, $company->fresh()->status);
        Notification::assertSentTo(
            $manager,
            CompanyRejected::class,
            fn (CompanyRejected $n) => $n->reason === 'Pièce d’identité illisible.',
        );
    }
}
