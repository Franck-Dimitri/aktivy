<?php

namespace App\Http\Middleware;

use App\Enums\Module;
use App\Enums\Plan;
use App\Enums\Role;
use App\Http\Controllers\Admin\ImpersonationController;
use App\Models\Affectation;
use App\Models\User;
use App\Support\Toast;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
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

        // Téléphone partagé : les pages vues par un compte sont chiffrées dans l'historique du navigateur,
        // et la clé est jetée à la déconnexion (AccountResponses) : le bouton Retour ne réaffiche plus
        // les écrans du compte précédent. Le navigateur ne chiffre que sur une page sécurisée (https, localhost).
        Inertia::encryptHistory($request->user() !== null && $this->secureContext($request));

        return parent::handle($request, $next);
    }

    private function secureContext(Request $request): bool
    {
        return str_starts_with((string) config('app.url'), 'https://')
            || in_array($request->getHost(), ['localhost', '127.0.0.1', '::1'], true);
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

    /** Compte sans point de vente : hôtesse sans affectation en cours, superviseur sans site. */
    private function hasNoSite(?User $user): bool
    {
        return match ($user?->role) {
            Role::FieldAgent => ! Affectation::where('user_id', $user->id)->ongoing()->exists(),
            Role::Supervisor => $user->managedSiteIds() === [],
            default => false,
        };
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            // Champ caché des formulaires de connexion : ils restent utilisables sans JavaScript
            'csrf_token' => fn () => csrf_token(),
            'appUrl' => rtrim(config('app.url'), '/'),
            'auth' => [
                // Sans ses relations : la ligne « company » ci-dessous charge l'entreprise sur l'utilisateur, qui
                // partait alors entière avec lui sur chaque page (forfait, motif de rejet, chemins des pièces
                // d'identité…), même chez les hôtesses. Seuls les champs choisis de « company » sont envoyés.
                'user' => $request->user()?->withoutRelations(),
                // Tableau de bord du rôle (Role::homeRoute) : bouton « Mon espace » du site public
                'home' => $request->user()?->homeUrl(),
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
                // Forfait en vigueur de l'entreprise
                'plan' => fn () => ($company = $request->user()?->company)
                    ? ['key' => $company->currentPlan()->value, 'label' => $company->currentPlan()->label()]
                    : null,
                // Fonctions du forfait : le menu et les pages masquent ce qui n'est pas compris
                'modules' => fn () => $request->user()?->company?->activeModules() ?? array_map(fn ($m) => $m->value, Module::cases()),
                // Fonctions non comprises, avec le forfait qui les débloque : le menu les montre avec un cadenas
                'lockedModules' => fn () => ($company = $request->user()?->company)
                    ? collect(Module::cases())
                        ->reject(fn (Module $m) => $company->hasModule($m))
                        ->mapWithKeys(fn (Module $m) => [$m->value => Plan::lowestWith($m)->shortLabel()])
                        ->all()
                    : [],
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
