<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Chaque page principale de chaque rôle s'ouvre sans erreur, avec les données de démonstration
 * (ventes au point de vente et en boutique extérieure, rapports, stock, événements…).
 *
 * Filet de sécurité contre les régressions qui ne touchent qu'un cas de données : en novembre 2026,
 * « Mes ventes » plantait (erreur 500) sur une ligne de vente sans produit direct, sans qu'aucun test
 * ne le voie.
 */
class PagesSmokeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed();
    }

    private function assertPagesOpen(User $user, array $routes): void
    {
        foreach ($routes as $route) {
            $response = $this->actingAs($user)->get(route($route));

            $this->assertSame(200, $response->getStatusCode(), "La page « {$route} » ne s'ouvre pas pour {$user->role->value} (code {$response->getStatusCode()}).");
        }
    }

    public function test_every_hostess_page_opens()
    {
        $hostess = User::where('phone', '+237690000001')->firstOrFail();

        $this->assertPagesOpen($hostess, [
            'terrain.home', 'terrain.reports.index', 'terrain.sales', 'terrain.stock', 'terrain.stats',
            'terrain.planning', 'terrain.external-shops', 'terrain.tickets.index',
            'notifications.index', 'profile.edit', 'personal-data.export',
        ]);
    }

    public function test_every_manager_page_opens()
    {
        $manager = User::where('email', 'gerant@demo.test')->firstOrFail();

        $this->assertPagesOpen($manager, [
            'dashboard', 'activity.index', 'daily-reports.index', 'reports.index', 'reports.objectives',
            'sites.index', 'personnel.index', 'affectations.index', 'products.index', 'events.index',
            'stock-alerts.index', 'tickets.index', 'company.settings.edit', 'company.subscription',
            'company.invoices.index', 'notifications.index', 'profile.edit',
        ]);
    }

    public function test_every_supervisor_page_opens()
    {
        $supervisor = User::where('email', 'superviseur@demo.test')->firstOrFail();

        $this->assertPagesOpen($supervisor, [
            'dashboard', 'activity.index', 'daily-reports.index', 'reports.index',
            'sites.index', 'personnel.index', 'affectations.index', 'products.index', 'tickets.index',
        ]);
    }
}
