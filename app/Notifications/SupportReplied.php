<?php

namespace App\Notifications;

use App\Models\SupportRequest;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Réponse du support Motriks à une demande (centre d'aide ou formulaire de contact).
 * Envoyée tout de suite, pour savoir si elle est bien partie.
 */
class SupportReplied extends Notification
{
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
