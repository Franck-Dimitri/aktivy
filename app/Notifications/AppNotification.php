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

    /** Catégorie, pour l'icône : incident, stock, ticket, attendance, reminder, signup (cf. resources/js/lib/notification-kinds.ts). */
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

    /** Étiquette et teinte de l'e-mail, par catégorie. */
    private const MAIL_STYLE = [
        'incident' => ['Incident signalé', 'red'],
        'stock' => ['Stock critique', 'amber'],
        'ticket' => ['Demande', 'blue'],
        'attendance' => ['Prise de service', 'violet'],
        'reminder' => ['Rappel', 'green'],
        'signup' => ['Inscription', 'teal'],
        'target' => ['Objectif', 'green'],
    ];

    /** Phrase d'introduction de l'e-mail ; par défaut, le texte de la notification. */
    protected function mailIntro(): string
    {
        return $this->body();
    }

    /**
     * Éléments listés sous l'introduction (ex. les hôtesses absentes).
     *
     * @return array<int, string>
     */
    protected function mailItems(): array
    {
        return [];
    }

    /** Citation mise en avant (ex. le message d'une hôtesse). */
    protected function mailQuote(): ?string
    {
        return null;
    }

    /** Libellé du bouton. */
    protected function actionLabel(): string
    {
        return 'Ouvrir dans '.config('app.name');
    }

    public function toMail(object $notifiable): MailMessage
    {
        [$name, $parameters] = $this->route() + [1 => []];
        [$eyebrow, $tone] = self::MAIL_STYLE[$this->kind()] ?? ['Notification', 'slate'];

        $company = $notifiable->company->name ?? null;
        $reason = $company
            ? "Vous recevez cet e-mail en tant que membre de {$company} sur ".config('app.name').'.'
            : 'Vous recevez cet e-mail en tant qu’administrateur de '.config('app.name').'.';

        return (new MailMessage)
            ->subject($this->title())
            ->view(['emails.notification', 'emails.text.notification'], [
                'eyebrow' => $eyebrow,
                'tone' => $tone,
                'title' => $this->title(),
                'preheader' => $this->body(),
                'name' => $notifiable->name ?? null,
                'intro' => $this->mailIntro(),
                'items' => $this->mailItems(),
                'quote' => $this->mailQuote(),
                'action' => $this->actionLabel(),
                'url' => route($name, $parameters),
                'reason' => $reason,
            ]);
    }
}
