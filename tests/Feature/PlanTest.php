<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\AffectationStatus;
use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Company;
use App\Models\User;
use App\Notifications\PlanExpiring;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Forfaits Motriks : fonctions ouvertes, retour en Starter, essai, rappels et limites.
 */
class PlanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    private function managerOn(Plan $plan, ?string $endsOn = null, bool $trial = false): User
    {
        return User::factory()->for(Company::factory()->plan($plan, $endsOn, $trial))->create();
    }

    public function test_starter_opens_the_field_space_only_and_paid_features_say_which_plan_they_need()
    {
        $manager = $this->managerOn(Plan::Starter);

        $this->actingAs($manager)->get(route('reports.index'))->assertInertia(fn ($page) => $page
            ->component('module-locked')
            ->where('plan.current', 'Motriks Starter')
            ->where('plan.needed', 'Motriks Pro'));
        $this->actingAs($manager)->get(route('events.index'))->assertInertia(fn ($page) => $page->component('module-locked'));
        $this->actingAs($manager)->post(route('reports.targets.save'), ['amount' => 1000])->assertForbidden();

        $this->actingAs($manager)->get(route('daily-reports.index'))->assertInertia(fn ($page) => $page->component('daily-reports/index'));
        $this->actingAs($manager)->get(route('sites.index'))->assertInertia(fn ($page) => $page->where('auth.modules', ['terrain'])->where('auth.plan.key', 'starter'));
        $this->actingAs($manager)->get(route('company.subscription'))->assertInertia(fn ($page) => $page
            ->component('company/subscription')
            ->where('plan.label', 'Motriks Starter')
            ->has('plans', 4));
    }

    public function test_a_paid_plan_ends_by_itself_and_the_company_falls_back_to_starter()
    {
        $manager = $this->managerOn(Plan::Pro, today()->addDays(10)->toDateString());

        $this->actingAs($manager)->get(route('reports.index'))->assertInertia(fn ($page) => $page->component('reports/index'));

        $this->travel(11)->days();
        $company = $manager->company->fresh();
        $this->assertSame(Plan::Starter, $company->currentPlan());
        $this->assertSame(Plan::Pro, $company->plan, 'le forfait souscrit reste connu');
        $this->actingAs($manager->fresh())->get(route('reports.index'))->assertInertia(fn ($page) => $page->component('module-locked'));
    }

    public function test_the_super_admin_sets_a_plan_with_packs()
    {
        Notification::fake();
        $admin = User::factory()->superAdmin()->create();
        $manager = $this->managerOn(Plan::Starter);

        $this->actingAs($admin)->put(route('admin.companies.plan.update', $manager->company), [
            'plan' => 'business',
            'ends_on' => today()->addMonth()->toDateString(),
            'extra_packs' => 2,
        ])->assertSessionHasNoErrors();

        $company = $manager->company->fresh();
        $this->assertSame(Plan::Business, $company->currentPlan());
        $this->assertSame(35 + 2 * Plan::PACK_HOSTESSES, $company->planLimits()['hostesses']);
        $this->assertSame(48000 + 2 * Plan::PACK_PRICE, $company->monthlyPrice());
        $this->assertDatabaseHas('audit_logs', ['action' => 'plan.changed', 'company_id' => $company->id]);

        // Un essai a toujours une date de fin, et Starter n'a ni date ni pack
        $this->actingAs($admin)->put(route('admin.companies.plan.update', $company), ['plan' => 'pro', 'trial' => true])->assertSessionHasErrors('ends_on');
        $this->actingAs($admin)->put(route('admin.companies.plan.update', $company), ['plan' => 'starter', 'extra_packs' => 3, 'supervisor_packs' => 2])->assertSessionHasNoErrors();
        $this->assertSame(0, $company->fresh()->plan_extra_packs);
        $this->assertSame(0, $company->fresh()->plan_supervisor_packs);
        $this->assertNull($company->fresh()->plan_ends_on);

        $this->actingAs($manager)->put(route('admin.companies.plan.update', $company), ['plan' => 'entreprise'])->assertForbidden();
    }

    public function test_a_newly_approved_company_gets_a_7_day_business_trial()
    {
        $admin = User::factory()->superAdmin()->create();
        $company = Company::factory()->starter()->create(['status' => AccountStatus::Pending, 'onboarding_completed_at' => now()]);
        User::factory()->create(['company_id' => $company->id]);

        $this->actingAs($admin)->post(route('admin.onboarding.approve', $company))->assertSessionHasNoErrors();

        $company->refresh();
        $this->assertSame(Plan::Business, $company->currentPlan());
        $this->assertTrue($company->plan_trial);
        $this->assertSame(today()->addDays(7)->toDateString(), $company->plan_ends_on->toDateString());
    }

    public function test_the_manager_is_reminded_before_the_plan_ends()
    {
        Notification::fake();
        $manager = $this->managerOn(Plan::Pro, today()->addDays(7)->toDateString());

        $this->artisan('subscriptions:reminders')->assertSuccessful();

        Notification::assertSentTo($manager, PlanExpiring::class);
    }

    /** Données d'un nouveau membre du personnel. */
    private function member(string $role, string $phone): array
    {
        return [
            'name' => 'Nouveau', 'phone' => $phone, 'role' => $role,
            'password' => '12345', 'password_confirmation' => '12345',
        ];
    }

    public function test_the_plans_follow_the_price_list_of_november_2026()
    {
        $this->assertSame([0, 14500, 48000, 88000], array_map(fn (Plan $p) => $p->price(), Plan::cases()));

        $grid = array_map(fn (Plan $p) => array_intersect_key($p->limits(), array_flip(['hostesses', 'sites', 'supervisors'])), Plan::cases());
        $this->assertSame([
            ['hostesses' => 1, 'sites' => 1, 'supervisors' => 0],
            ['hostesses' => 7, 'sites' => 7, 'supervisors' => 2],
            ['hostesses' => 35, 'sites' => 35, 'supervisors' => 6],
            ['hostesses' => 120, 'sites' => 120, 'supervisors' => null],
        ], $grid);

        $this->assertSame(11500, Plan::PACK_PRICE);
        $this->assertSame(1500, Plan::SUPERVISOR_PACK_PRICE);
    }

    public function test_starter_limits_hostesses_sites_and_supervisors_but_not_accountants()
    {
        $manager = $this->managerOn(Plan::Starter);
        $company = $manager->company;

        $company->sites()->create(['name' => 'Site 1', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $manager->id]);
        User::factory()->fieldAgent()->create(['company_id' => $company->id]);

        $this->actingAs($manager)->post(route('sites.store'), ['name' => 'Site 2', 'type' => 'autre', 'city' => 'Douala'])
            ->assertSessionHasErrors('name');
        $this->actingAs($manager)->post(route('personnel.store'), $this->member(Role::FieldAgent->value, '690001001'))->assertSessionHasErrors('role');
        $this->actingAs($manager)->post(route('personnel.store'), $this->member(Role::Supervisor->value, '690001002'))
            ->assertSessionHasErrors(['role' => 'Votre forfait Motriks Starter ne comprend pas de superviseur. Passez à Motriks Pro pour aller plus loin : contactez-nous.']);

        // Les comptables ne sont pas comptés
        $this->actingAs($manager)->post(route('personnel.store'), $this->member(Role::Accountant->value, '690001003'))->assertSessionHasNoErrors();

        $this->assertSame(1, $company->sites()->count());
        $this->assertSame(1, $company->users()->where('role', Role::FieldAgent)->count());
        $this->assertSame(0, $company->users()->where('role', Role::Supervisor)->count());
    }

    public function test_pro_allows_two_supervisors_and_a_supervisor_pack_adds_one()
    {
        $manager = $this->managerOn(Plan::Pro, today()->addMonth()->toDateString());
        $company = $manager->company;

        $this->actingAs($manager)->post(route('personnel.store'), $this->member(Role::Supervisor->value, '690002001'))->assertSessionHasNoErrors();
        $this->actingAs($manager)->post(route('personnel.store'), $this->member(Role::Supervisor->value, '690002002'))->assertSessionHasNoErrors();
        $this->actingAs($manager)->post(route('personnel.store'), $this->member(Role::Supervisor->value, '690002003'))
            ->assertSessionHasErrors(['role' => 'Votre forfait Motriks Pro permet 2 superviseurs, vous les avez atteints. Ajoutez un pack superviseur, ou passez à Motriks Business : contactez-nous.']);

        $company->setPlan(Plan::Pro, today()->addMonth(), supervisorPacks: 1);
        $this->assertSame(3, $company->fresh()->planLimits()['supervisors']);
        $this->assertSame(14500 + Plan::SUPERVISOR_PACK_PRICE, $company->fresh()->monthlyPrice());
        $this->actingAs($manager->fresh())->post(route('personnel.store'), $this->member(Role::Supervisor->value, '690002003'))->assertSessionHasNoErrors();
    }

    public function test_a_hostess_can_not_become_a_supervisor_beyond_the_plan()
    {
        $manager = $this->managerOn(Plan::Starter);
        $hostess = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id, 'phone' => '+237690003001']);

        $this->actingAs($manager)->put(route('personnel.update', $hostess), [
            'name' => $hostess->name, 'phone' => '690003001', 'role' => Role::Supervisor->value, 'status' => 'active',
        ])->assertSessionHasErrors('role');

        $this->assertSame(Role::FieldAgent, $hostess->fresh()->role);
    }

    public function test_entreprise_has_unlimited_supervisors_and_no_supervisor_pack()
    {
        $manager = $this->managerOn(Plan::Entreprise, today()->addMonth()->toDateString());
        $manager->company->setPlan(Plan::Entreprise, today()->addMonth(), supervisorPacks: 3);

        $company = $manager->company->fresh();
        $this->assertNull($company->planLimits()['supervisors']);
        $this->assertSame(0, $company->plan_supervisor_packs);
        $this->assertSame(88000, $company->monthlyPrice());
    }

    public function test_a_hostess_pack_adds_five_hostesses_and_five_sites_to_a_paid_plan()
    {
        $manager = $this->managerOn(Plan::Pro, today()->addMonth()->toDateString());
        $manager->company->update(['plan_extra_packs' => 1]);

        $this->assertSame(12, $manager->company->fresh()->planLimits()['hostesses']);
        $this->assertSame(12, $manager->company->fresh()->planLimits()['sites']);
        $this->assertSame(2, $manager->company->fresh()->planLimits()['supervisors']);
    }

    public function test_photos_per_report_follow_the_plan()
    {
        Storage::fake('local');
        $manager = $this->managerOn(Plan::Starter);
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $site = $manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $manager->id]);
        $affectation = $manager->company->affectations()->create(['site_id' => $site->id, 'user_id' => $agent->id, 'assigned_by' => $manager->id, 'starts_on' => today(), 'status' => AffectationStatus::Active]);
        $this->actingAs($agent)->post(route('terrain.visit.store'), ['affectation_id' => $affectation->id]);
        $visit = $agent->visits()->firstOrFail();

        // Starter : pas de photos
        $this->actingAs($agent)->post(route('terrain.report.photos.store', $visit), ['photo' => UploadedFile::fake()->image('x.jpg')])->assertForbidden();

        // Pro : 2 photos par rapport (l'hôtesse est rechargée, comme à chaque vraie requête)
        $manager->company->setPlan(Plan::Pro, today()->addMonth());
        $agent = $agent->fresh();
        $this->actingAs($agent)->post(route('terrain.report.photos.store', $visit), ['photo' => UploadedFile::fake()->image('a.jpg')])->assertSessionHasNoErrors();
        $this->actingAs($agent)->post(route('terrain.report.photos.store', $visit), ['photo' => UploadedFile::fake()->image('b.jpg')])->assertSessionHasNoErrors();
        $this->actingAs($agent)->post(route('terrain.report.photos.store', $visit), ['photo' => UploadedFile::fake()->image('c.jpg')])->assertSessionHasErrors('photo');
    }

    public function test_pro_allows_one_event_per_month()
    {
        $manager = $this->managerOn(Plan::Pro, today()->addMonth()->toDateString());
        $event = fn (string $name) => ['name' => $name, 'start_date' => today()->toDateString(), 'end_date' => today()->addDays(3)->toDateString()];

        $this->actingAs($manager)->post(route('events.store'), $event('Lancement'))->assertSessionHasNoErrors();
        $this->actingAs($manager)->post(route('events.store'), $event('Deuxième'))->assertSessionHasErrors('name');
    }
}
