<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Models\SalesTarget;
use App\Models\User;
use App\Models\WeeklyTarget;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Objectifs reconduits : fixés une fois, ils restent en place les semaines (ou mois) suivantes
 * jusqu'à un changement ou un retrait, sans toucher à l'historique.
 */
class StandingTargetsTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $hostess;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Notification::fake();

        // Mercredi 4 novembre 2026 : semaine du lundi 2
        $this->travelTo(CarbonImmutable::parse('2026-11-04 10:00'));

        $this->manager = User::factory()->create();
        $this->hostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id]);
        $site = $this->manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);
        $this->manager->company->affectations()->create([
            'site_id' => $site->id,
            'user_id' => $this->hostess->id,
            'assigned_by' => $this->manager->id,
            'starts_on' => '2026-10-01',
            'status' => AffectationStatus::Active,
        ]);
    }

    private function setWeekly(string $weekStart, ?int $amount): void
    {
        $this->actingAs($this->manager)->post(route('weekly-targets.store'), [
            'week_start' => $weekStart,
            'targets' => [['user_id' => $this->hostess->id, 'amount' => $amount]],
        ])->assertSessionHasNoErrors();
    }

    private function weeklyFor(string $week): ?int
    {
        return WeeklyTarget::effective([$this->hostess->id], CarbonImmutable::parse($week))->get($this->hostess->id)?->amount;
    }

    public function test_a_weekly_target_stays_in_place_the_following_weeks()
    {
        $this->setWeekly('2026-11-02', 150000);

        $this->assertSame(150000, $this->weeklyFor('2026-11-02'));
        $this->assertSame(150000, $this->weeklyFor('2026-11-09'));
        $this->assertSame(150000, $this->weeklyFor('2026-12-28'));
        $this->assertNull($this->weeklyFor('2026-10-26'), 'Pas d’effet rétroactif');

        // Trois semaines plus tard, l'hôtesse voit toujours son objectif, sans que personne ne l'ait refixé
        $this->travelTo(CarbonImmutable::parse('2026-11-25 10:00'));
        $this->actingAs($this->hostess)->get(route('terrain.home'))
            ->assertInertia(fn ($page) => $page->where('my_week_target.target', 150000));

        $this->actingAs($this->manager)->getJson(route('weekly-targets.show'))
            ->assertJsonPath('hostesses.0.target', 150000)
            ->assertJsonPath('hostesses.0.since', '2026-11-02');
    }

    public function test_changing_or_removing_a_weekly_target_applies_from_that_week_and_keeps_the_history()
    {
        $this->setWeekly('2026-11-02', 150000);

        $this->travelTo(CarbonImmutable::parse('2026-11-18 10:00'));
        $this->setWeekly('2026-11-16', 200000);

        $this->assertSame(150000, $this->weeklyFor('2026-11-09'), 'Les semaines passées gardent leur objectif');
        $this->assertSame(200000, $this->weeklyFor('2026-11-16'));
        $this->assertSame(200000, $this->weeklyFor('2026-11-30'));

        // Retrait à partir de la semaine prochaine
        $this->setWeekly('2026-11-23', null);
        $this->assertSame(200000, $this->weeklyFor('2026-11-16'));
        $this->assertNull($this->weeklyFor('2026-11-23'));
        $this->assertNull($this->weeklyFor('2026-12-07'));
    }

    public function test_putting_back_the_inherited_amount_removes_the_override()
    {
        $this->setWeekly('2026-11-02', 150000);
        $this->setWeekly('2026-11-09', 180000);
        $this->setWeekly('2026-11-09', 150000);

        $this->assertSame(1, WeeklyTarget::count(), 'Revenir au montant reconduit ne laisse pas de ligne inutile');
        $this->assertSame(150000, $this->weeklyFor('2026-11-16'));
    }

    public function test_a_monthly_target_stays_in_place_the_following_months()
    {
        $this->actingAs($this->manager)->post(route('reports.targets.save'), ['user_id' => $this->hostess->id, 'amount' => 600000])->assertSessionHasNoErrors();

        $this->travelTo(CarbonImmutable::parse('2027-01-12 10:00'));

        $this->actingAs($this->hostess)->get(route('terrain.home'))
            ->assertInertia(fn ($page) => $page->where('my_target.target', 600000));

        $this->actingAs($this->manager)->get(route('reports.objectives'))
            ->assertInertia(fn ($page) => $page
                ->where('targets.hostesses.0.target', 600000)
                ->where('targets.hostesses.0.since', '2026-11-01'));

        // Changé en janvier : novembre garde 600 000, janvier passe à 700 000
        $this->actingAs($this->manager)->post(route('reports.targets.save'), ['user_id' => $this->hostess->id, 'amount' => 700000]);
        $key = SalesTarget::keyFor(null, $this->hostess->id);
        $company = $this->manager->company_id;
        $this->assertSame(600000, SalesTarget::effective($company, CarbonImmutable::parse('2026-12-01'))->get($key)?->amount);
        $this->assertSame(700000, SalesTarget::effective($company, CarbonImmutable::parse('2027-01-01'))->get($key)?->amount);

        // Retiré à partir de janvier
        $this->actingAs($this->manager)->post(route('reports.targets.save'), ['user_id' => $this->hostess->id, 'amount' => null]);
        $this->assertNull(SalesTarget::effective($company, CarbonImmutable::parse('2027-02-01'))->get($key));
        $this->assertSame(600000, SalesTarget::effective($company, CarbonImmutable::parse('2026-12-01'))->get($key)?->amount);
    }

    public function test_saving_the_same_monthly_target_twice_does_not_duplicate_it()
    {
        $this->actingAs($this->manager)->post(route('reports.targets.save'), ['user_id' => $this->hostess->id, 'amount' => 500000]);
        $this->actingAs($this->manager)->post(route('reports.targets.save'), ['user_id' => $this->hostess->id, 'amount' => 550000]);

        $this->assertSame(1, SalesTarget::count());
        $this->assertSame(550000, SalesTarget::value('amount'));
    }
}
