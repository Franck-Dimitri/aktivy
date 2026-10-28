<?php

namespace App\Notifications;

use App\Models\Ticket;

/**
 * Une hôtesse a envoyé une demande depuis son espace terrain.
 */
class TicketCreated extends AppNotification
{
    private string $agent;

    private string $subject;

    private bool $urgent;

    public function __construct(Ticket $ticket)
    {
        $this->agent = $ticket->agent?->name ?? 'Une hôtesse';
        $this->subject = $ticket->subject;
        $this->urgent = $ticket->priority === 'urgent';
    }

    public function kind(): string
    {
        return 'ticket';
    }

    public function title(): string
    {
        return ($this->urgent ? 'Demande urgente' : 'Nouvelle demande')." · {$this->agent}";
    }

    public function body(): string
    {
        return "« {$this->subject} »";
    }

    protected function route(): array
    {
        return ['tickets.index'];
    }
}
