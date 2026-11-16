<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Super administrateur : double authentification obligatoire. Ce compte voit toutes les entreprises,
 * leurs documents légaux et peut se connecter « en tant que » leurs gérants : un mot de passe volé ne
 * doit pas suffire. Tant qu'elle n'est pas activée, seule la page Sécurité (pour l'activer) reste ouverte.
 */
class RequireAdminTwoFactor
{
    /** Pages et actions nécessaires pour activer la double authentification, ou partir. */
    private const ALLOWED = [
        'security.edit',
        'two-factor.*',
        'password.confirm',
        'password.confirm.store',
        'password.confirmation',
        'logout',
        'impersonation.stop',
        // Appels de fond de l'application (pouls des notifications, cloche, abonnement push) : ils ne
        // donnent accès à rien d'administratif, et les rediriger vers la page Sécurité la rechargeait
        // en arrière-plan, ce qui annulait l'activation en cours (Fortify efface alors le secret)
        'notifications.pulse',
        'notifications.recent',
        'push.*',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null
            || $user->role !== Role::SuperAdmin
            || $user->two_factor_confirmed_at !== null
            || $request->routeIs(...self::ALLOWED)
            || ! app()->isProduction()) {
            return $next($request);
        }

        // Requête de fond (fetch, JSON) : un refus net, jamais une redirection que le navigateur suivrait
        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json(['message' => 'Activez la double authentification pour continuer.'], 403);
        }

        return redirect()->route('security.edit')
            ->with('warning', 'Activez la double authentification pour accéder à l’administration de la plateforme.');
    }
}
