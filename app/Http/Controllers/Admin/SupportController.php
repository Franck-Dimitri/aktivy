<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SupportReply;
use App\Models\SupportRequest;
use App\Notifications\SupportReplied;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Boîte de support : demandes du centre d'aide et du formulaire de contact, réponses par e-mail.
 */
class SupportController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('statut');
        $status = array_key_exists((string) $status, SupportRequest::STATUSES) ? $status : null;

        $counts = SupportRequest::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return Inertia::render('admin/support/index', [
            'requests' => SupportRequest::query()
                ->with('company:id,name')
                ->withCount('replies')
                ->when($status, fn ($q) => $q->where('status', $status))
                ->latest()
                ->paginate(30)
                ->withQueryString()
                ->through(fn (SupportRequest $r) => [
                    'id' => $r->id,
                    'source' => $r->source,
                    'topic' => $r->topic,
                    'name' => $r->name,
                    'company' => $r->company?->name ?? $r->company_name,
                    'excerpt' => Str::limit($r->message, 140),
                    'status' => $r->status,
                    'replies_count' => $r->replies_count,
                    'at' => $r->created_at?->format('d/m/Y H:i'),
                ]),
            'status' => $status,
            'counts' => [
                'all' => (int) $counts->sum(),
                ...collect(SupportRequest::STATUSES)->map(fn ($label, $key) => (int) ($counts[$key] ?? 0))->all(),
            ],
        ]);
    }

    public function show(SupportRequest $supportRequest): Response
    {
        $supportRequest->load(['company:id,name', 'user:id,name,role', 'replies.user:id,name']);

        return Inertia::render('admin/support/show', [
            'request' => [
                'id' => $supportRequest->id,
                'source' => $supportRequest->source,
                'source_label' => SupportRequest::SOURCES[$supportRequest->source] ?? $supportRequest->source,
                'topic' => $supportRequest->topic,
                'name' => $supportRequest->name,
                'email' => $supportRequest->email,
                'phone' => $supportRequest->phone,
                'role' => $supportRequest->user?->role?->label(),
                'company_id' => $supportRequest->company_id,
                'company' => $supportRequest->company?->name ?? $supportRequest->company_name,
                'message' => $supportRequest->message,
                'page' => $supportRequest->page,
                'status' => $supportRequest->status,
                'at' => $supportRequest->created_at?->format('d/m/Y à H:i'),
                'replies' => $supportRequest->replies->map(fn (SupportReply $reply) => [
                    'id' => $reply->id,
                    'body' => $reply->body,
                    'author' => $reply->user?->name,
                    'emailed' => $reply->emailed,
                    'at' => $reply->created_at?->format('d/m/Y à H:i'),
                ]),
            ],
        ]);
    }

    /**
     * Répond à la demande : la réponse est gardée et envoyée par e-mail si la personne a une adresse.
     */
    public function reply(Request $request, SupportRequest $supportRequest): RedirectResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'min:2', 'max:6000'],
            'resolve' => ['boolean'],
        ], ['body.required' => 'Écrivez votre réponse.']);

        $emailed = false;
        if ($supportRequest->email) {
            try {
                Notification::route('mail', [$supportRequest->email => $supportRequest->name])
                    ->notifyNow(new SupportReplied($supportRequest, $data['body']));
                $emailed = true;
            } catch (Throwable $e) {
                Log::error('Réponse du support non envoyée : '.$e->getMessage(), ['support_request' => $supportRequest->id]);
            }
        }

        $supportRequest->replies()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
            'emailed' => $emailed,
        ]);

        $resolve = (bool) ($data['resolve'] ?? false);
        $supportRequest->update([
            'status' => $resolve ? 'resolved' : 'answered',
            'answered_at' => now(),
            'resolved_at' => $resolve ? now() : $supportRequest->resolved_at,
        ]);

        AuditLog::record('support.replied', $supportRequest, new: ['emailed' => $emailed, 'resolved' => $resolve]);

        if ($supportRequest->email && ! $emailed) {
            return back()->with('error', 'Réponse enregistrée, mais l’e-mail n’a pas pu partir. Réessayez plus tard ou répondez par téléphone.');
        }

        return back()->with('success', $emailed ? "Réponse envoyée à {$supportRequest->email}." : 'Réponse enregistrée (aucune adresse e-mail pour l’envoyer).');
    }

    public function updateStatus(Request $request, SupportRequest $supportRequest): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(array_keys(SupportRequest::STATUSES))]]);

        $supportRequest->update([
            'status' => $data['status'],
            'resolved_at' => $data['status'] === 'resolved' ? now() : null,
        ]);

        return back()->with('success', 'Demande marquée « '.SupportRequest::STATUSES[$data['status']].' ».');
    }
}
