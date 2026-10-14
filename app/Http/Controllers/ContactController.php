<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ContactController
{
    /** Délai minimum (en secondes) entre l'ouverture de la page et l'envoi : en dessous, c'est un robot. */
    private const MIN_SECONDS_BEFORE_SUBMIT = 3;

    public function show(): Response
    {
        return Inertia::render('contact', [
            // heure d'ouverture de la page, chiffrée : le visiteur ne peut ni la lire ni la modifier
            'formToken' => encrypt(now()->timestamp),
        ]);
    }

    public function send(Request $request): RedirectResponse
    {
        // Anti-spam : en cas de robot, on fait comme si tout s'était bien passé,
        // mais aucun e-mail n'est envoyé (le robot ne sait pas qu'il a été repéré).
        if ($reason = $this->spamReason($request)) {
            Log::info('Message de contact ignoré (anti-spam) : '.$reason, ['ip' => $request->ip()]);

            return back();
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:40'],
            'company' => ['nullable', 'string', 'max:150'],
            'subject' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'min:10', 'max:4000'],
        ], [
            'name.required' => 'Veuillez indiquer votre nom.',
            'email.required' => 'Veuillez indiquer votre e-mail.',
            'email.email' => "Cette adresse e-mail n'est pas valide.",
            'subject.required' => 'Veuillez choisir un sujet.',
            'message.required' => 'Veuillez écrire votre message.',
            'message.min' => 'Votre message est trop court (10 caractères minimum).',
        ]);

        // Adresse qui reçoit les messages (par défaut : l'adresse d'expédition configurée dans .env)
        $recipient = config('mail.from.address');

        $body = implode("\n", [
            'Nouveau message depuis la page Contact',
            '',
            'Sujet : '.$data['subject'],
            'Nom : '.$data['name'],
            'E-mail : '.$data['email'],
            'Téléphone : '.($data['phone'] ?? '-'),
            'Entreprise : '.($data['company'] ?? '-'),
            '',
            'Message :',
            $data['message'],
        ]);

        try {
            Mail::raw($body, function ($message) use ($data, $recipient) {
                $message->to($recipient)
                    ->replyTo($data['email'], $data['name'])
                    ->subject('['.config('app.name').'] '.$data['subject'].' - '.$data['name']);
            });
        } catch (Throwable $e) {
            Log::error('Échec envoi message de contact : '.$e->getMessage());

            return back()->withErrors([
                'message' => "Votre message n'a pas pu être envoyé. Réessayez ou écrivez-nous sur WhatsApp.",
            ]);
        }

        return back();
    }

    /**
     * Renvoie la raison si l'envoi ressemble à un robot, sinon null.
     */
    private function spamReason(Request $request): ?string
    {
        // 1. Champ piège : invisible pour un humain, donc toujours vide chez un vrai visiteur
        if (filled($request->input('website'))) {
            return 'champ piège rempli';
        }

        // 2. Délai : le jeton contient l'heure d'ouverture de la page
        $token = $request->input('form_token');
        if (! is_string($token) || $token === '') {
            return 'jeton absent';
        }

        try {
            $openedAt = (int) decrypt($token);
        } catch (DecryptException) {
            return 'jeton invalide';
        }

        if (now()->timestamp - $openedAt < self::MIN_SECONDS_BEFORE_SUBMIT) {
            return 'formulaire envoyé trop vite';
        }

        return null;
    }
}