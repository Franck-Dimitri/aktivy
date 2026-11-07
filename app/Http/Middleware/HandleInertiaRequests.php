<?php

namespace App\Http\Middleware;

use App\Enums\Module;
use App\Enums\Role;
use App\Http\Controllers\Admin\ImpersonationController;
use App\Models\Affectation;
use App\Models\User;
use App\Support\Toast;
use Closure;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /** Messages de session (`->with('success', '…')`) affichés en toast, par type. */
    private const TOAST_KEYS = ['success', 'error', 'warning', 'info'];

    /**
     * Les contrôleurs posent leurs messages avec `->with('success', '…')` : ils sont convertis en toast
     * ici, sur la page qui suit la redirection. Sans ce pont, aucun n'atteignait l'écran.
     */
    public function handle(Request $request, Closure $next): SymfonyResponse
    {
        if ($request->hasSession() && $request->header('X-Inertia-Partial-Data') === null) {
            foreach (self::TOAST_KEYS as $type) {
                $message = $request->session()->get($type);

                if (is_string($message) && $message !== '') {
                    Toast::{$type}($message);
                    $request->session()->forget($type);
                    break;
                }
            }
        }

        return parent::handle($request, $next);
    }

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    private function hasNoSite(?User $user): bool
    {
        return match ($user?->role) {
            Role::FieldAgent => ! Affectation::where('user_id', $user->id)->ongoing()->exists(),
            Role::Supervisor => $user->managedSiteIds() === [],
            default => false,
        };
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'appUrl' => rtrim(config('app.url'), '/'),
            'auth' => [
                'user' => $request->user(),
                'company' => $request->user()?->company
                    ? [
                        ...$request->user()->company->only('id', 'name', 'logo_path', 'primary_color'),
                        'status' => $request->user()->company->status?->value,
                    ]
                    : null,
                'can' => fn () => [
                    // Suppression de sites, événements, export : toute l'entreprise
                    'manageCompany' => $request->user()?->hasRole(Role::CompanyAdmin) ?? false,
                    // Équipe, sites, catalogue, affectations, objectifs (le superviseur sur ses sites)
                    'manageTeam' => $request->user()?->hasRole(Role::CompanyAdmin, Role::Supervisor) ?? false,
                ],
                // Modules payants actifs : le menu et les pages masquent ce qui n'est pas souscrit
                'modules' => fn () => $request->user()?->company?->activeModules() ?? array_map(fn ($m) => $m->value, Module::cases()),
                // Super administrateur connecté « en tant que » ce compte : bandeau et bouton de retour
                'impersonator' => fn () => ($id = $request->session()->get(ImpersonationController::SESSION_KEY))
                    ? User::find($id)?->only('id', 'name')
                    : null,
                // Hôtesse ou superviseur rattaché à aucun point de vente : un bandeau le lui dit
                'noSite' => fn () => $this->hasNoSite($request->user()),
                // Compteur de la cloche
                'unreadNotifications' => fn () => $request->user()?->unreadNotifications()->count() ?? 0,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // Clé publique VAPID : sans elle, le bouton « Activer les notifications » n'est pas proposé
            'push' => ['publicKey' => config('webpush.vapid.public_key') ?: null],
        ];
    }
}
