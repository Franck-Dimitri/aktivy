<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * « Se connecter en tant que » le gérant d'une entreprise, pour l'aider à régler un problème.
 *
 * Le super administrateur voit exactement ce que voit le gérant. Un bandeau le rappelle sur
 * chaque page, les réglages sensibles du compte (mot de passe, double authentification,
 * clés d'accès, suppression) sont bloqués, et l'entrée comme la sortie sont dans le journal.
 */
class ImpersonationController extends Controller
{
    /** Clé de session qui garde l'identifiant du super administrateur. */
    public const SESSION_KEY = 'impersonator_id';

    /** Marqueur posé dans le conteneur pendant le basculement de compte. */
    public const SWITCHING = 'impersonation.switching';

    public function start(Request $request, Company $company, User $user): RedirectResponse
    {
        abort_unless($user->company_id === $company->id && $user->role === Role::CompanyAdmin, 404);
        abort_unless($company->isActive() && $user->status === AccountStatus::Active, 422, 'L’entreprise ou le compte n’est pas actif.');
        abort_if($user->must_change_password, 422, 'Ce gérant n’a pas encore choisi son mot de passe : son espace n’est pas encore ouvert.');

        $admin = $request->user();

        AuditLog::record('admin.impersonation_started', $user, new: ['admin' => $admin->name, 'manager' => $user->name]);

        $request->session()->put(self::SESSION_KEY, $admin->id);
        app()->instance(self::SWITCHING, true);
        Auth::guard('web')->login($user);

        return redirect($user->homeUrl())->with('success', "Vous voyez l’espace de {$company->name} comme {$user->name}.");
    }

    public function stop(Request $request): RedirectResponse
    {
        $adminId = $request->session()->pull(self::SESSION_KEY);
        $admin = $adminId ? User::find($adminId) : null;

        abort_unless($admin && $admin->role === Role::SuperAdmin, 403);

        $manager = $request->user();
        AuditLog::record('admin.impersonation_ended', $manager, new: ['admin' => $admin->name, 'manager' => $manager?->name], actor: $admin);

        app()->instance(self::SWITCHING, true);
        Auth::guard('web')->login($admin);

        // Retour sur la fiche de l'entreprise (adresse par UUID, d'où le modèle plutôt que company_id)
        return $manager?->company
            ? redirect()->route('admin.companies.show', $manager->company)->with('success', 'Vous êtes revenu à l’administration.')
            : redirect()->route('admin.dashboard');
    }
}
