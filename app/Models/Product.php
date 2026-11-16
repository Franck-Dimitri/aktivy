<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $company_id
 * @property string $name
 * @property string|null $sku
 * @property string|null $description
 * @property string $unit
 * @property float|null $price
 * @property string|null $image
 * @property bool $is_active
 * @property int|null $created_by
 * @property-read Company $company
 * @property-read Collection<int, SiteProduct> $siteProducts
 * @property-read int|null $sites_count Agrégat withCount (points de vente qui ont ce produit)
 * @property-read int|string|null $total_stock Agrégat withSum (stock cumulé)
 * @property-read int|null $low_count Agrégat withCount (points de vente sous le seuil d'alerte)
 */
#[Fillable(['name', 'sku', 'description', 'unit', 'price', 'image', 'is_active', 'created_by'])]
class Product extends Model
{
    /** UUID dans les adresses à la place du numéro */
    use HasPublicUuid;

    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return HasMany<SiteProduct, $this>
     */
    public function siteProducts(): HasMany
    {
        return $this->hasMany(SiteProduct::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
