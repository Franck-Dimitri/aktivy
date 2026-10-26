<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
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
    private const STATUSES = ['open', 'in_review', 'closed'];

    public function index(Request $request): Response
    {
        $tickets = Ticket::where('company_id', $request->user()->company_id)
            ->with(['agent' => fn ($q) => $q->withTrashed()->select('id', 'name', 'phone'), 'responder:id,name'])
            // Les demandes à traiter d'abord, les urgentes en tête
            ->orderByRaw("CASE status WHEN 'open' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END")
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 ELSE 1 END")
            ->latest()
            ->get()
            ->map(fn (Ticket $t) => [
                'id'           => $t->id,
                'subject'      => $t->subject,
                'body'         => $t->body,
                'priority'     => $t->priority,
                'status'       => $t->status,
                'response'     => $t->response,
                'responder'    => $t->responder?->name,
                'responded_at' => $t->responded_at?->diffForHumans(),
                'created_at'   => $t->created_at->diffForHumans(),
                'created_date' => $t->created_at->format('d/m/Y H:i'),
                'agent_name'   => $t->agent?->name,
                'agent_phone'  => $t->agent?->phone,
            ]);

        return Inertia::render('tickets/index', [
            'tickets' => $tickets,
        ]);
    }

    public function update(Request $request, Ticket $ticket): RedirectResponse
    {
        abort_if($ticket->company_id !== $request->user()->company_id, 403);

        $validated = $request->validate([
            'status'   => ['required', 'string', 'in:'.implode(',', self::STATUSES)],
            'response' => ['nullable', 'string', 'max:2000'],
        ]);

        $ticket->status = $validated['status'];

        // La réponse est datée et signée seulement quand elle change
        $response = trim($validated['response'] ?? '') ?: null;
        if ($response !== $ticket->response) {
            $ticket->fill([
                'response'     => $response,
                'responded_by' => $response ? $request->user()->id : null,
                'responded_at' => $response ? now() : null,
            ]);
        }

        $ticket->save();

        return back()->with('success', 'Demande mise à jour.');
    }
}
