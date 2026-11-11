<?php

namespace App\Notifications;

use App\Http\Controllers\Auth\InvitationController;
use App\Models\Company;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Invitation du gérant d'une entreprise créée par le super administrateur :
 * un lien signé, valable 7 jours, pour confirmer son adresse et choisir son mot de passe.
 */
class CompanyInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    /** E-mail : 3 essais espacés si le serveur d'e-mail ne répond pas. */
    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public Company $company) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = URL::temporarySignedRoute(
            'invitation.accept',
            now()->addDays(InvitationController::VALID_DAYS),
            // Identifiant public (UUID) : le lien ne révèle pas le numéro du compte
            ['user' => $notifiable->getRouteKey()],
        );

        return (new MailMessage)
            ->subject('Votre espace '.$this->company->name.' vous attend · '.config('app.name'))
            ->view(['emails.company-invitation', 'emails.text.company-invitation'], [
                'name' => $notifiable->name ?? null,
                'company' => $this->company,
                'url' => $url,
                'days' => InvitationController::VALID_DAYS,
            ]);
    }
}
