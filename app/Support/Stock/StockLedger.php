<?php

namespace App\Support\Stock;

use App\Models\SiteProduct;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Seule porte d'entrée pour changer le stock d'un produit sur un site : la ligne est
 * verrouillée le temps du calcul, et chaque changement laisse un mouvement dans le journal.
 */
class StockLedger
{
    /**
     * Ajoute (ou retire, si négatif) une quantité au stock ; le stock ne descend pas sous zéro.
     */
    public static function move(
        int $siteProductId,
        int $delta,
        string $type,
        ?User $by = null,
        ?int $dailyReportId = null,
        ?string $notes = null,
    ): ?StockMovement {
        return DB::transaction(function () use ($siteProductId, $delta, $type, $by, $dailyReportId, $notes) {
            $stock = SiteProduct::whereKey($siteProductId)->lockForUpdate()->first();

            if (! $stock) {
                return null;
            }

            return self::apply($stock, max(0, $stock->current_stock + $delta), $type, $by, $dailyReportId, $notes);
        });
    }

    /**
     * Fixe le stock à une valeur comptée (inventaire, stock initial).
     */
    public static function set(SiteProduct $stock, int $count, string $type, ?User $by = null, ?string $notes = null): ?StockMovement
    {
        return DB::transaction(function () use ($stock, $count, $type, $by, $notes) {
            $locked = SiteProduct::whereKey($stock->id)->lockForUpdate()->firstOrFail();

            return self::apply($locked, max(0, $count), $type, $by, null, $notes);
        });
    }

    private static function apply(SiteProduct $stock, int $after, string $type, ?User $by, ?int $dailyReportId, ?string $notes): ?StockMovement
    {
        $change = $after - $stock->current_stock;

        // Un inventaire qui confirme le stock n'est pas un mouvement ; le stock initial, si
        if ($change === 0 && $type !== StockMovement::INITIAL) {
            return null;
        }

        $stock->update(['current_stock' => $after, 'updated_by' => $by?->id ?? $stock->updated_by]);

        return StockMovement::create([
            'company_id' => $stock->company_id,
            'site_id' => $stock->site_id,
            'site_product_id' => $stock->id,
            'type' => $type,
            'quantity' => $change,
            'stock_after' => $after,
            'daily_report_id' => $dailyReportId,
            'user_id' => $by?->id,
            'notes' => $notes,
        ]);
    }
}
