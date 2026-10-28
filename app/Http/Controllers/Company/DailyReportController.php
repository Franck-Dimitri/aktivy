<?php

namespace App\Http\Controllers\Company;

use App\Enums\AffectationStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\DailyReport;
use App\Models\DailyReportLine;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Rapports journaliers des hôtesses, côté responsable : qui a rendu son rapport,
 * qui est encore en service, qui n'a pas pointé, et le détail de chaque rapport.
 * Le superviseur ne voit que ses sites ; le comptable consulte sans rien modifier.
 */
class DailyReportController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $company = $user->company;
        $siteIds = $user->managedSiteIds();

        $filters = $request->validate([
            'date' => ['nullable', 'date'],
            'site_id' => ['nullable', 'integer', "exists:sites,id,company_id,{$company->id}"],
        ]);

        $today = CarbonImmutable::now($company->timezone ?: config('app.timezone'))->startOfDay();
        $date = isset($filters['date']) ? CarbonImmutable::parse($filters['date'])->startOfDay() : $today;
        $siteId = $filters['site_id'] ?? null;

        $inScope = fn ($q) => $q
            ->when($siteIds !== null, fn ($q) => $q->whereIn('site_id', $siteIds))
            ->when($siteId, fn ($q) => $q->where('site_id', $siteId));

        $reports = $inScope(DailyReport::query())
            ->where('company_id', $company->id)
            ->whereDate('report_date', $date->toDateString())
            ->with(['agent:id,name,phone', 'site:id,name', 'visit:id,checked_in_at,checked_out_at,status'])
            ->withSum('lines', 'revenue')
            ->withSum('lines', 'units_sold')
            ->orderByRaw("CASE status WHEN 'submitted' THEN 1 ELSE 0 END")
            ->get();

        // Hôtesses affectées ce jour-là qui n'ont pas de rapport : elles n'ont pas pointé
        $missing = $inScope(Affectation::query())
            ->where('company_id', $company->id)
            ->whereIn('status', [AffectationStatus::Active, AffectationStatus::Completed])
            ->whereDate('starts_on', '<=', $date->toDateString())
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $date->toDateString()))
            ->whereHas('agent', fn ($q) => $q->where('role', Role::FieldAgent))
            ->whereNotIn('user_id', $reports->pluck('user_id'))
            ->with(['agent:id,name,phone', 'site:id,name'])
            ->get()
            ->unique('user_id')
            ->map(fn (Affectation $a) => [
                'user_id' => $a->user_id,
                'agent_name' => $a->agent?->name,
                'agent_phone' => $a->agent?->phone,
                'site_name' => $a->site?->name,
                'slot_start' => $a->slot_start,
            ])
            ->values();

        return Inertia::render('daily-reports/index', [
            'filters' => [
                'date' => $date->toDateString(),
                'site_id' => $siteId,
            ],
            'is_today' => $date->equalTo($today),
            'date_label' => $date->translatedFormat('l j F Y'),
            'sites' => $company->sites()
                ->when($siteIds !== null, fn ($q) => $q->whereIn('id', $siteIds))
                ->orderBy('name')
                ->get(['id', 'name']),
            'currency' => $company->currency ?: 'XAF',
            'reports' => $reports->map(fn (DailyReport $r) => [
                'id' => $r->id,
                'status' => $r->status,
                'agent_name' => $r->agent?->name,
                'agent_phone' => $r->agent?->phone,
                'site_name' => $r->site?->name,
                'checked_in_at' => $r->visit?->checked_in_at?->format('H:i'),
                'checked_out_at' => $r->visit?->checked_out_at?->format('H:i'),
                'submitted_at' => $r->submitted_at?->format('H:i'),
                'revenue' => (float) $r->lines_sum_revenue,
                'units_sold' => (int) $r->lines_sum_units_sold,
                'has_incident' => filled($r->incident_notes),
            ]),
            'missing' => $missing,
            // Aucune affectation en cours : on le dit plutôt que d'afficher une page vide
            'has_scope' => $siteIds === null || $siteIds !== [],
        ]);
    }

    public function show(Request $request, DailyReport $dailyReport): Response
    {
        $user = $request->user();
        abort_if($dailyReport->company_id !== $user->company_id, 403);
        abort_unless($user->managesSite($dailyReport->site_id), 403);

        $dailyReport->load(['agent:id,name,phone', 'site:id,name,city', 'visit', 'lines']);
        $visit = $dailyReport->visit;

        return Inertia::render('daily-reports/show', [
            'currency' => $user->company->currency ?: 'XAF',
            'report' => [
                'id' => $dailyReport->id,
                'status' => $dailyReport->status,
                'report_date' => $dailyReport->report_date->toDateString(),
                'date_label' => $dailyReport->report_date->translatedFormat('l j F Y'),
                'agent_name' => $dailyReport->agent?->name,
                'agent_phone' => $dailyReport->agent?->phone,
                'site_name' => $dailyReport->site?->name,
                'site_city' => $dailyReport->site?->city,
                'checked_in_at' => $visit?->checked_in_at?->format('H:i'),
                'checked_out_at' => $visit?->checked_out_at?->format('H:i'),
                'duration_minutes' => $visit?->duration_minutes,
                'submitted_at' => $dailyReport->submitted_at?->format('H:i'),
                'notes' => $dailyReport->notes,
                'incident_notes' => $dailyReport->incident_notes,
                'total_revenue' => $dailyReport->totalRevenue(),
                'total_units_sold' => $dailyReport->totalUnitsSold(),
                'lines' => $dailyReport->lines->map(fn (DailyReportLine $l) => [
                    'id' => $l->id,
                    'product_name' => $l->product_name,
                    'unit' => $l->unit,
                    'unit_price' => (float) $l->unit_price,
                    'opening_stock' => $l->opening_stock,
                    'units_sold' => $l->units_sold,
                    'closing_stock' => $l->closing_stock,
                    'revenue' => (float) $l->revenue,
                    'notes' => $l->notes,
                ]),
            ],
        ]);
    }
}
