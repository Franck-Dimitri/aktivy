<?php

namespace App\Http\Controllers\Company;

use App\Enums\Role;
use App\Exports\SalesExport;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\SalesTarget;
use App\Support\Reports\SalesReport;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Rapports de ventes de l'entreprise et export Excel pour la comptabilité.
 */
class ReportController extends Controller
{
    /** Nombre de lignes du journal affichées à l'écran ; l'export Excel les contient toutes. */
    private const PREVIEW_LINES = 200;

    public function index(Request $request): Response
    {
        $company = $request->user()->company;
        $filters = $this->filters($request, $company);
        $report = SalesReport::fromFilters($company, $filters);
        $lines = $report->lines(self::PREVIEW_LINES + 1);
        $previous = $report->previous();

        return Inertia::render('reports/index', [
            'filters' => [
                'from' => $report->from->toDateString(),
                'to' => $report->to->toDateString(),
                'site_id' => $report->siteId,
                'user_id' => $report->userId,
                'event_id' => $report->eventId,
            ],
            'options' => $this->options($company),
            'currency' => $company->currency ?: 'XAF',
            'totals' => $report->totals(),
            'previous' => [
                'from' => $previous->from->toDateString(),
                'to' => $previous->to->toDateString(),
                'totals' => $previous->totals(),
            ],
            'timeline' => $report->timeline(),
            'monthly' => $report->monthly(),
            'targets' => $this->targets($company),
            'canEditTargets' => in_array($request->user()->role, [Role::CompanyAdmin, Role::Supervisor], true),
            'byDay' => $report->byDay(),
            'bySite' => $report->bySite(),
            'byProduct' => $report->byProduct(),
            'byHostess' => $report->byHostess(),
            'lines' => $lines->take(self::PREVIEW_LINES)->values(),
            'linesTruncated' => $lines->count() > self::PREVIEW_LINES,
        ]);
    }

    public function export(Request $request): BinaryFileResponse
    {
        $company = $request->user()->company;
        $filters = $this->filters($request, $company);
        $report = SalesReport::fromFilters($company, $filters);

        $path = tempnam(sys_get_temp_dir(), 'motriks-ventes-');
        (new SalesExport($report))->write($path, $this->filterLabels($report));

        AuditLog::record('reports.exported', $company, new: [
            'from' => $report->from->toDateString(),
            'to' => $report->to->toDateString(),
        ]);

        $name = sprintf('ventes-%s-%s-au-%s.xlsx', Str::slug($company->name), $report->from->format('Y-m-d'), $report->to->format('Y-m-d'));

        return response()
            ->download($path, $name, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
            ->deleteFileAfterSend();
    }

    /**
     * Fixe (ou retire, si le montant est vide ou nul) l'objectif du mois en cours, global ou d'un site.
     */
    public function saveTarget(Request $request): RedirectResponse
    {
        $company = $request->user()->company;

        $data = $request->validate([
            'site_id' => ['nullable', 'integer', "exists:sites,id,company_id,{$company->id}"],
            'amount' => ['nullable', 'integer', 'min:0', 'max:1000000000000'],
        ], [
            'amount.integer' => 'L’objectif doit être un montant entier, sans décimales.',
        ]);

        $target = SalesTarget::firstOrNew([
            'company_id' => $company->id,
            'site_id' => $data['site_id'] ?? null,
            'month' => $this->today($company)->startOfMonth()->toDateString(),
        ]);

        if (empty($data['amount'])) {
            $target->exists && $target->delete();

            return back()->with('success', 'Objectif retiré.');
        }

        $target->fill(['amount' => $data['amount'], 'updated_by' => $request->user()->id])->save();

        return back()->with('success', 'Objectif enregistré.');
    }

    /**
     * Objectifs du mois en cours : réalisé, progression et projection de fin de mois au rythme actuel.
     * Indépendants des filtres de la page, ils portent toujours sur toute l'entreprise.
     */
    private function targets(Company $company): array
    {
        $today = $this->today($company);
        $monthStart = $today->startOfMonth();
        $month = new SalesReport($company, $monthStart, $today->endOfDay());
        $elapsed = $today->day;
        $length = $today->daysInMonth;

        $targets = SalesTarget::where('company_id', $company->id)
            ->whereDate('month', $monthStart->toDateString())
            ->get()
            ->keyBy(fn (SalesTarget $t) => $t->site_id ?? 0);

        $bySite = $month->revenueBySite();
        $line = fn (float $actual, ?SalesTarget $target) => [
            'actual' => $actual,
            'target' => $target?->amount,
            'projection' => $elapsed > 0 ? $actual / $elapsed * $length : 0,
        ];

        return [
            'month' => $monthStart->toDateString(),
            'days_elapsed' => $elapsed,
            'days_in_month' => $length,
            'global' => $line($month->totals()['revenue'], $targets->get(0)),
            'sites' => $company->sites()->orderBy('name')->get(['id', 'name'])->map(fn ($site) => [
                'site_id' => $site->id,
                'name' => $site->name,
                ...$line($bySite[$site->id] ?? 0.0, $targets->get($site->id)),
            ]),
        ];
    }

    /** Date du jour dans le fuseau de l'entreprise. */
    private function today(Company $company): CarbonImmutable
    {
        return CarbonImmutable::now($company->timezone ?: config('app.timezone'));
    }

    /**
     * Filtres validés ; un site, une hôtesse ou un événement d'une autre entreprise est refusé.
     */
    private function filters(Request $request, Company $company): array
    {
        return $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'site_id' => ['nullable', 'integer', "exists:sites,id,company_id,{$company->id}"],
            'user_id' => ['nullable', 'integer', "exists:users,id,company_id,{$company->id}"],
            'event_id' => ['nullable', 'integer', "exists:events,id,company_id,{$company->id}"],
        ]);
    }

    private function options(Company $company): array
    {
        return [
            'sites' => $company->sites()->orderBy('name')->get(['id', 'name']),
            'hostesses' => $company->users()
                ->whereIn('id', $company->dailyReports()->select('user_id'))
                ->orderBy('name')
                ->get(['id', 'name']),
            'events' => $company->events()->orderByDesc('start_date')->get(['id', 'name']),
        ];
    }

    /**
     * Libellés des filtres appliqués, repris dans l'onglet « Synthèse » de l'export.
     */
    private function filterLabels(SalesReport $report): array
    {
        $company = $report->company;

        return array_filter([
            'Site' => $report->siteId ? $company->sites()->whereKey($report->siteId)->value('name') : null,
            'Hôtesse' => $report->userId ? $company->users()->whereKey($report->userId)->value('name') : null,
            'Événement' => $report->eventId ? $company->events()->whereKey($report->eventId)->value('name') : null,
        ]);
    }
}
