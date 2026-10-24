<?php

namespace App\Support\Reports;

use App\Models\Company;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
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
     * Chiffre d'affaires par site, indexé par identifiant de site.
     *
     * @return array<int, float>
     */
    public function revenueBySite(): array
    {
        return $this->query()
            ->groupBy('r.site_id')
            ->selectRaw('r.site_id, COALESCE(SUM(l.revenue), 0) as revenue')
            ->pluck('revenue', 'r.site_id')
            ->map(fn ($v) => (float) $v)
            ->all();
    }

    /** Nombre de jours couverts par la période (bornes incluses). */
    public function days(): int
    {
        return (int) $this->from->startOfDay()->diffInDays($this->to->startOfDay()) + 1;
    }

    /**
     * Même durée, juste avant : base de comparaison des chiffres clés et de la courbe.
     */
    public function previous(): self
    {
        $days = $this->days();

        return new self(
            $this->company,
            $this->from->subDays($days)->startOfDay(),
            $this->from->subDay()->endOfDay(),
            $this->siteId,
            $this->userId,
            $this->eventId,
        );
    }

    /**
     * Pas de la courbe d'évolution : au jour, à la semaine ou au mois selon la durée.
     */
    public function granularity(): string
    {
        return match (true) {
            $this->days() <= 45 => 'day',
            $this->days() <= 200 => 'week',
            default => 'month',
        };
    }

    /**
     * Courbe d'évolution du chiffre d'affaires, période précédente alignée point par point.
     * Les jours sans vente valent zéro, pour une courbe continue.
     */
    public function timeline(): array
    {
        $granularity = $this->granularity();
        $previous = $this->previous();
        $current = $this->bucket($granularity);
        $before = array_values($previous->bucket($granularity));

        $points = [];

        foreach (array_values($current) as $i => $point) {
            $points[] = [
                'date' => $point['date'],
                'revenue' => $point['revenue'],
                'units_sold' => $point['units_sold'],
                'previous_date' => $before[$i]['date'] ?? null,
                'previous_revenue' => $before[$i]['revenue'] ?? null,
            ];
        }

        return ['granularity' => $granularity, 'points' => $points];
    }

    /**
     * Les 12 derniers mois jusqu'au mois de fin de la période, avec la variation d'un mois sur l'autre.
     */
    public function monthly(int $months = 12): array
    {
        $year = new self(
            $this->company,
            $this->to->startOfMonth()->subMonths($months - 1)->startOfDay(),
            $this->to->endOfMonth(),
            $this->siteId,
            $this->userId,
            $this->eventId,
        );

        $rows = [];
        $before = null;

        foreach ($year->bucket('month') as $month) {
            $rows[] = [
                ...$month,
                'variation' => $before ? ($month['revenue'] - $before) / $before * 100 : null,
            ];
            $before = $month['revenue'] ?: null;
        }

        return $rows;
    }

    /**
     * Ventes par jour regroupées en pas réguliers (jour, semaine du lundi, mois), sans trou.
     *
     * @return array<string, array{date: string, revenue: float, units_sold: int, reports_count: int}>
     */
    private function bucket(string $granularity): array
    {
        $start = fn (CarbonInterface $d) => match ($granularity) {
            'week' => $d->startOfWeek(CarbonInterface::MONDAY),
            'month' => $d->startOfMonth(),
            default => $d->startOfDay(),
        };
        $step = fn (CarbonInterface $d) => match ($granularity) {
            'week' => $d->addWeek(),
            'month' => $d->addMonth(),
            default => $d->addDay(),
        };

        $buckets = [];

        for ($d = $start($this->from); $d->lte($this->to); $d = $step($d)) {
            // Le premier pas peut commencer avant la période (lundi, 1er du mois) : on affiche le début réel
            $shown = $d->lt($this->from) ? $this->from : $d;
            $buckets[$d->toDateString()] = ['date' => $shown->toDateString(), 'revenue' => 0.0, 'units_sold' => 0, 'reports_count' => 0];
        }

        foreach ($this->byDay() as $day) {
            $key = $start(CarbonImmutable::parse($day['label']))->toDateString();

            if (isset($buckets[$key])) {
                $buckets[$key]['revenue'] += $day['revenue'];
                $buckets[$key]['units_sold'] += $day['units_sold'];
                $buckets[$key]['reports_count'] += $day['reports_count'];
            }
        }

        return $buckets;
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
