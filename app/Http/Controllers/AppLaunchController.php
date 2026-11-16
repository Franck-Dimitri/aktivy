<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Ouverture de l'application installée (start_url du manifeste) : comme une application mobile,
 * l'espace de l'utilisateur s'il est connecté, sinon directement le formulaire de connexion.
 *
 * Les raccourcis de l'icône (appui long, « shortcuts » du manifeste) passent aussi par ici avec
 * « ?ouvrir= » : le même raccourci mène au bon écran selon le rôle (« Rapports » : l'historique de
 * l'hôtesse, les rapports journaliers du responsable). Un rôle sans écran correspondant arrive
 * simplement sur son tableau de bord.
 */
class AppLaunchController extends Controller
{
    /** Raccourci => [rôle => route]. */
    private const SHORTCUTS = [
        'rapports' => [
            'field_agent' => 'terrain.reports.index',
            'supervisor' => 'daily-reports.index',
            'company_admin' => 'daily-reports.index',
        ],
        'ventes' => [
            'field_agent' => 'terrain.sales',
            'supervisor' => 'reports.index',
            'company_admin' => 'reports.index',
        ],
        'stock' => [
            'field_agent' => 'terrain.stock',
            'supervisor' => 'stock-alerts.index',
            'company_admin' => 'stock-alerts.index',
        ],
        'notifications' => [
            'super_admin' => 'notifications.index',
            'company_admin' => 'notifications.index',
            'supervisor' => 'notifications.index',
            'field_agent' => 'notifications.index',
            'accountant' => 'notifications.index',
        ],
    ];

    public function __invoke(Request $request): RedirectResponse
    {
        $user = $request->user();

        // Après la connexion, le raccourci touché s'ouvre quand même (adresse « voulue »)
        if (! $user instanceof User) {
            return redirect()->guest(route('login'));
        }

        return redirect($this->target($user, (string) $request->query('ouvrir', '')));
    }

    private function target(User $user, string $shortcut): string
    {
        $route = self::SHORTCUTS[$shortcut][$user->role->value] ?? null;

        return $route !== null ? route($route, absolute: false) : $user->homeUrl();
    }
}
