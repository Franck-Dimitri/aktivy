<?php

namespace App\Http\Middleware;

use App\Enums\Module;
use App\Enums\Plan;
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

        $needed = Plan::lowestWith($wanted);

        abort_unless($request->isMethod('GET'), 403, "« {$wanted->label()} » n’est pas compris dans votre forfait {$company->currentPlan()->label()} : disponible à partir de {$needed->label()}.");

        return Inertia::render('module-locked', [
            'module' => ['label' => $wanted->label(), 'description' => $wanted->description()],
            'plan' => ['current' => $company->currentPlan()->label(), 'needed' => $needed->label(), 'price' => $needed->price()],
        ])->toResponse($request);
    }
}
