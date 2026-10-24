<?php

namespace App\Support\Reports;

use App\Models\Company;
use Illuminate\Database\Query\Builder;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Ventes d'une entreprise sur une période, à partir des rapports journaliers envoyés.
 * Source unique de la page « Rapports » et de l'export Excel, pour que les chiffres concordent.
 */
class SalesReport
{
    public function __construct(
        public readonly Company $company,
        public readonly CarbonInterface $from,
        public readonly CarbonInterface $to,
        public readonly ?int $siteId = null,
        public readonly ?int $userId = null,
        public readonly ?int $eventId = null,
    ) {}

    /**
     * Construit le rapport depuis les filtres de la requête ; par défaut, le mois en cours.
     */
    public static function fromFilters(Company $company, array $filters): self
    {
        $from = isset($filters['from']) ? CarbonImmutable::parse($filters['from']) : CarbonImmutable::now()->startOfMonth();
        $to = isset($filters['to']) ? CarbonImmutable::parse($filters['to']) : CarbonImmutable::now();

        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }

        return new self(
            $company,
            $from->startOfDay(),
            $to->endOfDay(),
            isset($filters['site_id']) ? (int) $filters['site_id'] : null,
            isset($filters['user_id']) ? (int) $filters['user_id'] : null,
            isset($filters['event_id']) ? (int) $filters['event_id'] : null,
        );
    }

    /**
     * Lignes de vente filtrées, avec le rapport, le site, l'hôtesse et l'événement.
     */
    public function query(): Builder
    {
        return DB::table('daily_report_lines as l')
            ->join('daily_reports as r', 'r.id', '=', 'l.daily_report_id')
            ->leftJoin('sites as s', 's.id', '=', 'r.site_id')
            ->leftJoin('users as u', 'u.id', '=', 'r.user_id')
            ->leftJoin('events as e', 'e.id', '=', 'r.event_id')
            ->where('r.company_id', $this->company->id)
            ->where('r.status', 'submitted')
            ->whereBetween('r.report_date', [$this->from->toDateString(), $this->to->toDateString()])
            ->when($this->siteId, fn ($q) => $q->where('r.site_id', $this->siteId))
            ->when($this->userId, fn ($q) => $q->where('r.user_id', $this->userId))
            ->when($this->eventId, fn ($q) => $q->where('r.event_id', $this->eventId));
    }

    public function totals(): array
    {
        $row = $this->query()
            ->selectRaw('COALESCE(SUM(l.revenue), 0) as revenue')
            ->selectRaw('COALESCE(SUM(l.units_sold), 0) as units_sold')
            ->selectRaw('COUNT(DISTINCT r.id) as reports_count')
            ->selectRaw('COUNT(DISTINCT r.report_date) as days_count')
            ->selectRaw('COUNT(DISTINCT r.site_id) as sites_count')
            ->selectRaw('COUNT(DISTINCT r.user_id) as hostesses_count')
            ->first();

        return [
            'revenue' => (float) $row->revenue,
            'units_sold' => (int) $row->units_sold,
            'reports_count' => (int) $row->reports_count,
            'days_count' => (int) $row->days_count,
            'sites_count' => (int) $row->sites_count,
            'hostesses_count' => (int) $row->hostesses_count,
        ];
    }

    public function byDay(): Collection
    {
        return $this->aggregate('r.report_date', 'r.report_date as label', 'r.report_date');
    }

    public function bySite(): Collection
    {
        return $this->aggregate(['r.site_id', 's.name', 's.city'], "COALESCE(s.name, 'Site supprimé') as label, s.city as detail");
    }

    public function byProduct(): Collection
    {
        return $this->aggregate(['l.product_name', 'l.unit'], 'l.product_name as label, l.unit as detail');
    }

    public function byHostess(): Collection
    {
        return $this->aggregate(['r.user_id', 'u.name', 'u.phone'], "COALESCE(u.name, 'Compte supprimé') as label, u.phone as detail");
    }

    /**
     * Journal des ventes, une ligne par produit et par rapport, du plus ancien au plus récent.
     */
    public function lines(?int $limit = null): Collection
    {
        return $this->query()
            ->select([
                'r.id as report_id', 'r.report_date', 'r.submitted_at',
                's.name as site_name', 's.code as site_code', 's.city as site_city',
                'u.name as hostess_name', 'u.phone as hostess_phone',
                'e.name as event_name',
                'l.product_name', 'l.unit', 'l.unit_price',
                'l.opening_stock', 'l.units_sold', 'l.closing_stock', 'l.revenue', 'l.notes',
            ])
            ->orderBy('r.report_date')
            ->orderBy('s.name')
            ->orderBy('r.id')
            ->orderBy('l.id')
            ->when($limit, fn ($q) => $q->limit($limit))
            ->get();
    }

    /**
     * Regroupe les ventes : chiffre d'affaires, quantités et nombre de rapports par groupe.
     */
    private function aggregate(string|array $groupBy, string $labelSelect, ?string $orderBy = null): Collection
    {
        $query = $this->query()
            ->selectRaw($labelSelect)
            ->selectRaw('COALESCE(SUM(l.revenue), 0) as revenue')
            ->selectRaw('COALESCE(SUM(l.units_sold), 0) as units_sold')
            ->selectRaw('COUNT(DISTINCT r.id) as reports_count')
            ->groupBy($groupBy);

        $orderBy ? $query->orderBy($orderBy) : $query->orderByDesc('revenue');

        return $query->get()->map(fn ($row) => [
            'label' => (string) $row->label,
            'detail' => $row->detail ?? null,
            'revenue' => (float) $row->revenue,
            'units_sold' => (int) $row->units_sold,
            'reports_count' => (int) $row->reports_count,
        ]);
    }
}
