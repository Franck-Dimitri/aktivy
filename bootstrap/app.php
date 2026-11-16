<?php

use App\Http\Middleware\BlockWhileImpersonating;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\HandleBackgroundSync;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequireAdminTwoFactor;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\TrackPageView;
use App\Support\ErrorAlert;
use App\Support\HttpErrors;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: ['telegram/webhook']);

        // motriks_appareil : posé par l'application (lib/pwa.ts), lu à la déconnexion (ForgetPushDevice)
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', 'motriks_appareil']);

        $middleware->redirectUsersTo(fn (Request $request) => $request->user()->homeUrl());

        // Toutes les réponses (pages, fichiers, erreurs) : cadre interdit aux autres sites, nosniff, HSTS…
        $middleware->append(SecurityHeaders::class);

        $middleware->web(append: [
            EnsureAccountIsActive::class,
            EnsurePasswordIsChanged::class,
            BlockWhileImpersonating::class,
            // Super administrateur sans double authentification : renvoyé l'activer (production)
            RequireAdminTwoFactor::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            // Audience du site public (sans cookie), enregistrée après l'envoi de la réponse
            TrackPageView::class,
            // Envois en arrière-plan du mode hors ligne de l'hôtesse : réponse JSON fiable
            HandleBackgroundSync::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Erreur serveur : l'équipe est prévenue sur Telegram (production, sans données personnelles)
        $exceptions->report(fn (Throwable $e) => ErrorAlert::exception($e));

        // 403, 404, 419… : message clair en français au lieu de la page brute de Laravel
        $exceptions->respond(fn (Response $response, Throwable $e, Request $request) => HttpErrors::render($response, $e, $request));
    })->create();
