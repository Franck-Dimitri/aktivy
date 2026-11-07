<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Admin\ImpersonationController;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pendant une connexion « en tant que », le super administrateur ne peut pas modifier les
 * réglages personnels du gérant : mot de passe, e-mail, double authentification, clés d'accès,
 * suppression du compte.
 */
class BlockWhileImpersonating
{
    /** Routes bloquées (formulaires uniquement : les pages restent consultables). */
    private const BLOCKED = [
        'profile.update',
        'profile.destroy',
        'user-password.update',
        'password.change.update',
        'password.confirm.store',
        'two-factor.*',
        'passkey.store',
        'passkey.destroy',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->has(ImpersonationController::SESSION_KEY)
            && ! $request->isMethodSafe()
            && $request->routeIs(...self::BLOCKED)) {
            if ($request->header('X-Inertia')) {
                return back()->with('error', 'Action impossible pendant une connexion « en tant que » : seul le gérant peut modifier ses réglages personnels.');
            }

            abort(403, 'Action impossible pendant une connexion « en tant que ».');
        }

        return $next($request);
    }
}
