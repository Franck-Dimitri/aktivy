<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int      $id
 * @property int      $company_id
 * @property int      $site_id
 * @property int      $product_id
 * @property int      $current_stock
 * @property int      $alert_threshold
 * @property int      $critical_threshold
 * @property int|null $updated_by
 * @property-read Site    $site
 * @property-read Product $product
 * @property-read User    $updater
 */
#[Fillable(['company_id', 'site_id', 'product_id', 'current_stock', 'alert_threshold', 'critical_threshold', 'updated_by'])]
class SiteProduct extends Model
{
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** 'normal' | 'warning' | 'critical' */
    public function stockStatus(): string
    {
        if ($this->current_stock < $this->critical_threshold) {
            return 'critical';
        }

        if ($this->current_stock < $this->alert_threshold) {
            return 'warning';
        }

        return 'normal';
    }
}
