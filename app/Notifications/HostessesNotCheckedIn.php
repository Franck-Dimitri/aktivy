<?php

namespace App\Notifications;

/**
 * Hôtesses attendues aujourd'hui qui n'ont pas pris leur service.
 */
class HostessesNotCheckedIn extends AppNotification
{
    /**
     * @param  array<int, string>  $hostesses  « Awa (Akwa, attendue à 08:00) »
     */
    public function __construct(private array $hostesses) {}

    public function kind(): string
    {
        return 'attendance';
    }

    public function title(): string
    {
        $count = count($this->hostesses);

        return $count > 1 ? "{$count} hôtesses n’ont pas pointé" : 'Une hôtesse n’a pas pointé';
    }

    public function body(): string
    {
        return 'Pas encore de prise de service : '.implode(', ', $this->hostesses).'.';
    }

    protected function route(): array
    {
        return ['daily-reports.index'];
    }
}
