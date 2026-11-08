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
     */
    public function __construct(public array $data) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '['.config('app.name').'] '.$this->data['subject'].' - '.$this->data['name'],
            replyTo: [new Address($this->data['email'], $this->data['name'])],
        );
    }

    public function content(): Content
    {
        return new Content(text: 'emails.text.contact-message', with: ['data' => $this->data]);
    }
}
