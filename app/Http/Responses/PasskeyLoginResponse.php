<?php

namespace App\Http\Responses;

use App\Support\Toast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class PasskeyLoginResponse implements PasskeyLoginResponseContract
{
    /**
     * Send the user to the home page of their role.
     *
     * @param  Request  $request
     */
    public function toResponse($request): Response
    {
        Toast::success(LoginResponse::welcome($request->user()->name));
        $redirect = redirect()->intended($request->user()->homeUrl());

        if ($request->wantsJson()) {
            return new JsonResponse(['redirect' => $redirect->getTargetUrl()]);
        }

        return $redirect;
    }
}
