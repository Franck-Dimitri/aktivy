<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ligne d'un rapport journalier. Deux sortes :
 * - une ligne du stock du point de vente (site_product_id) : stock d'ouverture, ventes, stock de clôture ;
 * - une vente en boutique extérieure (external_shop + product_id) : mêmes produits et mêmes prix,
 *   sans effet sur le stock du point de vente.
 *
 * @property int $id
 * @property int $daily_report_id
 * @property int|null $site_product_id
 * @property int|null $product_id
 * @property string|null $external_shop
 * @property string $product_name
 * @property string $unit
 * @property float $unit_price
 * @property int $opening_stock
 * @property int $units_sold
 * @property int $closing_stock
 * @property float $revenue
 * @property string|null $notes
 */
#[Fillable([
    'daily_report_id', 'site_product_id', 'product_id', 'external_shop',
    'product_name', 'unit', 'unit_price',
    'opening_stock', 'single_units', 'units_sold', 'closing_stock', 'stock_gap', 'gap_reason', 'revenue',
    'notes',
])]
class DailyReportLine extends Model
{
    protected function casts(): array
    {
        return [
            'unit_price' => 'float',
            'opening_stock' => 'integer',
            'units_sold' => 'integer',
            'closing_stock' => 'integer',
            'revenue' => 'float',
        ];
    }

    /** Vente en boutique extérieure (hors stock du point de vente). */
    public function isExternal(): bool
    {
        return $this->external_shop !== null;
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    public function siteProduct(): BelongsTo
    {
        return $this->belongsTo(SiteProduct::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
