<?php

namespace Tests\Feature;

use App\Enums\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Modèle freemium : les fonctions hors forfait restent visibles dans le menu, avec le forfait qui les débloque,
 * et leur page explique comment y accéder.
 */
class LockedMenuTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_a_starter_company_sees_the_paid_modules_with_the_plan_that_unlocks_them()
    {
        $manager = User::factory()->create();
        $manager->company->setPlan(Plan::Starter);

        $this->actingAs($manager)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('auth.lockedModules.stocks', 'Pro')
                ->where('auth.lockedModules.reporting', 'Pro')
                ->missing('auth.lockedModules.terrain'));
    }

    public function test_a_paying_company_has_nothing_locked()
    {
        $manager = User::factory()->create();
        $manager->company->setPlan(Plan::Business, today()->addMonth());

        $this->actingAs($manager)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('auth.lockedModules', []));
    }

    public function test_the_locked_page_tells_which_plan_unlocks_the_module()
    {
        $manager = User::factory()->create();
        $manager->company->setPlan(Plan::Starter);

        $this->actingAs($manager)->get(route('stock-alerts.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('module-locked')
                ->where('plan.needed', Plan::Pro->label())
                ->has('plan.highlights'));
    }
}
