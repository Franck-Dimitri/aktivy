<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\Company;
use App\Models\User;
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
        DB::transaction(function () {
            // Mot de passe de tous les comptes démo : « password »
            $this->account(Role::SuperAdmin, null, 'Super Admin', email: 'admin@motriks.test', password: 'password');

            $demo = $this->company('demo-distribution', [
                'name' => 'Démo Distribution',
                'email' => 'contact@demo.test',
                'phone' => '+237233000000',
                'city' => 'Douala',
            ]);

            $this->account(Role::CompanyAdmin, $demo, 'Gérant Démo', email: 'gerant@demo.test', password: 'password');
            $this->account(Role::Supervisor, $demo, 'Superviseur Démo', email: 'superviseur@demo.test', password: 'password');
            $this->account(Role::Accountant, $demo, 'Comptable Démo', email: 'comptable@demo.test', password: 'password');
            $this->account(Role::FieldAgent, $demo, 'Hôtesse Démo', phone: '+237690000001', password: 'password');

            // Entreprise et comptes de test de développement
            $bennett = $this->company('bennett-lynn-trading', [
                'name' => 'Bennett Lynn Trading',
                'email' => 'franckdimitrio000@gmail.com',
            ]);

            $this->account(Role::CompanyAdmin, $bennett, 'Franck Dimitri (Responsable)', email: 'franckdimitrio000@gmail.com', password: 'franckdimitrio000@gmail.com');
            $this->account(Role::FieldAgent, $bennett, 'Franck Dimitri (Hôtesse)', email: 'franckdimitrio009@gmail.com', phone: '+237676383986', password: 'Lapersonne2020');
        });
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
