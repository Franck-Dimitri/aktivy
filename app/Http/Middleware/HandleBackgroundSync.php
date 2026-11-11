<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Envois en arrière-plan du mode hors ligne (en-tête X-Motriks-Sync, cf. resources/js/lib/outbox.ts).
 *
 * Le téléphone doit savoir avec certitude si l'action a été enregistrée : une redirection ne le dit pas
 * (une session à reconfirmer redirige aussi). Le contrôleur marque donc la réussite (self::done), et la
 * réponse devient du JSON : 200 si l'action est enregistrée, 428 si une redirection inattendue l'a
 * interrompue (l'action reste sur le téléphone). Les messages « flash » ne sont pas gardés : ils
 * s'afficheraient plus tard, hors de propos, sur l'écran de l'hôtesse.
 */
class HandleBackgroundSync
{
    public const HEADER = 'X-Motriks-Sync';

    private const DONE = 'motriks.sync.done';

    /**
     * Marque l'action comme enregistrée, avec des informations utiles au téléphone.
     *
     * @param  array<string, mixed>  $data
     */
    public static function done(Request $request, array $data = []): void
    {
        $request->attributes->set(self::DONE, $data);
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->headers->has(self::HEADER)) {
            return $next($request);
        }

        $response = $next($request);

        if ($request->hasSession()) {
            $session = $request->session();
            $session->forget($session->get('_flash.new', []));
            $session->put('_flash.new', []);
        }

        if ($request->attributes->has(self::DONE)) {
            return new JsonResponse(['ok' => true, ...$request->attributes->get(self::DONE)]);
        }

        if ($response instanceof RedirectResponse) {
            return new JsonResponse([
                'ok' => false,
                'message' => 'Ouvrez l’application avec du réseau pour terminer l’envoi.',
            ], 428);
        }

        return $response;
    }
}
