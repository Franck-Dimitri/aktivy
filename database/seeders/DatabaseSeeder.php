<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\Company;
use App\Models\User;
use App\Support\Demo\DemoAccounts;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Comptes de démonstration.
 *
 * Relançable à volonté (`php artisan db:seed`) sur SQLite, PostgreSQL ou MySQL : ce qui existe
 * déjà est conservé tel quel (mot de passe compris), seul ce qui manque est créé, et une ligne
 * supprimée (soft delete) est restaurée au lieu de heurter la contrainte d'unicité.
 * N'utilise ni factory ni Faker, absents d'une installation `composer install --no-dev`.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    private const COMPANY_DEFAULTS = [
        'country' => 'CM',
        'timezone' => 'Africa/Douala',
        'locale' => 'fr',
        'currency' => 'XAF',
        'primary_color' => '#027a48',
        'status' => AccountStatus::Active,
    ];

    public function run(): void
    {
        // Jamais en production : ces comptes ont tous le mot de passe « password », connu de tous
        if (app()->isProduction()) {
            $this->command?->error('Seeder de démonstration refusé en production (mots de passe connus de tous).');

            return;
        }

        DB::transaction(function () {
            $demo = $this->company(DemoAccounts::COMPANY_SLUG, [
                'name' => DemoAccounts::COMPANY_NAME,
                'email' => 'contact@demo.test',
                'phone' => '+237233000000',
                'city' => 'Douala',
            ]);

            foreach (DemoAccounts::all() as $account) {
                $this->account($account['role'], $account['demoCompany'] ? $demo : null, $account['name'], DemoAccounts::PASSWORD, $account['email'], $account['phone']);
            }
        });

        // Points de vente, produits, stock, affectations et historique de rapports pour tout essayer
        $this->call(DemoDataSeeder::class);
    }

    /**
     * Entreprise retrouvée par son slug (même supprimée), créée si elle n'existe pas.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function company(string $slug, array $attributes): Company
    {
        $company = Company::withTrashed()->firstOrNew(['slug' => $slug]);

        if (! $company->exists) {
            $company->forceFill([...self::COMPANY_DEFAULTS, ...$attributes, 'slug' => $slug])->save();
        } elseif ($company->trashed()) {
            $company->restore();
        }

        return $company;
    }

    /**
     * Compte retrouvé par e-mail ou téléphone (les deux sont uniques), créé s'il n'existe pas.
     * Un compte existant garde son mot de passe ; seule la vérification d'e-mail manquante est complétée.
     */
    private function account(Role $role, ?Company $company, string $name, string $password, ?string $email = null, ?string $phone = null): User
    {
        $user = User::withTrashed()
            ->where(function ($query) use ($email, $phone) {
                if ($email) {
                    $query->orWhere('email', $email);
                }
                if ($phone) {
                    $query->orWhere('phone', $phone);
                }
            })
            ->first();

        if (! $user) {
            // forceFill : email_verified_at n'est pas « fillable » sur User
            $user = new User;
            $user->forceFill([
                'company_id' => $company?->id,
                'role' => $role,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password' => $password,
                'email_verified_at' => $email ? now() : null,
                'status' => AccountStatus::Active,
            ])->save();

            return $user;
        }

        if ($user->trashed()) {
            $user->restore();
        }

        if ($user->email && ! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return $user;
    }
}
