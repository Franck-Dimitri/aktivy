<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;

use App\Enums\AffectationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $company_id
 * @property int $site_id
 * @property int $user_id
 * @property int $assigned_by
 * @property Carbon $starts_on
 * @property Carbon|null $ends_on
 * @property string|null $slot_start
 * @property string|null $slot_end
 * @property AffectationStatus $status
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Company $company
 * @property-read Site $site
 * @property-read User $agent
 * @property-read User $assigner
 */
#[Fillable([
    'site_id', 'user_id', 'assigned_by',
    'starts_on', 'ends_on', 'slot_start', 'slot_end',
    'status', 'notes',
])]
class Affectation extends Model
{
    /** UUID dans les adresses à la place du numéro */
    use HasPublicUuid;

    use HasFactory, SoftDeletes;

    protected $attributes = [
        'status' => 'active',
    ];

    /**
     * Créneau lu « HH:MM » : la base renvoie « HH:MM:SS » (colonne time), affiché tel quel jusqu'ici,
     * et refusé par la validation H:i quand un formulaire le renvoyait sans modification.
     */
    protected function slotStart(): Attribute
    {
        return Attribute::make(get: fn (?string $value) => $value ? substr($value, 0, 5) : null);
    }

    protected function slotEnd(): Attribute
    {
        return Attribute::make(get: fn (?string $value) => $value ? substr($value, 0, 5) : null);
    }

    protected function casts(): array
    {
        return [
            'status' => AffectationStatus::class,
            'starts_on' => 'date',
            'ends_on' => 'date',
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

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    /**
     * Affectations actives et pas encore terminées, y compris celles qui commencent plus tard.
     */
    public function scopeOngoing(Builder $query): void
    {
        $query->where('status', AffectationStatus::Active)
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', today()));
    }

    /**
     * Affectations actives qui couvrent aujourd'hui.
     */
    public function scopeCurrent(Builder $query): void
    {
        $query->ongoing()->whereDate('starts_on', '<=', today());
    }

    /**
     * Determine if the affectation covers today.
     */
    public function isCurrentlyActive(): bool
    {
        if ($this->status !== AffectationStatus::Active) {
            return false;
        }

        $today = now()->toDateString();

        return $this->starts_on->toDateString() <= $today
            && ($this->ends_on === null || $this->ends_on->toDateString() >= $today);
    }
}
