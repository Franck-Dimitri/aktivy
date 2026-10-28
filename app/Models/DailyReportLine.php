<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $daily_report_id
 * @property int $site_product_id
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
    'daily_report_id', 'site_product_id',
    'product_name', 'unit', 'unit_price',
    'opening_stock', 'single_units', 'units_sold', 'closing_stock', 'revenue',
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

    public function report(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    public function siteProduct(): BelongsTo
    {
        return $this->belongsTo(SiteProduct::class);
    }
}
