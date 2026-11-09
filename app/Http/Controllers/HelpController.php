<?php

namespace App\Http\Controllers;

use App\Mail\SupportRequestMail;
use App\Models\SupportRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Centre d'aide : guides courts selon le rôle, et demande au support depuis l'application
 * (l'identité et l'entreprise sont jointes d'office, rien à ressaisir).
 */
class HelpController extends Controller
{
    /** Sujets proposés dans le formulaire de support. */
    public const TOPICS = [
        'question' => 'Une question sur l’utilisation',
        'bug' => 'Quelque chose ne fonctionne pas',
        'billing' => 'Abonnement et forfait',
        'idea' => 'Une suggestion',
    ];

    public function index(): Response
    {
        $whatsapp = preg_replace('/\D/', '', (string) config('motriks.support.whatsapp'));

        return Inertia::render('help/index', [
            'support' => [
                'email' => config('motriks.support.email'),
                'whatsapp' => $whatsapp !== '' ? $whatsapp : null,
                'topics' => collect(self::TOPICS)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            ],
        ]);
    }

    public function support(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'topic' => ['required', Rule::in(array_keys(self::TOPICS))],
            'message' => ['required', 'string', 'min:10', 'max:4000'],
            'page' => ['nullable', 'string', 'max:500'],
        ], [
            'message.required' => 'Écrivez votre message.',
            'message.min' => 'Votre message est trop court (10 caractères minimum).',
        ]);

        $user = $request->user();
        $recipient = config('motriks.support.email');
        $topic = self::TOPICS[$data['topic']];

        // Gardée pour être suivie dans l'administration, même si l'e-mail ne part pas
        $supportRequest = SupportRequest::create([
            'company_id' => $user->company_id,
            'user_id' => $user->id,
            'source' => 'help',
            'topic' => $topic,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'message' => $data['message'],
            'page' => ! empty($data['page']) ? Str::limit($data['page'], 490) : null,
        ]);

        try {
            // En file d'attente : l'utilisateur n'attend pas le serveur d'e-mail
            Mail::to($recipient)->queue(new SupportRequestMail(
                topic: $topic,
                body: $data['message'],
                details: array_filter([
                    'Nom' => $user->name,
                    'E-mail' => $user->email,
                    'Téléphone' => $user->phone,
                    'Rôle' => $user->role?->label(),
                    'Entreprise' => $user->company ? $user->company->name.' (n° '.$user->company_id.')' : null,
                    'Page' => ! empty($data['page']) ? Str::limit($data['page'], 200) : null,
                    'Navigateur' => Str::limit((string) $request->userAgent(), 160),
                ]),
                subjectLine: '['.config('app.name').'] '.$topic.' · '.($user->company->name ?? $user->name),
                replyToEmail: $user->email,
                replyToName: $user->name,
                supportRequestId: $supportRequest->id,
            ));
        } catch (Throwable $e) {
            // La demande est enregistrée : le support la verra dans l'administration
            Log::error('Échec de l’envoi d’une demande de support : '.$e->getMessage(), ['user' => $user->id]);
        }

        return back()->with('success', 'Message envoyé au support. Nous vous répondons sous 24 h'.($user->email ? ' par e-mail.' : '.'));
    }
}
