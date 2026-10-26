<?php

namespace App\Models;

use App\Enums\VisitStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $company_id
 * @property int $site_id
 * @property int $user_id
 * @property int|null $affectation_id
 * @property Carbon $checked_in_at
 * @property Carbon|null $checked_out_at
 * @property float|null $checkin_latitude
 * @property float|null $checkin_longitude
 * @property float|null $checkout_latitude
 * @property float|null $checkout_longitude
 * @property int|null $duration_minutes
 * @property VisitStatus $status
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Company $company
 * @property-read Site $site
 * @property-read User $agent
 * @property-read Affectation|null $affectation
 */
#[Fillable([
    'site_id', 'user_id', 'affectation_id',
    'checked_in_at', 'checked_out_at',
    'checkin_latitude', 'checkin_longitude',
    'checkout_latitude', 'checkout_longitude',
    'duration_minutes', 'status', 'notes',
])]
class Visit extends Model
{
    use HasFactory;

    protected $attributes = [
        'status' => 'in_progress',
    ];

    protected function casts(): array
    {
        return [
            'status' => VisitStatus::class,
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'checkin_latitude' => 'float',
            'checkin_longitude' => 'float',
            'checkout_latitude' => 'float',
            'checkout_longitude' => 'float',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class)->withTrashed();
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    public function affectation(): BelongsTo
    {
        return $this->belongsTo(Affectation::class);
    }

    public function dailyReport(): HasOne
    {
        return $this->hasOne(DailyReport::class);
    }

    /**
     * Record checkout and compute duration.
     */
    public function checkout(
        CarbonInterface $at,
        ?float $latitude = null,
        ?float $longitude = null,
        ?string $notes = null,
    ): void {
        $this->checked_out_at = $at;
        $this->checkout_latitude = $latitude;
        $this->checkout_longitude = $longitude;
        $this->duration_minutes = (int) $this->checked_in_at->diffInMinutes($at);
        $this->status = VisitStatus::Completed;

        if ($notes !== null) {
            $this->notes = $notes;
        }

        $this->save();

        // Met à jour la date de dernière visite sur le site
        $this->site()->update(['last_visit_at' => $at]);
    }
}
