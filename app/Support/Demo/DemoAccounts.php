<?php

namespace App\Support\Demo;

use App\Enums\Role;

/**
 * Comptes de démonstration (base locale ou de recette uniquement), tous avec le mot de passe PASSWORD.
 * Une seule source pour le seeder qui les crée et pour la page de connexion qui les propose en local :
 * aucun identifiant n'est écrit dans le code JavaScript envoyé aux navigateurs.
 */
final class DemoAccounts
{
    public const PASSWORD = 'password';

    public const COMPANY_SLUG = 'demo-distribution';

    public const COMPANY_NAME = 'Démo Distribution';

    /** @return list<array{role: Role, name: string, email: ?string, phone: ?string, demoCompany: bool, description: string}> */
    public static function all(): array
    {
        return [
            ['role' => Role::CompanyAdmin, 'name' => 'Gérant Démo', 'email' => 'gerant@demo.test', 'phone' => null, 'demoCompany' => true, 'description' => 'Équipe, sites, produits, rapports'],
            ['role' => Role::FieldAgent, 'name' => 'Hôtesse Démo', 'email' => null, 'phone' => '+237690000001', 'demoCompany' => true, 'description' => 'Espace terrain, connexion par téléphone'],
            ['role' => Role::Supervisor, 'name' => 'Superviseur Démo', 'email' => 'superviseur@demo.test', 'phone' => null, 'demoCompany' => true, 'description' => 'Suivi des hôtesses de ses sites'],
            ['role' => Role::Accountant, 'name' => 'Comptable Démo', 'email' => 'comptable@demo.test', 'phone' => null, 'demoCompany' => true, 'description' => 'Ventes et exports'],
            ['role' => Role::SuperAdmin, 'name' => 'Super Admin', 'email' => 'admin@motriks.test', 'phone' => null, 'demoCompany' => false, 'description' => 'Administration de la plateforme'],
        ];
    }

    /**
     * Pour la page de connexion, en local seulement (voir FortifyServiceProvider).
     *
     * @return list<array{id: string, name: string, role: string, company: ?string, login: string, password: string, description: string}>
     */
    public static function forLoginPage(): array
    {
        return array_map(fn (array $a) => [
            'id' => $a['email'] ?? $a['phone'],
            'name' => $a['name'],
            'role' => $a['role']->label(),
            'company' => $a['demoCompany'] ? self::COMPANY_NAME : null,
            'login' => $a['email'] ?? $a['phone'],
            'password' => self::PASSWORD,
            'description' => $a['description'],
        ], self::all());
    }
}
