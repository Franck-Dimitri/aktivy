<?php

namespace Database\Factories;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'role' => Role::CompanyAdmin,
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            /* @chisel-2fa */
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            /* @end-chisel-2fa */
        ];
    }

    /**
     * Give the user the given role.
     */
    public function role(Role $role): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => $role,
            'company_id' => $role->belongsToCompany() ? ($attributes['company_id'] ?? Company::factory()) : null,
        ]);
    }

    /**
     * Indicate that the user is the platform super administrator.
     */
    public function superAdmin(): static
    {
        return $this->role(Role::SuperAdmin);
    }

    /**
     * Indicate that the user is a supervisor.
     */
    public function supervisor(): static
    {
        return $this->role(Role::Supervisor);
    }

    /**
     * Indicate that the user is a field agent who logs in with a phone number.
     */
    public function fieldAgent(): static
    {
        return $this->role(Role::FieldAgent)->state(fn (array $attributes) => [
            'email' => null,
            'email_verified_at' => null,
            'phone' => '+2376'.fake()->unique()->numerify('########'),
        ]);
    }

    /**
     * Indicate that the user is an accountant.
     */
    public function accountant(): static
    {
        return $this->role(Role::Accountant);
    }

    /**
     * Indicate that the user's account is suspended.
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AccountStatus::Suspended,
        ]);
    }

    /**
     * Indicate that the user must change their temporary password.
     */
    public function mustChangePassword(): static
    {
        return $this->state(fn (array $attributes) => [
            'must_change_password' => true,
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Indicate that the model has two-factor authentication configured.
     */
    public function withTwoFactor(): static
    {
        /* @chisel-2fa */
        return $this->state(fn (array $attributes) => [
            'two_factor_secret' => encrypt('secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ]);
        /* @end-chisel-2fa */
    }
}
