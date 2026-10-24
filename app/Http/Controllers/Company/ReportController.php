<?php

namespace App\Http\Controllers\Company;

use App\Exports\SalesExport;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Support\Reports\SalesReport;
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
