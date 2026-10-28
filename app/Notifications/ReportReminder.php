<?php

namespace App\Notifications;

/**
 * Rappel à l'hôtesse : son rapport du jour n'est pas encore envoyé.
 * Uniquement sous la cloche : les hôtesses se connectent surtout par téléphone.
 */
class ReportReminder extends AppNotification
{
    protected bool $mail = false;

    public function __construct(private int $visitId, private string $site) {}

    public function kind(): string
    {
        return 'reminder';
    }

    public function title(): string
    {
        return 'Pensez à envoyer votre rapport';
    }

    public function body(): string
    {
        return "Votre rapport du jour à {$this->site} n’est pas encore soumis.";
    }

    protected function route(): array
    {
        return ['terrain.report.show', ['visit' => $this->visitId]];
    }
}
