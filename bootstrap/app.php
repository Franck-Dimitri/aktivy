<?php

use App\Http\Middleware\BlockWhileImpersonating;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\HandleBackgroundSync;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\TrackPageView;
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

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->redirectUsersTo(fn (Request $request) => $request->user()->homeUrl());

        $middleware->web(append: [
            EnsureAccountIsActive::class,
            EnsurePasswordIsChanged::class,
            BlockWhileImpersonating::class,
            HandleAppearance::class,
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

        // 403, 404, 419… : message clair en français au lieu de la page brute de Laravel
        $exceptions->respond(fn (Response $response, Throwable $e, Request $request) => HttpErrors::render($response, $e, $request));
    })->create();
