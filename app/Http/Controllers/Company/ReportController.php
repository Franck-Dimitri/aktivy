<?php

namespace App\Http\Controllers\Company;

use App\Enums\Role;
use App\Exports\SalesExport;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\SalesTarget;
use App\Models\User;
use App\Support\Pdf\PdfDocument;
use App\Support\Reports\SalesReport;
use App\Support\Targets\TargetOverview;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
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

    /**
     * Onglet « Objectifs » de « Ventes & objectifs » : qui atteint son objectif (semaine ou mois),
     * et réglage des objectifs du mois de l'entreprise, des sites et des hôtesses.
     */
    public function objectives(Request $request): Response
    {
        $user = $request->user();
        $request->validate(['period' => ['nullable', Rule::in(TargetOverview::PERIODS)]]);

        return Inertia::render('reports/objectives', [
            'overview' => (new TargetOverview($user, $this->today($user->company)))->build($request->input('period', 'week')),
            'targets' => $this->targets($user),
            'currency' => $user->company->currency ?: 'XAF',
            'canEditTargets' => in_array($user->role, [Role::CompanyAdmin, Role::Supervisor], true),
        ]);
    }

    public function index(Request $request): Response
    {
        $company = $request->user()->company;
        $filters = $this->filters($request, $company);
        $report = SalesReport::fromFilters($company, $filters, $request->user()->managedSiteIds());
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
            'options' => $this->options($request->user()),
            'currency' => $company->currency ?: 'XAF',
            'totals' => $report->totals(),
            'previous' => [
                'from' => $previous->from->toDateString(),
                'to' => $previous->to->toDateString(),
                'totals' => $previous->totals(),
            ],
            'timeline' => $report->timeline(),
            'monthly' => $report->monthly(),
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
        $report = SalesReport::fromFilters($company, $filters, $request->user()->managedSiteIds());

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
     * Synthèse des ventes en PDF, avec les filtres de la page : à envoyer à une marque cliente.
     */
    public function pdf(Request $request): HttpResponse
    {
        $company = $request->user()->company;
        $report = SalesReport::fromFilters($company, $this->filters($request, $company), $request->user()->managedSiteIds());

        AuditLog::record('reports.exported', $company, new: [
            'format' => 'pdf',
            'from' => $report->from->toDateString(),
            'to' => $report->to->toDateString(),
        ]);

        return PdfDocument::download('pdf.sales-report', [
            'title' => 'Synthèse des ventes',
            'subtitle' => 'Du '.$report->from->format('d/m/Y').' au '.$report->to->format('d/m/Y'),
            'company' => $company,
            'logo' => PdfDocument::logo($company),
            'currency' => $company->currency ?: 'XAF',
            'report' => $report,
            'filters' => $this->filterLabels($report),
            'totals' => $report->totals(),
            'previous' => $report->previous()->totals(),
            'bySite' => $report->bySite(),
            'byProduct' => $report->byProduct(),
            // Document destiné aux marques clientes : sans le numéro personnel des hôtesses
            'byHostess' => $report->byHostess()->map(fn (array $row) => [...$row, 'detail' => null]),
            'byDay' => $report->byDay(),
        ], sprintf('ventes-%s-%s-au-%s.pdf', Str::slug($company->name), $report->from->format('Y-m-d'), $report->to->format('Y-m-d')));
    }

    /**
     * Fixe (ou retire, si le montant est vide ou nul) l'objectif du mois en cours :
     * de l'entreprise, d'un site ou d'une hôtesse.
     */
    public function saveTarget(Request $request): RedirectResponse
    {
        $user = $request->user();
        $company = $user->company;

        $data = $request->validate([
            'site_id' => ['nullable', 'integer', "exists:sites,id,company_id,{$company->id}", 'prohibits:user_id'],
            'user_id' => ['nullable', 'integer', "exists:users,id,company_id,{$company->id},role,".Role::FieldAgent->value],
            'amount' => ['nullable', 'integer', 'min:0', 'max:1000000000000'],
        ], [
            'amount.integer' => 'L’objectif doit être un montant entier, sans décimales.',
            'user_id.exists' => 'Cette hôtesse n’existe pas dans votre entreprise.',
        ]);

        $siteId = $data['site_id'] ?? null;
        $userId = $data['user_id'] ?? null;

        // Le superviseur fixe les objectifs de ses sites et de ses hôtesses ; l'objectif global reste au gérant
        if ($siteId) {
            abort_unless($user->managesSite($siteId), 403);
        } elseif ($userId) {
            abort_unless(User::visibleTo($user)->whereKey($userId)->exists(), 403);
        } else {
            abort_unless($user->hasRole(Role::CompanyAdmin), 403);
        }

        // L'objectif s'applique à partir de ce mois et reste reconduit tant qu'il n'est pas changé
        $monthStart = $this->today($company)->startOfMonth();
        $key = SalesTarget::keyFor($siteId, $userId);
        $desired = (int) ($data['amount'] ?? 0);

        $inherited = (int) (SalesTarget::latestFor($company->id, $monthStart->subMonth())->get($key)?->amount ?? 0);
        $thisMonth = SalesTarget::where('company_id', $company->id)
            ->where('site_id', $siteId)
            ->where('user_id', $userId)
            ->whereDate('month', $monthStart->toDateString())
            ->get();

        if ($desired === $inherited) {
            // Retour à l'objectif des mois précédents : la ligne du mois n'a plus lieu d'être
            $thisMonth->each->delete();
        } else {
            $target = $thisMonth->shift() ?? new SalesTarget(['company_id' => $company->id, 'site_id' => $siteId, 'user_id' => $userId, 'month' => $monthStart]);
            // 0 enregistré = objectif retiré à partir de ce mois
            $target->fill(['amount' => $desired, 'updated_by' => $user->id])->save();
            // Doublons éventuels laissés par l'ancien enregistrement
            $thisMonth->each->delete();
        }

        return back()->with('success', $desired > 0 ? 'Objectif enregistré. Il reste en place les mois suivants.' : 'Objectif retiré à partir de ce mois.');
    }

    /**
     * Objectifs du mois en cours : réalisé, progression et projection de fin de mois au rythme actuel.
     * Indépendants des filtres de la page ; le superviseur ne voit que ses sites et ses hôtesses.
     */
    private function targets(User $user): array
    {
        $company = $user->company;
        $siteIds = $user->managedSiteIds();
        $today = $this->today($company);
        $monthStart = $today->startOfMonth();
        $month = new SalesReport($company, $monthStart, $today->endOfDay(), allowedSiteIds: $siteIds);

        // Objectifs en vigueur ce mois-ci : fixés ce mois-ci ou reconduits depuis un mois précédent
        $targets = SalesTarget::effective($company->id, $monthStart);
        $global = $targets->get('g');
        $bySiteTarget = $targets->filter(fn (SalesTarget $t) => $t->site_id && ! $t->user_id)->keyBy('site_id');
        $byHostessTarget = $targets->filter(fn (SalesTarget $t) => $t->user_id)->keyBy('user_id');
        // Mois depuis lequel un objectif est reconduit (null s'il a été fixé ce mois-ci)
        $since = fn (?SalesTarget $t) => $t && $t->month->lt($monthStart) ? $t->month->toDateString() : null;

        $bySite = $month->revenueBySite();
        $byHostess = $month->revenueByHostess();

        // Hôtesses : celles qui ont une affectation en cours ou déjà un objectif ce mois-ci
        $hostesses = $company->users()
            ->where('role', Role::FieldAgent)
            ->visibleTo($user)
            ->where(fn ($q) => $q
                ->whereHas('affectations', fn ($a) => $a->ongoing()->when($siteIds !== null, fn ($a) => $a->whereIn('site_id', $siteIds)))
                ->orWhereIn('id', $byHostessTarget->keys()))
            ->orderBy('name')
            ->get(['id', 'name']);

        return [
            'month' => $monthStart->toDateString(),
            'days_elapsed' => $today->day,
            'days_in_month' => $today->daysInMonth,
            // L'objectif de l'entreprise n'a pas de sens sur le périmètre d'un superviseur
            'global' => $siteIds === null
                ? [...SalesTarget::progress($month->totals()['revenue'], $global?->amount, $today), 'since' => $since($global)]
                : null,
            'sites' => $company->sites()
                ->when($siteIds !== null, fn ($q) => $q->whereIn('id', $siteIds))
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($site) => [
                    'site_id' => $site->id,
                    'name' => $site->name,
                    ...SalesTarget::progress($bySite[$site->id] ?? 0.0, $bySiteTarget->get($site->id)?->amount, $today),
                    'since' => $since($bySiteTarget->get($site->id)),
                ]),
            'hostesses' => $hostesses->map(fn (User $hostess) => [
                'user_id' => $hostess->id,
                'name' => $hostess->name,
                ...SalesTarget::progress($byHostess[$hostess->id] ?? 0.0, $byHostessTarget->get($hostess->id)?->amount, $today),
                'since' => $since($byHostessTarget->get($hostess->id)),
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

    private function options(User $user): array
    {
        $company = $user->company;
        $siteIds = $user->managedSiteIds();

        return [
            'sites' => $company->sites()
                ->when($siteIds !== null, fn ($q) => $q->whereIn('id', $siteIds))
                ->orderBy('name')
                ->get(['id', 'name']),
            'hostesses' => $company->users()
                ->whereIn('id', $company->dailyReports()
                    ->when($siteIds !== null, fn ($q) => $q->whereIn('site_id', $siteIds))
                    ->select('user_id'))
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
