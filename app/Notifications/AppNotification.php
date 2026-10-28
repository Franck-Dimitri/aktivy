<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification de l'application : affichée sous la cloche, et envoyée par e-mail
 * aux destinataires qui ont une adresse (sauf si la notification est réservée à la cloche).
 */
abstract class AppNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** Envoyer aussi par e-mail. */
    protected bool $mail = true;

    /** Catégorie, pour l'icône : incident, stock, ticket, attendance, reminder. */
    abstract public function kind(): string;

    abstract public function title(): string;

    abstract public function body(): string;

    /** Nom et paramètres de la route à ouvrir. */
    abstract protected function route(): array;

    public function via(object $notifiable): array
    {
        return $this->mail && filled($notifiable->email ?? null) ? ['database', 'mail'] : ['database'];
    }

    public function toArray(object $notifiable): array
    {
        [$name, $parameters] = $this->route() + [1 => []];

        return [
            'kind' => $this->kind(),
            'title' => $this->title(),
            'body' => $this->body(),
            'url' => route($name, $parameters, absolute: false),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        [$name, $parameters] = $this->route() + [1 => []];

        return (new MailMessage)
            ->subject($this->title())
            ->greeting('Bonjour '.($notifiable->name ?? '').',')
            ->line($this->body())
            ->action('Voir dans '.config('app.name'), route($name, $parameters))
            ->salutation('L’équipe '.config('app.name'));
    }
}
