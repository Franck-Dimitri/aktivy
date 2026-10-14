<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int         $id
 * @property int         $company_id
 * @property string      $name
 * @property string|null $sku
 * @property string|null $description
 * @property string      $unit
 * @property float|null  $price
 * @property string|null $image
 * @property bool        $is_active
 * @property int|null    $created_by
 * @property-read Company     $company
 * @property-read HasMany<SiteProduct, $this> $siteProducts
 */
#[Fillable(['name', 'sku', 'description', 'unit', 'price', 'image', 'is_active', 'created_by'])]
class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'price'     => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function siteProducts(): HasMany
    {
        return $this->hasMany(SiteProduct::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
