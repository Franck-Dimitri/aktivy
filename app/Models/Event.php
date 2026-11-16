<?php

namespace App\Models;

use App\Enums\EventStatus;
use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $company_id
 * @property string $name
 * @property string|null $description
 * @property Carbon $start_date
 * @property Carbon $end_date
 * @property string|null $location
 * @property string $city
 * @property EventStatus $status
 * @property int $created_by
 * @property Carbon|null $activated_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable([
    'name', 'description', 'start_date', 'end_date',
    'location', 'city', 'status', 'created_by',
    'activated_at', 'completed_at',
])]
class Event extends Model
{
    /** UUID dans les adresses à la place du numéro */
    use HasPublicUuid;

    use SoftDeletes;

    protected $attributes = [
        'status' => 'draft',
        'city' => 'Yaoundé',
    ];

    protected function casts(): array
    {
        return [
            'status' => EventStatus::class,
            'start_date' => 'date',
            'end_date' => 'date',
            'activated_at' => 'datetime',
            'completed_at' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<EventSite, $this>
     */
    public function sites(): HasMany
    {
        return $this->hasMany(EventSite::class);
    }

    /**
     * @return HasMany<EventPack, $this>
     */
    public function packs(): HasMany
    {
        return $this->hasMany(EventPack::class);
    }

    /**
     * @return HasMany<EventHostess, $this>
     */
    public function hostesses(): HasMany
    {
        return $this->hasMany(EventHostess::class);
    }

    /**
     * @return HasMany<Affectation, $this>
     */
    public function affectations(): HasMany
    {
        return $this->hasMany(Affectation::class);
    }

    /**
     * @return HasMany<DailyReport, $this>
     */
    public function reports(): HasMany
    {
        return $this->hasMany(DailyReport::class);
    }

    public function isDraft(): bool
    {
        return $this->status === EventStatus::Draft;
    }

    public function isActive(): bool
    {
        return $this->status === EventStatus::Active;
    }

    public function isFinished(): bool
    {
        return in_array($this->status, [EventStatus::Completed, EventStatus::Archived]);
    }
}
