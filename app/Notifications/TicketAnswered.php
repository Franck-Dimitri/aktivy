<?php

namespace App\Notifications;

use App\Models\Ticket;
use Illuminate\Support\Str;

/**
 * Un responsable a répondu à la demande d'une hôtesse, ou l'a résolue.
 */
class TicketAnswered extends AppNotification
{
    private string $subject;

    private ?string $response;

    private bool $resolved;

    private ?string $responder;

    public function __construct(Ticket $ticket, bool $newResponse)
    {
        $this->subject = $ticket->subject;
        $this->response = $newResponse ? $ticket->response : null;
        $this->resolved = $ticket->status === 'closed';
        $this->responder = $ticket->responder?->name;
    }

    public function kind(): string
    {
        return 'ticket';
    }

    public function title(): string
    {
        return match (true) {
            $this->response !== null && $this->resolved => 'Demande résolue',
            $this->response !== null => 'Réponse à votre demande',
            default => 'Votre demande est résolue',
        };
    }

    public function body(): string
    {
        $intro = "« {$this->subject} »";

        if ($this->response === null) {
            return "{$intro} a été marquée comme résolue.";
        }

        return $intro.' · '.($this->responder ? "{$this->responder} : " : '').Str::limit($this->response, 140);
    }

    protected function mailIntro(): string
    {
        return $this->response === null
            ? "Votre demande « {$this->subject} » a été marquée comme résolue."
            : ($this->responder ?? 'Votre responsable')." a répondu à votre demande « {$this->subject} » :";
    }

    protected function mailQuote(): ?string
    {
        return $this->response;
    }

    protected function actionLabel(): string
    {
        return 'Voir ma demande';
    }

    protected function route(): array
    {
        return ['terrain.tickets.index'];
    }
}
