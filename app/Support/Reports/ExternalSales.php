<?php

namespace App\Support\Reports;

use App\Models\DailyReport;
use App\Models\DailyReportLine;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Ventes en boutique extérieure, saisies dans le rapport du jour.
 *
 * L'hôtesse vend les produits de son point de vente, aux mêmes prix, dans une autre boutique :
 * ces ventes comptent dans son chiffre d'affaires et ses objectifs, mais ne sortent pas du stock
 * de son point de vente. Elles sont gardées comme lignes du rapport marquées du nom de la boutique.
 */
final class ExternalSales
{
    /** Règles de validation, communes au brouillon et à la soumission. */
    public const RULES = [
        'external_sales' => ['nullable', 'array', 'max:100'],
        'external_sales.*.shop' => ['required', 'string', 'max:120'],
        'external_sales.*.product_id' => ['required', 'integer'],
        'external_sales.*.units' => ['required', 'integer', 'min:1', 'max:100000'],
    ];

    /**
     * Produits proposés : ceux du point de vente de l'hôtesse, au prix du rapport.
     *
     * @return Collection<int, array{id: int, name: string, unit: string, unit_price: float}>
     */
    public static function products(DailyReport $report): Collection
    {
        $report->loadMissing('lines.siteProduct:id,product_id');

        return $report->lines
            ->filter(fn (DailyReportLine $l) => $l->siteProduct?->product_id !== null)
            ->map(fn (DailyReportLine $l) => [
                'id' => (int) $l->siteProduct->product_id,
                'name' => $l->product_name,
                'unit' => $l->unit,
                'unit_price' => (float) $l->unit_price,
            ])
            ->unique('id')
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }

    /**
     * Remplace les ventes en boutique extérieure du rapport par celles saisies.
     * Une même boutique et un même produit saisis deux fois sont additionnés.
     *
     * @param  list<array{shop: string, product_id: int, units: int}>  $entries
     */
    public static function apply(DailyReport $report, array $entries): void
    {
        $products = self::products($report)->keyBy('id');
        $grouped = [];

        foreach ($entries as $entry) {
            $shop = self::shopName($entry['shop']);
            $product = $products->get((int) $entry['product_id']);

            if ($shop === '') {
                throw ValidationException::withMessages(['external_sales' => 'Indiquez le nom de chaque boutique extérieure.']);
            }

            if ($product === null) {
                throw ValidationException::withMessages(['external_sales' => 'Ce produit n’est pas vendu sur votre point de vente.']);
            }

            $key = Str::lower($shop).'|'.$product['id'];
            $grouped[$key] ??= ['shop' => $shop, 'product' => $product, 'units' => 0];
            $grouped[$key]['units'] += (int) $entry['units'];
        }

        $report->externalLines()->delete();

        foreach ($grouped as $sale) {
            $report->allLines()->create([
                'product_id' => $sale['product']['id'],
                'external_shop' => $sale['shop'],
                'product_name' => $sale['product']['name'],
                'unit' => $sale['product']['unit'],
                'unit_price' => $sale['product']['unit_price'],
                // Hors stock du point de vente : pas de stock d'ouverture ni de clôture
                'opening_stock' => 0,
                'single_units' => $sale['units'],
                'units_sold' => $sale['units'],
                'closing_stock' => 0,
                'revenue' => $sale['units'] * $sale['product']['unit_price'],
            ]);
        }

        $report->unsetRelation('externalLines');
    }

    /**
     * Ventes du rapport regroupées par boutique, pour l'affichage.
     *
     * @return list<array{shop: string, revenue: float, units: int, lines: list<array<string, mixed>>}>
     */
    public static function present(DailyReport $report): array
    {
        $report->loadMissing('externalLines');

        return $report->externalLines
            ->groupBy('external_shop')
            ->map(fn (Collection $lines, string $shop) => [
                'shop' => $shop,
                'revenue' => (float) $lines->sum('revenue'),
                'units' => (int) $lines->sum('units_sold'),
                'lines' => $lines->map(fn (DailyReportLine $l) => [
                    'id' => $l->id,
                    'product_id' => $l->product_id,
                    'product_name' => $l->product_name,
                    'unit' => $l->unit,
                    'unit_price' => (float) $l->unit_price,
                    'units' => (int) $l->units_sold,
                    'revenue' => (float) $l->revenue,
                ])->values()->all(),
            ])
            ->sortBy('shop', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    /**
     * Boutiques où l'hôtesse a déjà vendu, des plus récentes aux plus anciennes : suggestions de saisie.
     *
     * @return list<string>
     */
    public static function shopsUsedBy(User $user, int $limit = 20): array
    {
        return DailyReportLine::query()
            ->join('daily_reports as r', 'r.id', '=', 'daily_report_lines.daily_report_id')
            ->where('r.user_id', $user->id)
            ->whereNotNull('daily_report_lines.external_shop')
            ->selectRaw('daily_report_lines.external_shop as shop, MAX(r.report_date) as last_date')
            ->groupBy('daily_report_lines.external_shop')
            ->orderByDesc('last_date')
            ->limit($limit)
            ->pluck('shop')
            ->all();
    }

    /** Nom saisi, espaces superflus retirés. */
    private static function shopName(string $name): string
    {
        return Str::limit(trim((string) preg_replace('/\s+/u', ' ', $name)), 120, '');
    }
}
