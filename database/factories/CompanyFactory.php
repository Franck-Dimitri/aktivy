<?php

namespace Database\Factories;

use App\Enums\AccountStatus;
use App\Enums\Plan;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'email' => fake()->companyEmail(),
            'phone' => '+2372'.fake()->numerify('########'),
            'primary_color' => fake()->hexColor(),
            'status' => AccountStatus::Active,
            ...$this->definitionPlan(),
        ];
    }

    /**
     * Par défaut, Motriks Entreprise sans date de fin : toutes les fonctions, comme avant les forfaits.
     * Les tests qui portent sur les forfaits choisissent le leur avec plan() ou starter().
     */
    private function definitionPlan(): array
    {
        return ['plan' => Plan::Entreprise, 'plan_ends_on' => null, 'plan_trial' => false];
    }

    /**
     * Forfait donné, éventuellement jusqu'à une date ou en essai.
     */
    public function plan(Plan $plan, ?string $endsOn = null, bool $trial = false): static
    {
        return $this->state(fn () => ['plan' => $plan, 'plan_ends_on' => $endsOn, 'plan_trial' => $trial]);
    }

    /**
     * Motriks Starter, le forfait gratuit.
     */
    public function starter(): static
    {
        return $this->plan(Plan::Starter);
    }

    /**
     * Ancien nom : entreprise sans fonction payante, c'est-à-dire en Starter.
     */
    public function withoutModules(): static
    {
        return $this->starter();
    }

    /**
     * Indicate that the company is suspended.
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AccountStatus::Suspended,
        ]);
    }
}
