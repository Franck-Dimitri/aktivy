<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SupportReply;
use App\Models\SupportRequest;
use App\Notifications\SupportReplied;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
    /**
     * Boîte de réception. `?demande=ID` ouvre la demande dans la fenêtre de réponse (prop `selected`,
     * calculée seulement quand elle est demandée : l'ouverture recharge uniquement cette prop).
     */
    public function index(Request $request): Response
    {
        $status = $request->query('statut');
        $status = array_key_exists((string) $status, SupportRequest::STATUSES) ? $status : null;
        $search = trim((string) $request->query('q', ''));
        $search = mb_substr($search, 0, 100);
        $selectedId = $request->integer('demande') ?: null;

        $counts = SupportRequest::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return Inertia::render('admin/support/index', [
            'requests' => SupportRequest::query()
                ->with('company:id,name')
                ->withCount('replies')
                ->when($status, fn ($q) => $q->where('status', $status))
                ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                    ->where('topic', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%")
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', "%{$search}%"))))
                ->latest()
                ->latest('id')
                ->paginate(30)
                // La demande ouverte ne suit pas d'une page à l'autre
                ->appends($request->except(['demande', 'page']))
                ->through(fn (SupportRequest $r) => [
                    'id' => $r->id,
                    'source' => $r->source,
                    'topic' => $r->topic,
                    'name' => $r->name,
                    'email' => $r->email,
                    'company' => $r->company?->name ?? $r->company_name,
                    'excerpt' => Str::limit(preg_replace('/\s+/', ' ', $r->message), 160),
                    'status' => $r->status,
                    'replies_count' => $r->replies_count,
                    'at' => $r->created_at?->format('d/m/Y à H:i'),
                    'ago' => $r->created_at ? self::ago($r->created_at) : null,
                ]),
            'status' => $status,
            'search' => $search,
            'counts' => [
                'all' => (int) $counts->sum(),
                ...collect(SupportRequest::STATUSES)->map(fn ($label, $key) => (int) ($counts[$key] ?? 0))->all(),
            ],
            'selected' => fn () => $selectedId ? self::detail(SupportRequest::find($selectedId)) : null,
            'insights' => fn () => self::insights(),
        ]);
    }

    /**
     * Indicateurs de la boîte : demandes reçues cette semaine, résolues ce mois-ci, et délai médian
     * de première réponse sur les 30 derniers jours (première réponse du support, pas la dernière).
     *
     * @return array{week: int, resolved_month: int, first_response_minutes: ?int, answered_30d: int}
     */
    private static function insights(): array
    {
        $since = now()->subDays(30);

        $delays = SupportRequest::query()
            ->where('created_at', '>=', $since)
            ->withMin('replies as first_reply_at', 'created_at')
            ->get(['id', 'created_at'])
            ->filter(fn (SupportRequest $r) => $r->first_reply_at !== null)
            ->map(fn (SupportRequest $r) => max(0, (int) round($r->created_at->diffInMinutes(Carbon::parse($r->first_reply_at)))))
            ->sort()
            ->values();

        return [
            'week' => SupportRequest::where('created_at', '>=', now()->subDays(7))->count(),
            'resolved_month' => SupportRequest::where('status', 'resolved')->where('resolved_at', '>=', now()->startOfMonth())->count(),
            'first_response_minutes' => $delays->isEmpty() ? null : (int) $delays->median(),
            'answered_30d' => $delays->count(),
        ];
    }

    /** Lien direct vers une demande (notification, e-mail) : la boîte de réception, demande ouverte. */
    public function show(SupportRequest $supportRequest): RedirectResponse
    {
        return redirect()->route('admin.support.index', ['demande' => $supportRequest->id]);
    }

    /** Date lisible : « il y a 5 minutes », « hier à 14:20 », puis la date complète. */
    private static function ago(\DateTimeInterface $at): string
    {
        $at = Carbon::instance($at)->locale('fr');

        return match (true) {
            $at->gt(now()->subHour()) => $at->diffForHumans(),
            $at->isToday() => 'aujourd’hui à '.$at->format('H:i'),
            $at->isYesterday() => 'hier à '.$at->format('H:i'),
            $at->gt(now()->subDays(6)->startOfDay()) => $at->isoFormat('dddd [à] HH:mm'),
            $at->isCurrentYear() => $at->isoFormat('D MMM'),
            default => $at->format('d/m/Y'),
        };
    }

    /** @return array<string, mixed>|null */
    private static function detail(?SupportRequest $supportRequest): ?array
    {
        if (! $supportRequest) {
            return null;
        }

        $supportRequest->load(['company:id,name', 'user:id,name,role', 'replies.user:id,name']);

        return [
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
            'ago' => $supportRequest->created_at ? self::ago($supportRequest->created_at) : null,
            'replies' => $supportRequest->replies->map(fn (SupportReply $reply) => [
                'id' => $reply->id,
                'body' => $reply->body,
                'author' => $reply->user?->name,
                'emailed' => $reply->emailed,
                'at' => $reply->created_at?->format('d/m/Y à H:i'),
                'ago' => $reply->created_at ? self::ago($reply->created_at) : null,
            ]),
        ];
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

        // E-mail mis en file d'attente (envoyé par le worker, avec nouvelles tentatives en cas d'échec) :
        // « emailed » signifie que l'envoi est programmé ; un échec de mise en file est signalé tout de suite
        $emailed = false;
        if ($supportRequest->email) {
            try {
                Notification::route('mail', [$supportRequest->email => $supportRequest->name])
                    ->notify(new SupportReplied($supportRequest, $data['body']));
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
