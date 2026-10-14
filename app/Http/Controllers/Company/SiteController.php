<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;

use App\Enums\Role;
use App\Enums\SiteStatus;
use App\Enums\SiteType;
use App\Models\Site;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SiteController extends Controller
{
    public function index(Request $request): Response
    {
        $company = $request->user()->company;

        $sites = $company->sites()
            ->withCount(['affectations' => fn ($q) => $q->where('status', 'active')])
            ->orderBy('name')
            ->get()
            ->map(fn (Site $site) => [
                'id' => $site->id,
                'name' => $site->name,
                'code' => $site->code,
                'type' => $site->type->value,
                'type_label' => $site->type->label(),
                'city' => $site->city,
                'region' => $site->region,
                'status' => $site->status->value,
                'status_label' => $site->status->label(),
                'active_affectations_count' => $site->affectations_count,
                'last_visit_at' => $site->last_visit_at?->diffForHumans(),
                'has_coordinates' => $site->hasCoordinates(),
            ]);

        return Inertia::render('sites/index', [
            'sites' => $sites,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('sites/create', [
            'types' => collect(SiteType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:30'],
            'type' => ['required', 'string', 'in:'.implode(',', array_column(SiteType::cases(), 'value'))],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'contact_name' => ['nullable', 'string', 'max:150'],
            'contact_phone' => ['nullable', 'string', 'max:25'],
            'opening_time' => ['nullable', 'date_format:H:i'],
            'closing_time' => ['nullable', 'date_format:H:i', 'after:opening_time'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $company = $request->user()->company;

        // Validate unique code within the company
        if (! empty($validated['code'])) {
            $exists = $company->sites()->where('code', $validated['code'])->exists();
            if ($exists) {
                return back()->withErrors(['code' => 'Ce code est déjà utilisé par un autre site.'])->withInput();
            }
        }

        $company->sites()->create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('sites.index')
            ->with('success', 'Site créé avec succès.');
    }

    public function show(Request $request, Site $site): Response
    {
        $this->authorizeCompany($request, $site);

        // ── Affectations actives ──────────────────────────────────────────────
        $affectations = $site->affectations()
            ->with('agent:id,name,phone,role')
            ->where('status', 'active')
            ->orderBy('starts_on')
            ->get()
            ->map(fn ($a) => [
                'id'          => $a->id,
                'agent_id'    => $a->user_id,
                'agent_name'  => $a->agent->name,
                'agent_phone' => $a->agent->phone,
                'starts_on'   => $a->starts_on->format('d/m/Y'),
                'ends_on'     => $a->ends_on?->format('d/m/Y'),
                'slot_start'  => $a->slot_start,
                'slot_end'    => $a->slot_end,
                'is_current'  => $a->isCurrentlyActive(),
            ]);

        // ── Visites récentes (10) ─────────────────────────────────────────────
        $recentVisits = $site->visits()
            ->with('agent:id,name')
            ->latest('checked_in_at')
            ->limit(10)
            ->get()
            ->map(fn ($v) => [
                'id'               => $v->id,
                'agent_id'         => $v->user_id,
                'agent_name'       => $v->agent->name,
                'checked_in_at'    => $v->checked_in_at->format('d/m/Y H:i'),
                'checked_out_at'   => $v->checked_out_at?->format('H:i'),
                'duration_minutes' => $v->duration_minutes,
                'status'           => $v->status->value,
                'status_label'     => $v->status->label(),
            ]);

        // ── Stats globales ────────────────────────────────────────────────────
        $totalVisits     = $site->visits()->count();
        $visitsThisMonth = $site->visits()->where('checked_in_at', '>=', now()->startOfMonth())->count();
        $avgDuration     = (int) ($site->visits()->whereNotNull('duration_minutes')->avg('duration_minutes') ?? 0);
        $completedVisits = $site->visits()->where('status', 'completed')->count();

        // ── Données graphique : 7 derniers jours ─────────────────────────────
        $weekRows = $site->visits()
            ->selectRaw("DATE(checked_in_at AT TIME ZONE 'UTC') as day, COUNT(*) as total")
            ->where('checked_in_at', '>=', now()->subDays(6)->startOfDay())
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('total', 'day');

        $weekData = collect(range(6, 0))->map(function ($daysAgo) use ($weekRows) {
            $date = now()->subDays($daysAgo)->format('Y-m-d');
            return [
                'label' => now()->subDays($daysAgo)->locale('fr')->isoFormat('ddd D'),
                'count' => (int) ($weekRows[$date] ?? 0),
            ];
        })->values()->all();

        // ── Données graphique : 30 derniers jours ────────────────────────────
        $monthRows = $site->visits()
            ->selectRaw("DATE(checked_in_at AT TIME ZONE 'UTC') as day, COUNT(*) as total")
            ->where('checked_in_at', '>=', now()->subDays(29)->startOfDay())
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('total', 'day');

        $monthData = collect(range(29, 0))->map(function ($daysAgo) use ($monthRows) {
            $date = now()->subDays($daysAgo)->format('Y-m-d');
            return [
                'label' => now()->subDays($daysAgo)->format('d/m'),
                'count' => (int) ($monthRows[$date] ?? 0),
            ];
        })->values()->all();

        // ── Données graphique : 12 derniers mois ─────────────────────────────
        $yearRows = $site->visits()
            ->selectRaw("TO_CHAR(checked_in_at, 'YYYY-MM') as month, COUNT(*) as total")
            ->where('checked_in_at', '>=', now()->subMonths(11)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('total', 'month');

        $yearData = collect(range(11, 0))->map(function ($monthsAgo) use ($yearRows) {
            $month = now()->subMonths($monthsAgo)->format('Y-m');
            return [
                'label' => now()->subMonths($monthsAgo)->locale('fr')->isoFormat('MMM YY'),
                'count' => (int) ($yearRows[$month] ?? 0),
            ];
        })->values()->all();

        // ── Historique des hôtesses (toutes affectations) ────────────────────
        $allAffectations = $site->affectations()
            ->with('agent:id,name,phone,role')
            ->orderByDesc('starts_on')
            ->get();

        $hostessHistory = $allAffectations
            ->groupBy('user_id')
            ->map(function ($aff) use ($site) {
                $agent      = $aff->first()->agent;
                $visitCount = $site->visits()->where('user_id', $agent->id)->count();
                $firstDate  = $aff->min(fn ($a) => $a->starts_on->toDateString());
                $lastDate   = $aff->max(fn ($a) => $a->ends_on?->toDateString() ?? now()->toDateString());
                $isCurrent  = $aff->contains(fn ($a) => $a->isCurrentlyActive());

                return [
                    'agent_id'    => $agent->id,
                    'agent_name'  => $agent->name,
                    'agent_phone' => $agent->phone,
                    'role_label'  => $agent->role?->label() ?? '',
                    'visit_count' => $visitCount,
                    'first_date'  => Carbon::parse($firstDate)->format('d/m/Y'),
                    'last_date'   => Carbon::parse($lastDate)->format('d/m/Y'),
                    'is_current'  => $isCurrent,
                ];
            })
            ->values()
            ->all();

        // ── Photos publiques ──────────────────────────────────────────────────
        $photos = collect($site->photos ?? [])->map(fn ($p) => asset("storage/{$p}"))->all();

        // ── Inventaire du site ────────────────────────────────────────────────
        $inventory = $site->siteProducts()
            ->with('product:id,name,sku,unit,price,image,is_active')
            ->orderBy('created_at')
            ->get()
            ->map(fn ($sp) => [
                'id'                 => $sp->id,
                'product_id'         => $sp->product_id,
                'product_name'       => $sp->product->name,
                'product_sku'        => $sp->product->sku,
                'product_unit'       => $sp->product->unit,
                'product_price'      => $sp->product->price,
                'product_image_url'  => $sp->product->image ? asset("storage/{$sp->product->image}") : null,
                'current_stock'      => $sp->current_stock,
                'alert_threshold'    => $sp->alert_threshold,
                'critical_threshold' => $sp->critical_threshold,
                'stock_status'       => $sp->stockStatus(),
                'updated_at'         => $sp->updated_at->diffForHumans(),
            ]);

        // ── Produits disponibles (pas encore dans l'inventaire de ce site) ──
        $assignedProductIds = $site->siteProducts()->pluck('product_id');
        $availableProducts = $request->user()->company->products()
            ->where('is_active', true)
            ->whereNotIn('id', $assignedProductIds)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'unit'])
            ->map(fn ($p) => [
                'value' => $p->id,
                'label' => $p->sku ? "{$p->name} ({$p->sku})" : $p->name,
                'unit'  => $p->unit,
            ]);

        // ── Personnel affectable ──────────────────────────────────────────────
        $availableStaff = $request->user()->company->users()
            ->whereIn('role', [Role::Supervisor->value, Role::FieldAgent->value])
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(fn ($u) => [
                'value'      => $u->id,
                'label'      => $u->name,
                'role_label' => $u->role->label(),
            ]);

        return Inertia::render('sites/show', [
            'site' => [
                'id'           => $site->id,
                'name'         => $site->name,
                'code'         => $site->code,
                'type'         => $site->type->value,
                'type_label'   => $site->type->label(),
                'address'      => $site->address,
                'city'         => $site->city,
                'region'       => $site->region,
                'latitude'     => $site->latitude,
                'longitude'    => $site->longitude,
                'contact_name' => $site->contact_name,
                'contact_phone'=> $site->contact_phone,
                'opening_time' => $site->opening_time,
                'closing_time' => $site->closing_time,
                'notes'        => $site->notes,
                'status'       => $site->status->value,
                'status_label' => $site->status->label(),
                'last_visit_at'=> $site->last_visit_at?->diffForHumans(),
                'photos'       => $photos,
                'photos_count' => count($photos),
            ],
            'stats' => [
                'total_visits'     => $totalVisits,
                'visits_this_month'=> $visitsThisMonth,
                'avg_duration'     => $avgDuration,
                'completed_visits' => $completedVisits,
            ],
            'chart' => [
                'week'  => $weekData,
                'month' => $monthData,
                'year'  => $yearData,
            ],
            'affectations'    => $affectations,
            'recent_visits'   => $recentVisits,
            'hostess_history'   => $hostessHistory,
            'available_staff'   => $availableStaff,
            'inventory'         => $inventory,
            'available_products'=> $availableProducts,
        ]);
    }

    public function edit(Request $request, Site $site): Response
    {
        $this->authorizeCompany($request, $site);

        return Inertia::render('sites/edit', [
            'site' => [
                'id' => $site->id,
                'name' => $site->name,
                'code' => $site->code,
                'type' => $site->type->value,
                'address' => $site->address,
                'city' => $site->city,
                'region' => $site->region,
                'latitude' => $site->latitude,
                'longitude' => $site->longitude,
                'contact_name' => $site->contact_name,
                'contact_phone' => $site->contact_phone,
                'opening_time' => $site->opening_time,
                'closing_time' => $site->closing_time,
                'notes' => $site->notes,
                'status' => $site->status->value,
            ],
            'types' => collect(SiteType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
            'statuses' => collect(SiteStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
        ]);
    }

    public function update(Request $request, Site $site): RedirectResponse
    {
        $this->authorizeCompany($request, $site);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:30'],
            'type' => ['required', 'string', 'in:'.implode(',', array_column(SiteType::cases(), 'value'))],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'contact_name' => ['nullable', 'string', 'max:150'],
            'contact_phone' => ['nullable', 'string', 'max:25'],
            'opening_time' => ['nullable', 'date_format:H:i'],
            'closing_time' => ['nullable', 'date_format:H:i', 'after:opening_time'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', 'string', 'in:'.implode(',', array_column(SiteStatus::cases(), 'value'))],
        ]);

        if (! empty($validated['code']) && $validated['code'] !== $site->code) {
            $exists = $request->user()->company->sites()
                ->where('code', $validated['code'])
                ->where('id', '!=', $site->id)
                ->exists();

            if ($exists) {
                return back()->withErrors(['code' => 'Ce code est déjà utilisé par un autre site.'])->withInput();
            }
        }

        $site->update($validated);

        return redirect()->route('sites.show', $site)
            ->with('success', 'Site mis à jour.');
    }

    public function destroy(Request $request, Site $site): RedirectResponse
    {
        $this->authorizeCompany($request, $site);

        $site->delete();

        return redirect()->route('sites.index')
            ->with('success', 'Site archivé.');
    }

    private function authorizeCompany(Request $request, Site $site): void
    {
        abort_if($site->company_id !== $request->user()->company_id, 403);
    }
}
