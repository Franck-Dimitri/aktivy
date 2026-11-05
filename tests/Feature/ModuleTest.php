<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\AffectationStatus;
use App\Enums\Module;
use App\Models\Company;
use App\Models\CompanyModule;
use App\Models\User;
use App\Notifications\ModuleExpiring;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    private function freeCompanyManager(): User
    {
        return User::factory()->for(Company::factory()->withoutModules())->create();
    }

    public function test_paid_features_are_locked_without_the_module_and_the_free_base_stays_open()
    {
        $manager = $this->freeCompanyManager();

        $this->actingAs($manager)->get(route('reports.index'))->assertInertia(fn ($page) => $page->component('module-locked'));
        $this->actingAs($manager)->get(route('daily-reports.index'))->assertInertia(fn ($page) => $page->component('module-locked'));
        $this->actingAs($manager)->get(route('events.index'))->assertInertia(fn ($page) => $page->component('module-locked'));
        $this->actingAs($manager)->post(route('reports.targets.save'), ['amount' => 1000])->assertForbidden();

        $this->actingAs($manager)->get(route('sites.index'))->assertInertia(fn ($page) => $page->component('sites/index')->where('auth.modules', []));
        $this->actingAs($manager)->get(route('company.subscription'))->assertInertia(fn ($page) => $page->component('company/subscription')->where('modules.0.active', false));
    }

    public function test_the_hostess_space_needs_the_field_module()
    {
        $manager = $this->freeCompanyManager();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);

        $this->actingAs($agent)->get(route('terrain.home'))->assertInertia(fn ($page) => $page->component('module-locked'));
        $this->actingAs($agent)->post(route('terrain.visit.store'), ['affectation_id' => 1])->assertForbidden();
    }

    public function test_the_super_admin_activates_a_module_until_a_date_and_it_expires_by_itself()
    {
        $admin = User::factory()->superAdmin()->create();
        $manager = $this->freeCompanyManager();

        $this->actingAs($admin)->put(route('admin.companies.modules.update', [$manager->company, 'reporting']), [
            'ends_on' => today()->addDays(10)->toDateString(),
        ])->assertSessionHasNoErrors();

        $this->actingAs($manager->fresh())->get(route('reports.index'))->assertInertia(fn ($page) => $page->component('reports/index'));

        // Onze jours plus tard : retour à l'offre gratuite, sans rien supprimer
        $this->travel(11)->days();
        $this->actingAs($manager->fresh())->get(route('reports.index'))->assertInertia(fn ($page) => $page->component('module-locked'));
        $this->assertSame(1, CompanyModule::count());

        $this->actingAs($admin)->delete(route('admin.companies.modules.destroy', [$manager->company, 'reporting']))->assertSessionHasNoErrors();
        $this->assertSame(0, CompanyModule::count());
        $this->actingAs($manager)->put(route('admin.companies.modules.update', [$manager->company, 'reporting']), [])->assertForbidden();
    }

    public function test_a_newly_approved_company_gets_a_14_day_trial_of_every_module()
    {
        $admin = User::factory()->superAdmin()->create();
        $company = Company::factory()->withoutModules()->create(['status' => AccountStatus::Pending, 'onboarding_completed_at' => now()]);
        User::factory()->create(['company_id' => $company->id]);

        $this->actingAs($admin)->post(route('admin.onboarding.approve', $company))->assertSessionHasNoErrors();

        $modules = $company->modules()->get();
        $this->assertCount(count(Module::cases()), $modules);
        $this->assertTrue($modules->every(fn ($m) => $m->is_trial && $m->ends_on->toDateString() === today()->addDays(14)->toDateString()));
    }

    public function test_the_manager_is_reminded_before_a_module_ends()
    {
        Notification::fake();
        $manager = $this->freeCompanyManager();
        $manager->company->modules()->create(['module' => 'stocks', 'starts_on' => today()->subMonth(), 'ends_on' => today()->addDays(7)]);

        $this->artisan('subscriptions:reminders')->assertSuccessful();

        Notification::assertSentTo($manager, ModuleExpiring::class);
    }

    public function test_the_menu_hides_modules_the_company_does_not_have()
    {
        $manager = $this->freeCompanyManager();
        $manager->company->modules()->create(['module' => 'stocks', 'starts_on' => today()]);

        $this->actingAs($manager)->get(route('dashboard'))->assertInertia(fn ($page) => $page->where('auth.modules', ['stocks']));
    }

    public function test_photos_need_their_own_module()
    {
        $manager = User::factory()->create();
        $manager->company->modules()->where('module', 'photos')->delete();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $site = $manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $manager->id]);
        $affectation = $manager->company->affectations()->create(['site_id' => $site->id, 'user_id' => $agent->id, 'assigned_by' => $manager->id, 'starts_on' => today(), 'status' => AffectationStatus::Active]);
        $this->actingAs($agent)->post(route('terrain.visit.store'), ['affectation_id' => $affectation->id]);
        $visit = $agent->visits()->firstOrFail();

        $this->actingAs($agent)->post(route('terrain.report.photos.store', $visit), ['photo' => \Illuminate\Http\UploadedFile::fake()->image('x.jpg')])->assertForbidden();
    }
}
