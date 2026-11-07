<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Notification de l'application : affichée sous la cloche (database), poussée sur les appareils où
 * l'utilisateur a activé les notifications (WebPush), et envoyée par e-mail aux destinataires qui ont
 * une adresse quand la notification le prévoit.
 */
abstract class AppNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** Envoyer aussi par e-mail (les notifications « temps réel » s'en tiennent à la cloche et au push). */
    protected bool $mail = true;

    /** Pousser sur les appareils abonnés (téléphone, ordinateur). */
    protected bool $push = true;

    /** Catégorie, pour l'icône (cf. resources/js/lib/notification-kinds.ts). */
    abstract public function kind(): string;

    abstract public function title(): string;

    abstract public function body(): string;

    /** Nom et paramètres de la route à ouvrir. */
    abstract protected function route(): array;

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($this->push && method_exists($notifiable, 'pushSubscriptions') && $notifiable->pushSubscriptions()->exists()) {
            $channels[] = WebPushChannel::class;
        }

        if ($this->mail && filled($notifiable->email ?? null)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /** Notification système : titre et corps courts, ouverture de la page concernée au toucher. */
    public function toWebPush(object $notifiable, mixed $notification = null): WebPushMessage
    {
        [$name, $parameters] = $this->route() + [1 => []];

        return (new WebPushMessage)
            ->title(Str::limit($this->title(), 80))
            ->body(Str::limit($this->body(), 180))
            ->icon('/icon-192.png')
            ->badge('/badge-96.png')
            ->lang('fr')
            // Même type, même cible : la nouvelle remplace l'ancienne au lieu de s'empiler
            ->tag($this->kind())
            ->data(['url' => route($name, $parameters, absolute: false)])
            ->options(['TTL' => 86400, 'urgency' => in_array($this->kind(), ['incident', 'attendance', 'stock'], true) ? 'high' : 'normal']);
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
        'export' => ['Mes données', 'green'],
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
