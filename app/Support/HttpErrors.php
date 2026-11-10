<?php

namespace App\Support;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Erreurs HTTP lisibles, en français, au lieu de la page brute de Laravel.
 *
 * - Action refusée depuis l'application (bouton, formulaire : visite Inertia autre que GET) :
 *   retour sur la page, avec le message en toast et dans les erreurs du formulaire.
 * - Page refusée, introuvable, en maintenance… : page « error » de Motriks, avec le bon code HTTP.
 *
 * Les réponses JSON (API, aperçus chargés en fetch) gardent leur format.
 */
class HttpErrors
{
    /** Codes pris en charge ; les autres gardent la réponse de Laravel. */
    private const HANDLED = [403, 404, 419, 422, 429, 500, 503];

    /** Messages anglais par défaut du framework : remplacés par le texte français. */
    private const FRAMEWORK_MESSAGES = ['This action is unauthorized.', 'Forbidden', 'Unauthorized', 'Not Found', 'Too Many Attempts.', 'CSRF token mismatch.', 'Service Unavailable', 'Server Error'];

    public static function render(Response $response, Throwable $e, Request $request): Response
    {
        $status = $response->getStatusCode();

        if (! in_array($status, self::HANDLED, true)
            || ($request->expectsJson() && ! $request->header('X-Inertia'))
            // En local, la page de débogage reste plus utile pour une erreur serveur
            || ($status >= 500 && $status !== 503 && config('app.debug'))) {
            return $response;
        }

        $message = self::message($status, $e);

        // Action refusée : on reste sur la page et on explique
        if ($request->header('X-Inertia') && ! $request->isMethod('GET') && $request->hasSession() && $status !== 503) {
            return back()
                ->with('error', $message)
                ->withErrors(['autorisation' => $message]);
        }

        return Inertia::render('error', [
            'status' => $status,
            'title' => self::title($status),
            'message' => $message,
            'home' => $request->user()?->homeUrl() ?? '/',
            'signed_in' => $request->user() !== null,
        ])->toResponse($request)->setStatusCode($status);
    }

    public static function title(int $status): string
    {
        return match ($status) {
            403 => 'Accès non autorisé',
            404 => 'Page introuvable',
            419 => 'Session expirée',
            422 => 'Action impossible',
            429 => 'Trop de tentatives',
            503 => 'Maintenance en cours',
            default => 'Une erreur est survenue',
        };
    }

    /** Message donné au abort() quand il est en français, sinon le texte par défaut du code. */
    public static function message(int $status, Throwable $e): string
    {
        $custom = $e instanceof HttpExceptionInterface ? trim($e->getMessage()) : '';

        // Un 404 peut porter le nom d'un modèle (« No query results for model… ») : jamais affiché
        if ($custom !== '' && $status !== 404 && $status < 500 && ! in_array($custom, self::FRAMEWORK_MESSAGES, true)) {
            return $custom;
        }

        return match ($status) {
            403 => 'Vous n’avez pas l’autorisation de faire cette action ou d’ouvrir cette page. Elle est réservée à un autre rôle (le gérant, par exemple).',
            404 => 'Cette page n’existe pas ou plus. Le lien est peut-être ancien, ou l’élément a été supprimé.',
            419 => 'Votre session a expiré. Rechargez la page, puis recommencez.',
            422 => 'Cette action n’est pas possible pour le moment.',
            429 => 'Trop de tentatives en peu de temps. Patientez une minute, puis réessayez.',
            503 => 'Motriks est en cours de mise à jour. Réessayez dans une minute.',
            default => 'Une erreur inattendue est survenue. Réessayez ; si elle se répète, contactez le support.',
        };
    }
}
