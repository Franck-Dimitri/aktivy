<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;

/**
 * Lien d'invitation reçu par un gérant dont l'entreprise a été créée par le super administrateur.
 *
 * Le lien est signé et valable 7 jours. L'ouvrir prouve que l'adresse appartient au gérant :
 * elle est confirmée, puis il choisit son mot de passe sur la page habituelle. Une fois le mot
 * de passe choisi, le lien ne sert plus.
 *
 * Le lien est aussi lié à l'adresse à laquelle il a été envoyé (paramètre « cle », signé avec lui) :
 * si l'adresse du gérant est corrigée, les liens partis vers l'ancienne ne marchent plus. Sinon, le
 * destinataire d'une adresse erronée pouvait confirmer la nouvelle sans l'avoir et prendre l'espace.
 */
class InvitationController extends Controller
{
    /** Durée de validité du lien d'invitation. */
    public const VALID_DAYS = 7;

    /** Empreinte de l'adresse du compte, portée par le lien d'invitation. */
    public static function emailKey(User $user): string
    {
        return substr(hash_hmac('sha256', 'invitation|'.mb_strtolower((string) $user->email), (string) config('app.key')), 0, 24);
    }

    public function accept(Request $request, User $user): RedirectResponse
    {
        if (! hash_equals(self::emailKey($user), (string) $request->query('cle'))) {
            return redirect()->route('login')
                ->with('status', 'Ce lien d’invitation n’est plus valable : l’adresse du compte a changé. Demandez un nouvel envoi à l’équipe Motriks.');
        }

        if (! $user->must_change_password) {
            return redirect()->route('login')
                ->with('status', 'Cette invitation a déjà été utilisée. Connectez-vous, ou choisissez « Mot de passe oublié ».');
        }

        // Une autre session ouverte sur ce navigateur ne doit pas se mélanger à l'invitation
        if (Auth::check() && Auth::id() !== $user->id) {
            Auth::logout();
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        AuditLog::record('manager.invitation_opened', $user, actor: $user);

        $token = Password::broker()->createToken($user);

        return redirect()->route('password.reset', ['token' => $token, 'email' => $user->email]);
    }
}
