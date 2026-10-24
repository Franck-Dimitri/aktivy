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

    public function __construct(public Company $company, public string $reason) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Votre demande d’inscription sur '.config('app.name'))
            ->view(['emails.company-rejected', 'emails.text.company-rejected'], [
                'name' => $notifiable->name ?? null,
                'company' => $this->company,
                'reason' => $this->reason,
                'url' => route('onboarding.show'),
            ]);
    }
}
