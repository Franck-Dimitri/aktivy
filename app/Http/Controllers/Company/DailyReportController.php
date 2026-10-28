<?php

namespace App\Http\Controllers\Company;

use App\Enums\AffectationStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\DailyReport;
use App\Models\AuditLog;
use App\Models\DailyReportLine;
use App\Models\StockMovement;
use App\Support\Reports\ReportSales;
use App\Support\Stock\StockLedger;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            ->with(['agent:id,name,phone', 'site:id,name', 'visit:id,checked_in_at,checked_out_at,status,checkin_distance_m'])
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
                'validated' => $r->isValidated(),
                'checkin_distance_m' => $r->visit?->checkin_distance_m,
                'off_site' => $r->visit?->isOffSite() ?? false,
            ]),
            'missing' => $missing,
            // Aucune affectation en cours : on le dit plutôt que d'afficher une page vide
            'has_scope' => $siteIds === null || $siteIds !== [],
        ]);
    }

    public function show(Request $request, DailyReport $dailyReport): Response
    {
        $user = $request->user();
        $this->authorizeReport($request, $dailyReport);

        $dailyReport->load(['agent:id,name,phone', 'site:id,name,city', 'visit', 'lines.siteProduct', 'packs', 'corrector:id,name', 'validator:id,name']);
        $visit = $dailyReport->visit;
        $canReview = $user->hasRole(Role::CompanyAdmin, Role::Supervisor);
        $linesByProduct = $dailyReport->lines->keyBy(fn (DailyReportLine $l) => $l->siteProduct?->product_id);
        $soldPacks = $dailyReport->packs->keyBy('event_pack_id');

        return Inertia::render('daily-reports/show', [
            'currency' => $user->company->currency ?: 'XAF',
            // Corriger puis valider : gérant ou superviseur, sur un rapport soumis et pas encore validé
            'can_correct' => $canReview && $dailyReport->isSubmitted() && ! $dailyReport->isValidated(),
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
                'checkin_distance_m' => $visit?->checkin_distance_m,
                'off_site' => $visit?->isOffSite(),
                'submitted_at' => $dailyReport->submitted_at?->format('H:i'),
                'corrected_at' => $dailyReport->corrected_at?->format('d/m/Y H:i'),
                'corrected_by' => $dailyReport->corrector?->name,
                'validated_at' => $dailyReport->validated_at?->format('d/m/Y H:i'),
                'validated_by' => $dailyReport->validator?->name,
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
                    'single_units' => $l->single_units,
                    'units_sold' => $l->units_sold,
                    'closing_stock' => $l->closing_stock,
                    'revenue' => (float) $l->revenue,
                    'notes' => $l->notes,
                ]),
                // Packs vendables (pour la correction) et quantités vendues
                'packs' => ReportSales::availablePacks($dailyReport)
                    ->map(fn ($pack) => [
                        'id' => $pack->id,
                        'name' => $pack->name,
                        'value' => ReportSales::packValue($pack, $linesByProduct),
                        'quantity' => (int) ($soldPacks->get($pack->id)?->quantity ?? 0),
                    ])
                    // Un pack retiré de l'événement depuis la vente reste affiché
                    ->concat($dailyReport->packs
                        ->filter(fn ($p) => $p->event_pack_id === null)
                        ->map(fn ($p) => ['id' => null, 'name' => $p->name, 'value' => $p->unit_value, 'quantity' => $p->quantity]))
                    ->values(),
            ],
        ]);
    }

    /**
     * Correction d'un rapport soumis : les quantités sont recalculées, l'écart est reporté
     * sur le stock du site et la modification est tracée dans le journal d'audit.
     */
    public function update(Request $request, DailyReport $dailyReport): RedirectResponse
    {
        $this->authorizeReview($request, $dailyReport);

        $validated = $request->validate([
            'lines' => ['required', 'array'],
            'lines.*.id' => ['required', 'integer'],
            'lines.*.units_sold' => ['required', 'integer', 'min:0'],
            'packs' => ['nullable', 'array'],
            'packs.*.id' => ['required', 'integer'],
            'packs.*.quantity' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($request, $dailyReport, $validated) {
            $before = $this->snapshot($dailyReport);

            ReportSales::apply(
                $dailyReport,
                collect($validated['lines'])->pluck('units_sold', 'id')->all(),
                collect($validated['packs'] ?? [])->pluck('quantity', 'id')->all(),
            );

            $after = $this->snapshot($dailyReport);

            // Le stock du site suit la correction : vendre moins rend des unités, vendre plus en retire
            foreach ($dailyReport->lines()->get() as $line) {
                $change = $before['units'][$line->id] - $after['units'][$line->id];
                if ($change !== 0) {
                    StockLedger::move($line->site_product_id, $change, StockMovement::CORRECTION, $request->user(), $dailyReport->id);
                }
            }

            $dailyReport->update(['corrected_at' => now(), 'corrected_by' => $request->user()->id]);
            AuditLog::record('daily_report.corrected', $dailyReport, $before, $after);
        });

        return back()->with('success', 'Rapport corrigé. Le stock du site a été ajusté.');
    }

    /**
     * Validation : le responsable confirme le rapport, qui ne peut plus être corrigé.
     */
    public function validateReport(Request $request, DailyReport $dailyReport): RedirectResponse
    {
        $this->authorizeReview($request, $dailyReport);

        $dailyReport->update(['validated_at' => now(), 'validated_by' => $request->user()->id]);
        AuditLog::record('daily_report.validated', $dailyReport);

        return back()->with('success', 'Rapport validé.');
    }

    private function authorizeReport(Request $request, DailyReport $report): void
    {
        abort_if($report->company_id !== $request->user()->company_id, 403);
        abort_unless($request->user()->managesSite($report->site_id), 403);
    }

    private function authorizeReview(Request $request, DailyReport $report): void
    {
        $this->authorizeReport($request, $report);
        abort_unless($report->isSubmitted(), 422, 'Ce rapport n’a pas encore été soumis par l’hôtesse.');
        abort_if($report->isValidated(), 422, 'Ce rapport est déjà validé.');
    }

    /**
     * Quantités du rapport, pour comparer avant et après une correction.
     *
     * @return array{units: array<int, int>, revenue: float, packs: array<string, int>}
     */
    private function snapshot(DailyReport $report): array
    {
        $lines = $report->lines()->get();

        return [
            'units' => $lines->pluck('units_sold', 'id')->map(fn ($v) => (int) $v)->all(),
            'revenue' => (float) $lines->sum('revenue'),
            'packs' => $report->packs()->pluck('quantity', 'name')->map(fn ($v) => (int) $v)->all(),
        ];
    }
}
