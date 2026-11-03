<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\Site;
use App\Models\User;
use App\Models\WeeklyTarget;
use App\Notifications\WeeklyTargetSet;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Objectifs hebdomadaires des hôtesses : facultatifs, fixés par le gérant ou leur superviseur.
 */
class WeeklyTargetTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $supervisor;

    private User $myHostess;

    private User $otherHostess;

    private string $monday;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();

        // Un mercredi : la semaine va du lundi 2 au dimanche 8 novembre
        $this->travelTo(CarbonImmutable::parse('2026-11-04 10:00'));
        $this->monday = '2026-11-02';

        $this->manager = User::factory()->create();
        $this->supervisor = User::factory()->supervisor()->create(['company_id' => $this->manager->company_id]);
        $mySite = $this->site('Akwa');
        $otherSite = $this->site('Bonapriso');
        $this->myHostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id, 'name' => 'Awa']);
        $this->otherHostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id, 'name' => 'Brenda']);

        $this->assign($this->supervisor, $mySite);
        $this->assign($this->myHostess, $mySite);
        $this->assign($this->otherHostess, $otherSite);
    }

    private function site(string $name): Site
    {
        return $this->manager->company->sites()->create(['name' => $name, 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);
    }

    private function assign(User $member, Site $site): void
    {
        $this->manager->company->affectations()->create([
            'site_id' => $site->id,
            'user_id' => $member->id,
            'assigned_by' => $this->manager->id,
            'starts_on' => now()->subWeek()->toDateString(),
            'status' => AffectationStatus::Active,
        ]);
    }

    public function test_the_dashboard_offers_to_set_the_weekly_targets()
    {
        $this->actingAs($this->manager)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('weekly_targets.week_start', $this->monday)
                ->where('weekly_targets.hostesses', 2)
                ->where('weekly_targets.with_target', 0));
    }

    public function test_a_manager_sets_targets_and_leaves_others_empty()
    {
        Notification::fake();

        $this->actingAs($this->manager)->post(route('weekly-targets.store'), [
            'week_start' => $this->monday,
            'targets' => [
                ['user_id' => $this->myHostess->id, 'amount' => 150000],
                ['user_id' => $this->otherHostess->id, 'amount' => null],
            ],
        ])->assertSessionHasNoErrors();

        $this->assertSame(150000, WeeklyTarget::where('user_id', $this->myHostess->id)->value('amount'));
        $this->assertFalse(WeeklyTarget::where('user_id', $this->otherHostess->id)->exists());

        // Seule l'hôtesse qui a reçu un objectif est prévenue
        Notification::assertSentTo($this->myHostess, WeeklyTargetSet::class);
        Notification::assertNotSentTo($this->otherHostess, WeeklyTargetSet::class);
    }

    public function test_an_empty_amount_removes_the_target_and_an_unchanged_one_does_not_notify_again()
    {
        WeeklyTarget::create(['company_id' => $this->manager->company_id, 'user_id' => $this->myHostess->id, 'week_start' => $this->monday, 'amount' => 100000]);
        WeeklyTarget::create(['company_id' => $this->manager->company_id, 'user_id' => $this->otherHostess->id, 'week_start' => $this->monday, 'amount' => 80000]);
        Notification::fake();

        $this->actingAs($this->manager)->post(route('weekly-targets.store'), [
            'week_start' => $this->monday,
            'targets' => [
                ['user_id' => $this->myHostess->id, 'amount' => 100000],
                ['user_id' => $this->otherHostess->id, 'amount' => null],
            ],
        ])->assertSessionHasNoErrors();

        $this->assertTrue(WeeklyTarget::where('user_id', $this->myHostess->id)->exists());
        $this->assertFalse(WeeklyTarget::where('user_id', $this->otherHostess->id)->exists());
        Notification::assertNothingSent();
    }

    public function test_a_supervisor_only_sees_and_sets_the_targets_of_his_hostesses()
    {
        $this->actingAs($this->supervisor)->getJson(route('weekly-targets.show'))
            ->assertOk()
            ->assertJsonCount(1, 'hostesses')
            ->assertJsonPath('hostesses.0.name', 'Awa')
            ->assertJsonPath('hostesses.0.sites.0', 'Akwa');

        $this->actingAs($this->supervisor)->post(route('weekly-targets.store'), [
            'week_start' => $this->monday,
            'targets' => [['user_id' => $this->otherHostess->id, 'amount' => 50000]],
        ])->assertForbidden();

        $this->assertFalse(WeeklyTarget::exists());
    }

    public function test_only_this_week_and_the_next_one_can_be_set()
    {
        $this->actingAs($this->manager)->post(route('weekly-targets.store'), [
            'week_start' => '2026-10-26',
            'targets' => [['user_id' => $this->myHostess->id, 'amount' => 50000]],
        ])->assertSessionHasErrors('week_start');

        $this->actingAs($this->manager)->post(route('weekly-targets.store'), [
            'week_start' => '2026-11-09',
            'targets' => [['user_id' => $this->myHostess->id, 'amount' => 50000]],
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->manager)->getJson(route('weekly-targets.show', ['week' => 'next']))
            ->assertJsonPath('week_start', '2026-11-09')
            ->assertJsonPath('hostesses.0.target', 50000);
    }

    public function test_hostesses_and_accountants_can_not_set_targets()
    {
        $accountant = User::factory()->accountant()->create(['company_id' => $this->manager->company_id]);

        $this->actingAs($this->myHostess)->getJson(route('weekly-targets.show'))->assertForbidden();
        $this->actingAs($accountant)->getJson(route('weekly-targets.show'))->assertForbidden();
    }

    public function test_the_hostess_sees_her_weekly_target_on_her_home()
    {
        WeeklyTarget::create(['company_id' => $this->manager->company_id, 'user_id' => $this->myHostess->id, 'week_start' => $this->monday, 'amount' => 120000]);

        $this->actingAs($this->myHostess)->get(route('terrain.home'))
            ->assertInertia(fn ($page) => $page
                ->where('my_week_target.target', 120000)
                ->where('my_week_target.day', 3)
                ->where('my_week_target.days_left', 4));

        $this->actingAs($this->otherHostess)->get(route('terrain.home'))
            ->assertInertia(fn ($page) => $page->where('my_week_target', null));
    }
}
