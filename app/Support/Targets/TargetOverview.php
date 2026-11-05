<?php

namespace App\Support\Targets;

use App\Enums\Role;
use App\Models\SalesTarget;
use App\Models\User;
use App\Models\WeeklyTarget;
use App\Support\Reports\SalesReport;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Tableau des objectifs des hôtesses pour une période (semaine ou mois, en cours ou précédente) :
 * objectif, réalisé, projection, statut et régularité sur les périodes précédentes.
 *
 * Quand une seule des deux échelles est fixée, l'autre est calculée au prorata des jours :
 * mensuel = hebdomadaire × jours du mois / 7 (≈ 4,3 semaines), hebdomadaire = mensuel × 7 / jours du mois.
 */
class TargetOverview
{
    public const PERIODS = ['week', 'month', 'last_week', 'last_month'];

    /** Nombre de périodes passées affichées pour la régularité. */
    private const HISTORY = 4;

    public function __construct(private User $viewer, private CarbonImmutable $today) {}

    /** @return array<string, mixed> */
    public function build(string $period): array
    {
        $company = $this->viewer->company;
        $isWeek = str_contains($period, 'week');
        [$start, $end] = $this->range($period);
        $current = ! str_starts_with($period, 'last');
        $to = $current ? $this->today->endOfDay() : $end->endOfDay();

        $hostesses = $this->hostesses($start);
        $ids = $hostesses->pluck('id')->all();
        $actual = (new SalesReport($company, $start, $to, allowedSiteIds: $this->viewer->managedSiteIds()))->revenueByHostess();

        $targets = $this->targets($ids, $start, $isWeek);
        $history = $this->history($ids, $start, $isWeek);

        $totalDays = (int) $start->diffInDays($end) + 1;
        $elapsed = $current ? (int) $start->diffInDays($this->today) + 1 : $totalDays;

        $rows = $hostesses->map(function (User $h) use ($targets, $actual, $history, $elapsed, $totalDays) {
            $target = $targets[$h->id] ?? null;
            $done = (float) ($actual[$h->id] ?? 0);
            $projection = $elapsed > 0 ? $done / $elapsed * $totalDays : 0;
            $status = match (true) {
                ! $target => 'none',
                $done >= $target['amount'] => 'reached',
                $projection >= $target['amount'] => 'on_track',
                default => 'behind',
            };

            return [
                'user_id' => $h->id,
                'name' => $h->name,
                'sites' => $h->affectations->pluck('site.name')->filter()->unique()->values(),
                'target' => $target ? (int) round($target['amount']) : null,
                // fixed : fixé à cette échelle ; derived : calculé depuis l'autre échelle
                'source' => $target['source'] ?? null,
                'actual' => $done,
                'projection' => $elapsed < $totalDays ? $projection : $done,
                'status' => $status,
                'history' => $history[$h->id] ?? [],
            ];
        })->sortBy([
            // Ceux qui ont un objectif d'abord, les mieux avancés en tête
            fn ($a, $b) => ($a['target'] === null) <=> ($b['target'] === null),
            fn ($a, $b) => ($b['target'] ? $b['actual'] / $b['target'] : 0) <=> ($a['target'] ? $a['actual'] / $a['target'] : 0),
        ])->values();

        $withTarget = $rows->whereNotNull('target');

        return [
            'period' => $period,
            'scale' => $isWeek ? 'week' : 'month',
            'start' => $start->toDateString(),
            'end' => $end->toDateString(),
            'current' => $current,
            'elapsed_days' => $elapsed,
            'total_days' => $totalDays,
            'currency' => $company->currency ?: 'XAF',
            'summary' => [
                'hostesses' => $rows->count(),
                'with_target' => $withTarget->count(),
                'reached' => $withTarget->where('status', 'reached')->count(),
                'on_track' => $withTarget->where('status', 'on_track')->count(),
                'behind' => $withTarget->where('status', 'behind')->count(),
                'target_total' => (int) $withTarget->sum('target'),
                'actual_total' => (float) $withTarget->sum('actual'),
            ],
            'rows' => $rows,
        ];
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function range(string $period): array
    {
        $week = WeeklyTarget::weekOf($this->today);
        $month = $this->today->startOfMonth();

        return match ($period) {
            'last_week' => [$week->subWeek(), $week->subDay()],
            'month' => [$month, $month->endOfMonth()->startOfDay()],
            'last_month' => [$month->subMonth(), $month->subDay()],
            default => [$week, $week->addDays(6)],
        };
    }

    /**
     * Hôtesses suivies : affectées (sur les sites du superviseur pour lui), plus celles qui ont un objectif.
     *
     * @return Collection<int, User>
     */
    private function hostesses(CarbonImmutable $start): Collection
    {
        $siteIds = $this->viewer->managedSiteIds();

        return User::query()
            ->where('company_id', $this->viewer->company_id)
            ->where('role', Role::FieldAgent)
            ->visibleTo($this->viewer)
            ->where(fn ($q) => $q
                ->whereHas('affectations', fn ($a) => $a->ongoing()->when($siteIds !== null, fn ($a) => $a->whereIn('site_id', $siteIds)))
                ->orWhereIn('id', WeeklyTarget::whereDate('week_start', '<=', $start->toDateString())->where('amount', '>', 0)->select('user_id'))
                ->orWhereIn('id', SalesTarget::whereNotNull('user_id')->whereDate('month', '<=', $start->toDateString())->where('amount', '>', 0)->select('user_id')))
            ->with(['affectations' => fn ($a) => $a->ongoing()->with('site:id,name')])
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    /**
     * Objectif de chaque hôtesse pour la période commençant à $start.
     *
     * @param  array<int>  $ids
     * @return array<int, array{amount: float, source: string}>
     */
    private function targets(array $ids, CarbonImmutable $start, bool $isWeek): array
    {
        $out = [];

        if ($isWeek) {
            $weekly = WeeklyTarget::effective($ids, $start);
            $monthly = SalesTarget::effective($this->viewer->company_id, $start);
            foreach ($ids as $id) {
                if ($t = $weekly->get($id)) {
                    $out[$id] = ['amount' => (float) $t->amount, 'source' => 'fixed'];
                } elseif ($m = $monthly->get(SalesTarget::keyFor(null, $id))) {
                    $out[$id] = ['amount' => $m->amount * 7 / $start->daysInMonth, 'source' => 'derived'];
                }
            }

            return $out;
        }

        $monthly = SalesTarget::effective($this->viewer->company_id, $start);
        $fromWeeks = $this->monthFromWeeks($ids, $start);
        foreach ($ids as $id) {
            if ($m = $monthly->get(SalesTarget::keyFor(null, $id))) {
                $out[$id] = ['amount' => (float) $m->amount, 'source' => 'fixed'];
            } elseif (($fromWeeks[$id] ?? 0) > 0) {
                $out[$id] = ['amount' => $fromWeeks[$id], 'source' => 'derived'];
            }
        }

        return $out;
    }

    /**
     * Objectif mensuel calculé depuis les objectifs hebdomadaires : chaque jour du mois compte pour 1/7
     * de l'objectif de sa semaine (un changement en cours de mois est donc pris en compte).
     *
     * @param  array<int>  $ids
     * @return array<int, float>
     */
    private function monthFromWeeks(array $ids, CarbonImmutable $monthStart): array
    {
        $sum = [];
        for ($week = WeeklyTarget::weekOf($monthStart); $week->lte($monthStart->endOfMonth()); $week = $week->addWeek()) {
            $daysInMonth = 0;
            for ($d = 0; $d < 7; $d++) {
                $day = $week->addDays($d);
                if ($day->month === $monthStart->month && $day->year === $monthStart->year) {
                    $daysInMonth++;
                }
            }
            foreach (WeeklyTarget::effective($ids, $week) as $id => $t) {
                $sum[$id] = ($sum[$id] ?? 0) + $t->amount * $daysInMonth / 7;
            }
        }

        return $sum;
    }

    /**
     * Régularité : objectif atteint ou non sur les périodes précédentes (null sans objectif).
     *
     * @param  array<int>  $ids
     * @return array<int, array<int, array{label: string, reached: bool|null}>>
     */
    private function history(array $ids, CarbonImmutable $start, bool $isWeek): array
    {
        $out = [];
        $company = $this->viewer->company;

        for ($i = self::HISTORY; $i >= 1; $i--) {
            $from = $isWeek ? $start->subWeeks($i) : $start->subMonthsNoOverflow($i)->startOfMonth();
            $to = $isWeek ? $from->addDays(6) : $from->endOfMonth();
            $label = $isWeek ? 'Sem. du '.$from->locale('fr')->translatedFormat('j M') : ucfirst($from->locale('fr')->translatedFormat('F'));
            $targets = $this->targets($ids, $from, $isWeek);
            $actual = (new SalesReport($company, $from, $to->endOfDay(), allowedSiteIds: $this->viewer->managedSiteIds()))->revenueByHostess();

            foreach ($ids as $id) {
                $out[$id][] = [
                    'label' => $label,
                    'reached' => isset($targets[$id]) ? (float) ($actual[$id] ?? 0) >= $targets[$id]['amount'] : null,
                ];
            }
        }

        return $out;
    }
}
