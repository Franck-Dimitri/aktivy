<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * En-têtes de sécurité sur toutes les réponses :
 * - Motriks ne s'affiche pas dans le cadre d'un autre site (sinon une page piégée pouvait faire
 *   cliquer un gérant sur une action à son insu, « clickjacking ») ;
 * - le navigateur ne devine pas le type d'un fichier (une photo reste une photo) ;
 * - les adresses visitées ne partent pas en entier vers les sites tiers ;
 * - caméra et position seulement pour Motriks lui-même, micro jamais ;
 * - en https, le navigateur n'essaie plus jamais la version non chiffrée (HSTS) ;
 * - pages HTML : politique de contenu (CSP). Seuls les scripts de Motriks s'exécutent (les fichiers de
 *   l'application, et le seul script en ligne porteur du jeton « nonce » de la requête) : une faille
 *   d'injection ne pourrait pas faire exécuter un script venu d'ailleurs ni envoyer les données ailleurs.
 *
 * La CSP n'est posée que sur le HTML (sur un PDF, elle bloque le lecteur intégré de Chrome). Les violations
 * sont envoyées à /csp-rapport (journal), pour repérer un blocage imprévu. CSP_REPORT_ONLY=true la passe
 * en mode « rapport seulement » sans rien bloquer, le temps d'une vérification.
 * Un en-tête déjà posé (téléchargement…) n'est jamais remplacé.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        // Jeton de la requête : Vite le pose sur ses balises <script>, la vue sur son script en ligne
        $nonce = Vite::useCspNonce();

        $response = $next($request);

        $headers = [
            'X-Frame-Options' => 'SAMEORIGIN',
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()',
        ];

        if ($request->isSecure() || str_starts_with((string) config('app.url'), 'https://')) {
            $headers['Strict-Transport-Security'] = 'max-age=31536000';
        }

        $isHtml = str_contains((string) $response->headers->get('Content-Type'), 'text/html');
        $header = config('security.csp_report_only') ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
        $headers[$isHtml ? $header : 'Content-Security-Policy'] = $isHtml ? $this->policy($nonce) : "frame-ancestors 'self'";

        foreach ($headers as $name => $value) {
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        return $response;
    }

    private function policy(string $nonce): string
    {
        // Poste de développement : le serveur Vite (rechargement à chaud) sert les scripts et sa connexion
        $hot = Vite::isRunningHot() ? $this->hotOrigins() : '';

        $directives = [
            "default-src 'self'",
            "script-src 'self' 'nonce-{$nonce}'{$hot}",
            // Styles en ligne : attributs style de React (positions des menus, graphiques, notifications)
            "style-src 'self' 'unsafe-inline'{$hot}",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self'{$hot}",
            // Service Worker (hors ligne) et lecteur PDF des factures
            "worker-src 'self' blob:",
            // Aperçu des documents (même origine) dans l'administration
            "frame-src 'self' blob:",
            "media-src 'self' blob:",
            "manifest-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
            'report-uri /csp-rapport',
        ];

        if (str_starts_with((string) config('app.url'), 'https://')) {
            $directives[] = 'upgrade-insecure-requests';
        }

        return implode('; ', $directives);
    }

    private function hotOrigins(): string
    {
        $url = rtrim((string) @file_get_contents(public_path('hot')));
        $ws = preg_replace('#^http#', 'ws', $url);

        return $url !== '' ? " {$url} {$ws}" : '';
    }
}
