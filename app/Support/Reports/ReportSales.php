<?php

namespace App\Support\Reports;

use App\Enums\EventPackType;
use App\Models\DailyReport;
use App\Models\DailyReportLine;
use App\Models\EventPack;
use App\Models\SiteProduct;
use Illuminate\Support\Collection;

/**
 * Ventes d'un rapport journalier : à l'unité, produit par produit, et en packs d'événement.
 *
 * Les ventes en packs sont reportées sur les lignes produit : leurs unités (offertes comprises)
 * sortent du stock, et le prix du pack est réparti sur ses produits payants au prorata de leur
 * prix. Une ligne garde ainsi ses totaux (units_sold, revenue) ; single_units en est la part
 * vendue à l'unité.
 */
class ReportSales
{
    /**
     * Packs vendables dans ce rapport : ceux de l'événement du rapport, actifs (ou déjà vendus
     * dans ce rapport), dont tous les produits sont suivis sur le site.
     *
     * @return Collection<int, EventPack>
     */
    public static function availablePacks(DailyReport $report): Collection
    {
        if (! $report->event_id) {
            return collect();
        }

        $productIds = array_keys(self::linesByProduct($report)->all());

        // Un pack désactivé depuis sa vente reste corrigeable dans ce rapport
        $alreadySold = $report->packs()->whereNotNull('event_pack_id')->pluck('event_pack_id');

        return EventPack::where('event_id', $report->event_id)
            ->where(fn ($q) => $q->where('active', true)->orWhereIn('id', $alreadySold))
            ->with('lines')
            ->orderBy('name')
            ->get()
            ->filter(fn (EventPack $pack) => $pack->lines->isNotEmpty()
                && $pack->lines->every(fn ($line) => in_array($line->product_id, $productIds, true)))
            ->values();
    }

    /**
     * Prix de vente d'un pack : le prix du lot, ou la somme des produits payants pour un « acheté / offert ».
     */
    public static function packValue(EventPack $pack, Collection $linesByProduct): int
    {
        if ($pack->type === EventPackType::GroupedDiscount) {
            return (int) $pack->price;
        }

        return (int) round($pack->lines
            ->where('role', 'paid')
            ->sum(fn ($l) => $l->quantity * ($l->unit_price ?? $linesByProduct->get($l->product_id)?->unit_price ?? 0)));
    }

    /**
     * Enregistre les ventes saisies et recalcule les lignes du rapport.
     *
     * @param  array<int, int>  $singleUnits  unités vendues à l'unité, par id de ligne
     * @param  array<int, int>  $packCounts  packs vendus, par id de pack
     * @param  array<int, string|null>|null  $lineNotes  notes par id de ligne (null : inchangées)
     */
    public static function apply(DailyReport $report, array $singleUnits, array $packCounts, ?array $lineNotes = null): void
    {
        $lines = $report->lines()->get()->keyBy('id');
        $byProduct = self::linesByProduct($report, $lines);
        $packs = self::availablePacks($report)->keyBy('id');

        $packUnits = [];
        $packRevenue = [];
        $soldPacks = [];

        foreach ($packCounts as $packId => $count) {
            $pack = $packs->get($packId);
            $count = max(0, (int) $count);

            if (! $pack || $count === 0) {
                continue;
            }

            $value = self::packValue($pack, $byProduct);
            $soldPacks[$pack->id] = ['pack' => $pack, 'count' => $count, 'value' => $value];

            foreach ($pack->lines as $packLine) {
                $line = $byProduct->get($packLine->product_id);
                $packUnits[$line->id] = ($packUnits[$line->id] ?? 0) + $count * $packLine->quantity;
            }

            foreach (self::revenueShares($pack, $byProduct) as $lineId => $share) {
                $packRevenue[$lineId] = ($packRevenue[$lineId] ?? 0) + $count * $value * $share;
            }
        }

        foreach ($lines as $line) {
            $single = max(0, (int) ($singleUnits[$line->id] ?? $line->single_units));
            $units = $single + ($packUnits[$line->id] ?? 0);

            $line->fill([
                'single_units' => $single,
                'units_sold' => $units,
                'closing_stock' => max(0, $line->opening_stock - $units),
                'revenue' => round($single * $line->unit_price + ($packRevenue[$line->id] ?? 0), 2),
            ]);

            if ($lineNotes !== null && array_key_exists($line->id, $lineNotes)) {
                $line->notes = $lineNotes[$line->id];
            }

            $line->save();
        }

        $report->packs()->whereNotIn('event_pack_id', array_keys($soldPacks))->delete();

        foreach ($soldPacks as $sold) {
            $report->packs()->updateOrCreate(
                ['event_pack_id' => $sold['pack']->id],
                [
                    'name' => $sold['pack']->name,
                    'unit_value' => $sold['value'],
                    'quantity' => $sold['count'],
                    'revenue' => $sold['count'] * $sold['value'],
                ],
            );
        }
    }

    /**
     * Part du prix d'un pack revenant à chaque ligne : ses produits payants, au prorata de leur prix.
     *
     * @return array<int, float> part (0 à 1) par id de ligne
     */
    private static function revenueShares(EventPack $pack, Collection $byProduct): array
    {
        $paid = $pack->lines->where('role', 'paid');
        $weights = [];

        foreach ($paid as $packLine) {
            $line = $byProduct->get($packLine->product_id);
            $weights[$line->id] = ($weights[$line->id] ?? 0) + $packLine->quantity * (float) $line->unit_price;
        }

        $total = array_sum($weights);

        // Produits sans prix : le pack est réparti à parts égales
        if ($total <= 0) {
            return $weights === [] ? [] : array_fill_keys(array_keys($weights), 1 / count($weights));
        }

        return array_map(fn ($w) => $w / $total, $weights);
    }

    /**
     * Lignes du rapport indexées par produit.
     *
     * @param  Collection<int, DailyReportLine>|null  $lines
     * @return Collection<int, DailyReportLine>
     */
    private static function linesByProduct(DailyReport $report, ?Collection $lines = null): Collection
    {
        $lines ??= $report->lines()->get();
        $productBySiteProduct = SiteProduct::whereIn('id', $lines->pluck('site_product_id'))->pluck('product_id', 'id');

        return $lines->keyBy(fn (DailyReportLine $l) => $productBySiteProduct[$l->site_product_id] ?? 0);
    }
}
