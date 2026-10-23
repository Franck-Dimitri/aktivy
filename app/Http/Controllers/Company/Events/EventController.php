<?php

namespace App\Http\Controllers\Company\Events;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Presenters\EventPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function index(Request $request): Response
    {
        $events = $request->user()->company->events()
            ->withCount(['hostesses', 'sites', 'packs'])
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (Event $e) => EventPresenter::summary($e));

        return Inertia::render('events/index', [
            'events' => $events,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('events/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'location'    => 'nullable|string|max:255',
            'city'        => 'nullable|string|max:100',
        ]);

        $event = $request->user()->company->events()->create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('events.show', $event)
            ->with('success', 'Événement créé avec succès.');
    }

    public function show(Request $request, Event $event): Response
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);

        $event->load([
            'sites.site:id,name,city,address',
            'sites.hostesses',
            'packs.lines.product:id,name,image',
            'hostesses.user:id,name,phone,status',
            'hostesses.eventSite',
        ]);

        $existingHostessIds = $event->hostesses->pluck('user_id');

        // ── Stats de vente liées à cet événement ──
        $salesGlobal = DB::table('daily_report_lines as l')
            ->join('daily_reports as r', 'l.daily_report_id', '=', 'r.id')
            ->where('r.event_id', $event->id)
            ->where('r.status', 'submitted')
            ->selectRaw('COALESCE(SUM(l.revenue),0) as revenue, COALESCE(SUM(l.units_sold),0) as units_sold, COUNT(DISTINCT r.id) as reports_count')
            ->first();

        $salesByPdv = DB::table('daily_report_lines as l')
            ->join('daily_reports as r', 'l.daily_report_id', '=', 'r.id')
            ->join('sites as s', 'r.site_id', '=', 's.id')
            ->where('r.event_id', $event->id)
            ->where('r.status', 'submitted')
            ->selectRaw('s.id, s.name, COALESCE(SUM(l.revenue),0) as revenue, COALESCE(SUM(l.units_sold),0) as units_sold, COUNT(DISTINCT r.id) as reports_count')
            ->groupBy('s.id', 's.name')
            ->orderByDesc('revenue')
            ->get();

        $salesByProduct = DB::table('daily_report_lines as l')
            ->join('daily_reports as r', 'l.daily_report_id', '=', 'r.id')
            ->where('r.event_id', $event->id)
            ->where('r.status', 'submitted')
            ->selectRaw('l.product_name, COALESCE(SUM(l.revenue),0) as revenue, COALESCE(SUM(l.units_sold),0) as units_sold')
            ->groupBy('l.product_name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        return Inertia::render('events/show', [
            'event'              => EventPresenter::detail($event),
            'companySites'       => $request->user()->company->sites()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'city', 'address']),
            'companyProducts'    => $request->user()->company->products()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'image']),
            'availableHostesses' => $request->user()->company->users()
                ->where('role', 'field_agent')
                ->where('status', 'active')
                ->whereNotIn('id', $existingHostessIds)
                ->orderBy('name')
                ->get(['id', 'name', 'phone']),
            'eventSales'         => [
                'revenue'        => (float) $salesGlobal->revenue,
                'units_sold'     => (int)   $salesGlobal->units_sold,
                'reports_count'  => (int)   $salesGlobal->reports_count,
                'by_pdv'         => $salesByPdv->map(fn ($r) => [
                    'id'            => $r->id,
                    'name'          => $r->name,
                    'revenue'       => (float) $r->revenue,
                    'units_sold'    => (int)   $r->units_sold,
                    'reports_count' => (int)   $r->reports_count,
                ])->all(),
                'by_product'     => $salesByProduct->map(fn ($r) => [
                    'name'       => $r->product_name,
                    'revenue'    => (float) $r->revenue,
                    'units_sold' => (int)   $r->units_sold,
                ])->all(),
            ],
        ]);
    }

    public function update(Request $request, Event $event): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_if($event->isFinished(), 403, 'Événement terminé.');

        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'location'    => 'nullable|string|max:255',
            'city'        => 'nullable|string|max:100',
        ]);

        $event->update($data);

        return back()->with('success', 'Événement mis à jour.');
    }

    public function destroy(Request $request, Event $event): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_if($event->isActive(), 403, 'Impossible de supprimer un événement en cours.');

        $event->delete();

        return redirect()->route('events.index')
            ->with('success', 'Événement supprimé.');
    }
}
