<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Notifications\TicketCreated;
use App\Support\Notifications\Notify;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TicketController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $tickets = Ticket::where('user_id', $user->id)
            ->where('company_id', $user->company_id)
            ->where('status', '!=', 'cancelled')
            ->latest()
            ->get()
            ->map(fn (Ticket $t) => [
                'id'           => $t->id,
                'subject'      => $t->subject,
                'body'         => $t->body,
                'priority'     => $t->priority,
                'status'       => $t->status,
                'response'     => $t->response,
                'responded_at' => $t->responded_at?->diffForHumans(),
                'created_at'   => $t->created_at->diffForHumans(),
                'created_date' => $t->created_at->format('d/m/Y'),
                'can_cancel'   => $t->status === 'open' && $t->response === null,
            ]);

        return Inertia::render('terrain/tickets', [
            'tickets' => $tickets,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'subject'  => ['required', 'string', 'max:200'],
            'body'     => ['required', 'string', 'max:2000'],
            'priority' => ['required', 'in:normal,urgent'],
        ]);

        $ticket = Ticket::create([
            'company_id' => $user->company_id,
            'user_id'    => $user->id,
            ...$validated,
        ]);

        Notify::send(Notify::managersOf($user), new TicketCreated($ticket->setRelation('agent', $user)));

        return back()->with('success', 'Votre demande a été envoyée à votre responsable.');
    }

    /** Retirer une demande : possible uniquement tant qu'elle est ouverte et sans réponse. */
    public function cancel(Request $request, Ticket $ticket): RedirectResponse
    {
        $user = $request->user();

        abort_if($ticket->user_id !== $user->id || $ticket->company_id !== $user->company_id, 403);
        abort_unless($ticket->status === 'open' && $ticket->response === null, 422, 'Cette demande ne peut plus être retirée.');

        $ticket->update(['status' => 'cancelled']);

        return back()->with('success', 'Demande retirée.');
    }
}