<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use App\Notifications\CompanyInvitation;
use App\Support\PhoneNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Aide au gérant d'une entreprise : renvoi de l'e-mail de confirmation, de l'invitation,
 * ou d'un lien pour choisir un nouveau mot de passe. Le super administrateur ne voit
 * ni ne choisit jamais le mot de passe.
 */
class CompanyManagerController extends Controller
{
    /**
     * Corrige le nom, l'e-mail ou le téléphone du gérant. Une nouvelle adresse doit être confirmée :
     * le gérant reçoit l'invitation (s'il ne l'a pas encore ouverte) ou un e-mail de confirmation.
     */
    public function update(Request $request, Company $company, User $user): RedirectResponse
    {
        abort_unless($user->company_id === $company->id && $user->role === Role::CompanyAdmin, 404);

        $request->merge([
            'email' => Str::lower(trim((string) $request->input('email'))),
            'phone' => PhoneNumber::normalize($request->input('phone')),
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            // Les comptes supprimés comptent aussi : l'index unique les inclut
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($user->id)],
        ], [
            'email.unique' => 'Cette adresse e-mail est déjà utilisée par un autre compte.',
            'phone.unique' => 'Ce numéro est déjà utilisé par un autre compte.',
        ], ['name' => 'Le nom', 'email' => 'L’e-mail', 'phone' => 'Le téléphone']);

        $old = $user->only('name', 'email', 'phone');
        $emailChanged = $data['email'] !== $user->email;

        $user->forceFill([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'email_verified_at' => $emailChanged ? null : $user->email_verified_at,
        ])->save();

        $changed = array_keys(array_diff_assoc(array_map('strval', $user->only('name', 'email', 'phone')), array_map('strval', $old)));
        if ($changed === []) {
            return back()->with('success', 'Aucune modification.');
        }

        AuditLog::record('manager.updated_by_admin', $user, array_intersect_key($old, array_flip($changed)), $user->only($changed));

        if ($emailChanged) {
            $user->must_change_password
                ? $user->notify(new CompanyInvitation($company))
                : $user->sendEmailVerificationNotification();

            return back()->with('success', 'Gérant mis à jour. Un e-mail de '.($user->must_change_password ? 'invitation' : 'confirmation')." part à {$user->email}.");
        }

        return back()->with('success', 'Gérant mis à jour.');
    }

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
