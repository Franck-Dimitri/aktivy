<?php

namespace App\Notifications;

use App\Models\SupportRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Réponse du support Motriks à une demande (centre d'aide ou formulaire de contact).
 * En file d'attente : l'administrateur n'attend pas le serveur d'e-mail ; en cas d'échec,
 * l'envoi est retenté, puis visible dans les tâches échouées (php artisan queue:failed).
 */
class SupportReplied extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public SupportRequest $request, public string $body) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Re : '.$this->request->topic.' · '.config('app.name'))
            ->replyTo(config('motriks.support.email') ?: config('mail.from.address'))
            ->view(['emails.support-reply', 'emails.text.support-reply'], [
                'name' => $this->request->name,
                'topic' => $this->request->topic,
                'body' => $this->body,
                'original' => $this->request->message,
                'number' => $this->request->id,
            ]);
    }
}
