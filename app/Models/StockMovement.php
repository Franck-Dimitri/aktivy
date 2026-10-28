<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un changement du stock d'un produit sur un site, avec le stock obtenu.
 *
 * @property int $id
 * @property int $company_id
 * @property int $site_id
 * @property int $site_product_id
 * @property string $type
 * @property int $quantity
 * @property int $stock_after
 * @property int|null $daily_report_id
 * @property int|null $user_id
 * @property string|null $notes
 */
#[Fillable(['company_id', 'site_id', 'site_product_id', 'type', 'quantity', 'stock_after', 'daily_report_id', 'user_id', 'notes'])]
class StockMovement extends Model
{
    public const INITIAL = 'initial';

    public const RESTOCK = 'restock';

    public const SALE = 'sale';

    public const ADJUSTMENT = 'adjustment';

    public const CORRECTION = 'correction';

    /** Libellés affichés au responsable. */
    public const LABELS = [
        self::INITIAL => 'Stock initial',
        self::RESTOCK => 'Réassort',
        self::SALE => 'Ventes',
        self::ADJUSTMENT => 'Inventaire',
        self::CORRECTION => 'Correction de rapport',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'stock_after' => 'integer',
        ];
    }

    public function siteProduct(): BelongsTo
    {
        return $this->belongsTo(SiteProduct::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    public function dailyReport(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class);
    }
}
