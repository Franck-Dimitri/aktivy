<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Super-admin bypass
        if ($user->role === Role::SuperAdmin) {
            return $next($request);
        }

        if ($user->isActive()) {
            return $next($request);
        }

        $company = $user->company;

        if ($company?->isPending()) {
            // Pending without completed onboarding → redirect to onboarding
            if (! $company->onboardingCompleted()) {
                if ($request->routeIs('onboarding.*', 'logout')) {
                    return $next($request);
                }
                return redirect()->route('onboarding.show');
            }

            // Onboarding done, waiting for admin
            if ($request->routeIs('onboarding.pending', 'logout')) {
                return $next($request);
            }
            return redirect()->route('onboarding.pending');
        }

        if ($company?->isRejected()) {
            if ($request->routeIs('onboarding.rejected', 'logout')) {
                return $next($request);
            }
            return redirect()->route('onboarding.rejected');
        }

        // Suspended — force logout
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->withErrors([
            'login' => __('Ce compte est suspendu. Contactez votre administrateur.'),
        ]);
    }
}
