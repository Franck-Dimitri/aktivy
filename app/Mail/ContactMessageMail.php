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
 * Message du formulaire « Nous contacter », transmis à l'équipe Motriks en file d'attente :
 * le visiteur n'attend pas le serveur d'e-mail. Le message est déjà enregistré en base (boîte de support).
 */
class ContactMessageMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    /**
     * @param  array{name: string, email: string, phone?: ?string, company?: ?string, subject: string, message: string}  $data
     * @param  string|null  $supportRequestUuid  identifiant public de la demande (lien vers l'administration)
     */
    public function __construct(public array $data, public ?string $supportRequestUuid = null) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '['.config('app.name').'] '.$this->data['subject'].' - '.$this->data['name'],
            replyTo: [new Address($this->data['email'], $this->data['name'])],
        );
    }

    public function content(): Content
    {
        // Même gabarit que les demandes du centre d'aide : coordonnées cliquables et lien vers l'administration
        return new Content(
            view: 'emails.support-request',
            text: 'emails.text.contact-message',
            with: [
                'data' => $this->data,
                'eyebrow' => 'Message de contact',
                'topic' => $this->data['subject'],
                'body' => $this->data['message'],
                'details' => array_filter([
                    'Nom' => $this->data['name'],
                    'E-mail' => $this->data['email'],
                    'Téléphone' => $this->data['phone'] ?? null,
                    'Entreprise' => $this->data['company'] ?? null,
                ]),
                'url' => $this->supportRequestUuid ? route('admin.support.show', $this->supportRequestUuid) : null,
            ],
        );
    }
}
