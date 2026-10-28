<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use App\Models\Affectation;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

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
                    // Catalogue, création de sites, événements, export : toute l'entreprise
                    'manageCompany' => $request->user()?->hasRole(Role::CompanyAdmin) ?? false,
                    // Équipe, affectations, objectifs (le superviseur sur ses sites)
                    'manageTeam' => $request->user()?->hasRole(Role::CompanyAdmin, Role::Supervisor) ?? false,
                ],
                // Hôtesse ou superviseur rattaché à aucun point de vente : un bandeau le lui dit
                'noSite' => fn () => $this->hasNoSite($request->user()),
                // Compteur de la cloche
                'unreadNotifications' => fn () => $request->user()?->unreadNotifications()->count() ?? 0,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
