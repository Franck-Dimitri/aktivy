<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * En-têtes de sécurité sur toutes les réponses :
 * - Motriks ne s'affiche pas dans le cadre d'un autre site (sinon une page piégée pouvait faire
 *   cliquer un gérant sur une action à son insu, « clickjacking ») ;
 * - le navigateur ne devine pas le type d'un fichier (une photo reste une photo) ;
 * - les adresses visitées ne partent pas en entier vers les sites tiers ;
 * - caméra et position seulement pour Motriks lui-même, micro jamais ;
 * - en https, le navigateur n'essaie plus jamais la version non chiffrée (HSTS).
 *
 * Pas de politique de contenu complète (CSP) ici : elle demande d'inventorier les scripts de Vite et
 * des pages, à poser à part en mode « rapport seulement » d'abord. Un en-tête déjà posé (téléchargement…)
 * n'est jamais remplacé.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = [
            'X-Frame-Options' => 'SAMEORIGIN',
            'Content-Security-Policy' => "frame-ancestors 'self'",
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()',
        ];

        if ($request->isSecure() || str_starts_with((string) config('app.url'), 'https://')) {
            $headers['Strict-Transport-Security'] = 'max-age=31536000';
        }

        foreach ($headers as $name => $value) {
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        return $response;
    }
}
