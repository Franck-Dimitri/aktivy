<?php

namespace App\Notifications;

use App\Models\Company;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Prévient le gérant que l'inscription de son entreprise a été refusée, avec le motif.
 */
class CompanyRejected extends Notification implements ShouldQueue
{
    use Queueable;

    /** E-mail : 3 essais espacés si le serveur d'e-mail ne répond pas. */
    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public Company $company, public string $reason) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Votre dossier est à compléter · '.config('app.name'))
            ->view(['emails.company-rejected', 'emails.text.company-rejected'], [
                'name' => $notifiable->name ?? null,
                'company' => $this->company,
                'reason' => $this->reason,
                'url' => route('onboarding.show'),
            ]);
    }
}
