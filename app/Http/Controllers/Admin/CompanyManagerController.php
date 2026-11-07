<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use App\Notifications\CompanyInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Password;

/**
 * Aide au gérant d'une entreprise : renvoi de l'e-mail de confirmation, de l'invitation,
 * ou d'un lien pour choisir un nouveau mot de passe. Le super administrateur ne voit
 * ni ne choisit jamais le mot de passe.
 */
class CompanyManagerController extends Controller
{
    public function resendVerification(Company $company, User $user): RedirectResponse
    {
        $this->authorizeManager($company, $user);

        if ($user->hasVerifiedEmail()) {
            return back()->with('success', 'Cette adresse est déjà confirmée.');
        }

        $user->sendEmailVerificationNotification();
        AuditLog::record('manager.verification_resent', $user);

        return back()->with('success', "E-mail de confirmation renvoyé à {$user->email}.");
    }

    public function resendInvitation(Company $company, User $user): RedirectResponse
    {
        $this->authorizeManager($company, $user);
        abort_unless($user->must_change_password, 422, 'Ce gérant a déjà choisi son mot de passe.');

        $user->notify(new CompanyInvitation($company));
        AuditLog::record('manager.invitation_resent', $user);

        return back()->with('success', "Invitation renvoyée à {$user->email}.");
    }

    public function sendPasswordReset(Company $company, User $user): RedirectResponse
    {
        $this->authorizeManager($company, $user);

        $status = Password::broker()->sendResetLink(['email' => $user->email]);
        if ($status !== Password::RESET_LINK_SENT) {
            return back()->with('error', __($status));
        }

        AuditLog::record('manager.password_reset_sent', $user);

        return back()->with('success', "Lien de nouveau mot de passe envoyé à {$user->email}.");
    }

    private function authorizeManager(Company $company, User $user): void
    {
        abort_unless($user->company_id === $company->id && $user->role === Role::CompanyAdmin, 404);
        abort_if($user->email === null, 422, 'Ce gérant n’a pas d’adresse e-mail.');
    }
}
