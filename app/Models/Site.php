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
 * @property array<string>|null $photos
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
    'opening_days', 'opening_time', 'closing_time', 'notes', 'photos', 'status',
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
            'photos' => 'array',
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

    public function siteProducts(): HasMany
    {
        return $this->hasMany(SiteProduct::class);
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

    /**
     * Distance en mètres entre le site et une position (formule de haversine),
     * ou null si le site n'a pas de coordonnées.
     */
    public function distanceTo(float $latitude, float $longitude): ?int
    {
        if (! $this->hasCoordinates()) {
            return null;
        }

        $earthRadius = 6371000;
        $dLat = deg2rad($latitude - (float) $this->latitude);
        $dLng = deg2rad($longitude - (float) $this->longitude);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad((float) $this->latitude)) * cos(deg2rad($latitude)) * sin($dLng / 2) ** 2;

        return (int) round($earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a)));
    }
}
