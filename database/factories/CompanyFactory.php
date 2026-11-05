<?php

namespace Database\Factories;

use App\Enums\AccountStatus;
use App\Enums\Module;
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
        ];
    }

    /**
     * Comme les entreprises déjà inscrites : tous les modules payants, sans date de fin.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Company $company) {
            foreach (Module::cases() as $module) {
                $company->modules()->create(['module' => $module->value, 'starts_on' => today()->subYear()->toDateString()]);
            }
        });
    }

    /**
     * Entreprise sans aucun module payant (offre gratuite).
     */
    public function withoutModules(): static
    {
        return $this->afterCreating(fn (Company $company) => $company->modules()->delete());
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
