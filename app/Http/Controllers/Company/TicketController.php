<?php

namespace App\Http\Controllers\Company;

use App\Enums\AccountStatus;
use App\Http\Controllers\Company\Concerns\PaginatesLists;
use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Notifications\TicketAnswered;
use App\Support\Notifications\Notify;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Demandes envoyées par les hôtesses depuis l'espace terrain : le responsable y répond
 * et fait avancer leur statut (ouvert → en cours → résolu).
 */
class TicketController extends Controller
{
    use PaginatesLists;

    private const STATUSES = ['open', 'in_review', 'closed'];

    /** Onglets de la liste : à traiter, sans réponse, résolues, toutes. */
    private const FILTERS = ['pending', 'unanswered', 'closed', 'all'];

    /** Le corps des demandes est envoyé : une page courte reste légère sur téléphone. */
    private const PER_PAGE = 25;

    public function index(Request $request): Response|RedirectResponse
    {
        // « À traiter » par défaut : c'est ce que le responsable vient chercher
        $filter = $this->choice($request, 'filtre', self::FILTERS) ?? 'pending';
        $search = $this->searchTerm($request);

        // Compteurs sur toutes les demandes visibles, pas seulement la page affichée
        $counts = $this->visibleTickets($request)
            ->toBase()
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed")
            ->selectRaw("SUM(CASE WHEN status <> 'closed' AND response IS NULL THEN 1 ELSE 0 END) as unanswered")
            ->selectRaw("SUM(CASE WHEN status <> 'closed' AND priority = 'urgent' THEN 1 ELSE 0 END) as urgent")
            ->first();

        $tickets = $this->visibleTickets($request)
            ->when($filter === 'pending', fn (Builder $q) => $q->where('status', '!=', 'closed'))
            ->when($filter === 'unanswered', fn (Builder $q) => $q->where('status', '!=', 'closed')->whereNull('response'))
            ->when($filter === 'closed', fn (Builder $q) => $q->where('status', 'closed'))
            ->when($search !== '', fn (Builder $q) => $q->where(fn (Builder $w) => $w
                ->whereLike('subject', "%{$search}%")
                ->orWhereLike('body', "%{$search}%")
                // Le nom de l'hôtesse reste cherchable même si son compte a été supprimé
                ->orWhereHas('agent', fn ($agent) => $agent->withTrashed()->whereLike('name', "%{$search}%"))))
            ->with(['agent' => fn ($q) => $q->withTrashed()->select('id', 'name', 'phone'), 'responder:id,name'])
            // Les demandes à traiter d'abord, les urgentes en tête
            ->orderByRaw("CASE status WHEN 'open' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END")
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 ELSE 1 END")
            ->latest()
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Ticket $t) => [
                'id' => $t->id,
                'uuid' => $t->uuid,
                'subject' => $t->subject,
                'body' => $t->body,
                'priority' => $t->priority,
                'status' => $t->status,
                'response' => $t->response,
                'responder' => $t->responder?->name,
                'responded_at' => $t->responded_at?->diffForHumans(),
                'created_at' => $t->created_at->diffForHumans(),
                'created_date' => $t->created_at->format('d/m/Y H:i'),
                'agent_name' => $t->agent?->name,
                'agent_phone' => $t->agent?->phone,
            ]);

        if ($redirect = $this->beyondLastPage($tickets)) {
            return $redirect;
        }

        $total = (int) $counts->total;
        $closed = (int) $counts->closed;

        return Inertia::render('tickets/index', [
            'tickets' => $tickets,
            'filters' => ['filtre' => $filter, 'q' => $search],
            'counts' => [
                'all' => $total,
                'pending' => $total - $closed,
                'unanswered' => (int) $counts->unanswered,
                'urgent' => (int) $counts->urgent,
                'closed' => $closed,
            ],
        ]);
    }

    public function update(Request $request, Ticket $ticket): RedirectResponse
    {
        abort_unless($this->visibleTickets($request)->whereKey($ticket->id)->exists(), 403);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', self::STATUSES)],
            'response' => ['nullable', 'string', 'max:2000'],
        ]);

        $wasClosed = $ticket->status === 'closed';
        $ticket->status = $validated['status'];

        // La réponse est datée et signée seulement quand elle change
        $response = trim($validated['response'] ?? '') ?: null;
        $newResponse = $response !== null && $response !== $ticket->response;
        if ($response !== $ticket->response) {
            $ticket->fill([
                'response' => $response,
                'responded_by' => $response ? $request->user()->id : null,
                'responded_at' => $response ? now() : null,
            ]);
        }

        $ticket->save();

        // L'hôtesse est prévenue d'une nouvelle réponse, ou de la résolution de sa demande
        $resolved = ! $wasClosed && $ticket->status === 'closed';
        if (($newResponse || $resolved) && $ticket->agent?->status === AccountStatus::Active) {
            Notify::send($ticket->agent, new TicketAnswered($ticket->load('responder:id,name'), $newResponse));
        }

        return back()->with('success', 'Demande mise à jour.');
    }

    /**
     * Tickets de l'entreprise ; le superviseur ne voit que ceux des hôtesses affectées à ses sites.
     *
     * @return Builder<Ticket>
     */
    private function visibleTickets(Request $request): Builder
    {
        $siteIds = $request->user()->managedSiteIds();

        return Ticket::where('company_id', $request->user()->company_id)
            // Une demande retirée par l'hôtesse n'est plus à traiter
            ->where('status', '!=', 'cancelled')
            ->when($siteIds !== null, fn ($q) => $q->whereHas(
                'agent',
                fn ($agent) => $agent->whereHas('affectations', fn ($a) => $a->ongoing()->whereIn('site_id', $siteIds)),
            ));
    }
}
