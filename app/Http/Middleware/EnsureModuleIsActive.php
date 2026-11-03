<?php

namespace App\Http\Middleware;

use App\Enums\Module;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloque une fonction payante quand l'entreprise n'a pas le module correspondant.
 * Une page explique pourquoi ; une action (envoi de formulaire) est simplement refusée.
 */
class EnsureModuleIsActive
{
    public static function using(Module $module): string
    {
        return static::class.':'.$module->value;
    }

    public function handle(Request $request, Closure $next, string $module): Response
    {
        $company = $request->user()?->company;
        $wanted = Module::from($module);

        if (! $company || $company->hasModule($wanted)) {
            return $next($request);
        }

        abort_unless($request->isMethod('GET'), 403, "Le module « {$wanted->label()} » n’est pas actif pour votre entreprise.");

        return Inertia::render('module-locked', [
            'module' => ['label' => $wanted->label(), 'description' => $wanted->description()],
        ])->toResponse($request);
    }
}
