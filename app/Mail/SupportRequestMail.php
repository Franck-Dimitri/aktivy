<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Demande de support (centre d'aide) envoyée à l'équipe Motriks, en file d'attente :
 * l'utilisateur n'attend pas le serveur d'e-mail. La demande est déjà enregistrée en base.
 */
class SupportRequestMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** Nouvelles tentatives si le serveur d'e-mail ne répond pas. */
    public int $tries = 3;

    /** @var list<int> Délai entre les tentatives, en secondes. */
    public array $backoff = [60, 300];

    /**
     * @param  array<string, string>  $details
     */
    public function __construct(
        public string $topic,
        public string $body,
        public array $details,
        public string $subjectLine,
        public ?string $replyToEmail = null,
        public ?string $replyToName = null,
        public ?int $supportRequestId = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine,
            replyTo: $this->replyToEmail ? [new Address($this->replyToEmail, $this->replyToName)] : [],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.support-request',
            text: 'emails.text.support-request',
            with: [
                'topic' => $this->topic,
                'body' => $this->body,
                'details' => $this->details,
                // Lien direct vers la demande dans la boîte de support de l'administration
                'url' => $this->supportRequestId ? route('admin.support.show', $this->supportRequestId) : null,
            ],
        );
    }
}
