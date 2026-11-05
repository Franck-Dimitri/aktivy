<?php

namespace App\Http\Responses;

use App\Support\Toast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;
use Laravel\Fortify\Fortify;
use Symfony\Component\HttpFoundation\Response;

/**
 * Réponses Fortify de déconnexion, d'inscription et de confirmation d'e-mail : même destination
 * que par défaut, avec un toast de confirmation.
 */
class AccountResponses implements LogoutResponseContract, RegisterResponseContract, VerifyEmailResponseContract
{
    public function __construct(private string $kind) {}

    /** @param  Request  $request */
    public function toResponse($request): Response
    {
        return match ($this->kind) {
            'logout' => $this->logout($request),
            'register' => $this->register($request),
            default => $this->verified($request),
        };
    }

    private function logout(Request $request): Response
    {
        if ($request->wantsJson()) {
            return new JsonResponse('', 204);
        }

        Toast::success('Vous êtes déconnecté. À bientôt !');

        return redirect(Fortify::redirects('logout', '/'));
    }

    private function register(Request $request): Response
    {
        if ($request->wantsJson()) {
            return new JsonResponse('', 201);
        }

        Toast::success('Compte créé ! Un e-mail de confirmation vient de vous être envoyé.');

        return redirect()->intended(Fortify::redirects('register'));
    }

    private function verified(Request $request): Response
    {
        if ($request->wantsJson()) {
            return new JsonResponse('', 204);
        }

        Toast::success('Adresse e-mail confirmée, merci !');

        return redirect()->intended(Fortify::redirects('email-verification').'?verified=1');
    }
}
