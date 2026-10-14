<?php

namespace App\Models;

use App\Enums\SiteStatus;
use App\Enums\SiteType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $company_id
 * @property string $name
 * @property string|null $code
 * @property SiteType $type
 * @property string|null $address
 * @property string $city
 * @property string|null $region
 * @property float|null $latitude
 * @property float|null $longitude
 * @property string|null $contact_name
 * @property string|null $contact_phone
 * @property array<int>|null $opening_days
 * @property string|null $opening_time
 * @property string|null $closing_time
 * @property string|null $notes
 * @property SiteStatus $status
 * @property int $created_by
 * @property Carbon|null $last_visit_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Company $company
 * @property-read User $creator
 */
#[Fillable([
    'name', 'code', 'type', 'address', 'city', 'region',
    'latitude', 'longitude', 'contact_name', 'contact_phone',
    'opening_days', 'opening_time', 'closing_time', 'notes', 'status',
    'created_by',
])]
class Site extends Model
{
    use HasFactory, SoftDeletes;

    protected $attributes = [
        'type' => 'autre',
        'city' => 'Yaoundé',
        'status' => 'active',
    ];

    protected function casts(): array
    {
        return [
            'type' => SiteType::class,
            'status' => SiteStatus::class,
            'opening_days' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'last_visit_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function affectations(): HasMany
    {
        return $this->hasMany(Affectation::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function isActive(): bool
    {
        return $this->status === SiteStatus::Active;
    }

    /**
     * Determine if the site has GPS coordinates.
     */
    public function hasCoordinates(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
