<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use App\Jobs\RecordPageView;
use App\Support\Traffic\UserAgent;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mesure d'audience du site public, sans cookie ni service tiers.
 *
 * Compte les pages vues des routes sans authentification (landing, contact, pages légales, connexion,
 * inscription…) : chargement complet ou navigation Inertia, réponse 200 seulement. Ignore les robots,
 * les préchargements, les rechargements partiels et le super administrateur. L'enregistrement part
 * en file d'attente APRÈS l'envoi de la réponse (terminate) : le visiteur n'attend jamais.
 */
class TrackPageView
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if (! $this->shouldTrack($request, $response)) {
            return;
        }

        $utm = fn (string $key) => Str::limit(trim((string) $request->query($key)), 75, '') ?: null;

        RecordPageView::dispatch([
            'path' => $this->path($request),
            'referrer_host' => $this->referrerHost($request),
            'utm_source' => ($source = $utm('utm_source')) ? Str::lower($source) : null,
            'utm_medium' => $utm('utm_medium'),
            'utm_campaign' => $utm('utm_campaign'),
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
            'language' => $this->language($request),
            'country' => $this->country($request),
            'visitor' => $this->visitor($request),
        ], now()->toDateTimeString());
    }

    private function shouldTrack(Request $request, Response $response): bool
    {
        if (! $request->isMethod('GET') || $response->getStatusCode() !== 200) {
            return false;
        }

        // Page HTML complète, ou navigation Inertia (réponse JSON portant l'en-tête X-Inertia)
        $inertia = $request->header('X-Inertia') !== null;
        if (! $inertia && ! str_contains((string) $response->headers->get('Content-Type'), 'text/html')) {
            return false;
        }

        // Préchargement au survol d'un lien, rechargement partiel d'une page déjà comptée
        $prefetch = $request->header('Purpose') === 'prefetch' || str_contains((string) $request->header('Sec-Purpose'), 'prefetch');
        $partial = $request->hasHeader('X-Inertia-Partial-Data') || $request->hasHeader('X-Inertia-Partial-Component');
        if ($prefetch || $partial) {
            return false;
        }

        // Pages publiques uniquement : l'application connectée relève du journal d'audit
        $route = $request->route();
        if ($route === null || collect($route->gatherMiddleware())->contains(fn ($m) => is_string($m) && ($m === 'auth' || str_starts_with($m, 'auth:')))) {
            return false;
        }

        if ($request->user()?->role === Role::SuperAdmin) {
            return false;
        }

        return ! UserAgent::parse($request->userAgent())['bot'];
    }

    /**
     * Chemin de la page, sans paramètres de requête. Une route à paramètres (lien d'invitation, de
     * réinitialisation du mot de passe…) est enregistrée sous son modèle : jamais de jeton dans les statistiques.
     */
    private function path(Request $request): string
    {
        $route = $request->route();
        $path = $route !== null && $route->parameterNames() !== [] ? $route->uri() : $request->path();

        return Str::limit('/'.ltrim($path, '/'), 250, '');
    }

    /** Domaine du site d'origine, sans le reste de l'adresse ; null pour un accès direct ou une navigation interne. */
    private function referrerHost(Request $request): ?string
    {
        $host = parse_url((string) $request->headers->get('referer'), PHP_URL_HOST);

        if (! is_string($host) || $host === '' || strcasecmp($host, $request->getHost()) === 0) {
            return null;
        }

        return Str::limit(Str::lower(preg_replace('/^www\./i', '', $host)), 120, '');
    }

    /** Langue principale du navigateur (« fr », « en »…). */
    private function language(Request $request): ?string
    {
        $first = strtolower(substr(trim(explode(',', (string) $request->header('Accept-Language'))[0]), 0, 8));
        $code = explode('-', $first)[0];

        return preg_match('/^[a-z]{2,3}$/', $code) ? $code : null;
    }

    /** Pays fourni par Cloudflare (CF-IPCountry) quand le site passe par lui ; rien n'est déduit de l'IP ici. */
    private function country(Request $request): ?string
    {
        $country = strtoupper((string) $request->header('CF-IPCountry'));

        return preg_match('/^[A-Z]{2}$/', $country) && ! in_array($country, ['XX', 'T1'], true) ? $country : null;
    }

    /**
     * Empreinte anonyme du visiteur, valable une journée : hachage de la clé de l'application, du jour,
     * de l'IP et du navigateur. Impossible de retrouver l'IP, impossible de suivre quelqu'un d'un jour à l'autre.
     */
    private function visitor(Request $request): string
    {
        return substr(hash('sha256', config('app.key').'|'.now()->toDateString().'|'.$request->ip().'|'.$request->userAgent()), 0, 16);
    }
}
