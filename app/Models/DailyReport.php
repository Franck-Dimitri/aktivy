<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $company_id
 * @property int $site_id
 * @property int $user_id
 * @property int $visit_id
 * @property \Illuminate\Support\Carbon $report_date
 * @property string $status  draft|submitted
 * @property string|null $notes
 * @property string|null $incident_notes
 * @property Carbon|null $submitted_at
 * @property-read Company $company
 * @property-read Site $site
 * @property-read User $agent
 * @property-read Visit $visit
 * @property-read \Illuminate\Database\Eloquent\Collection<int, DailyReportLine> $lines
 */
#[Fillable([
    'company_id', 'site_id', 'user_id', 'visit_id', 'event_id', 'report_date', 'status', 'notes', 'incident_notes',
    'submitted_at', 'corrected_at', 'corrected_by', 'validated_at', 'validated_by',
])]
class DailyReport extends Model
{
    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'submitted_at' => 'datetime',
            'corrected_at' => 'datetime',
            'validated_at' => 'datetime',
        ];
    }

    public function isSubmitted(): bool
    {
        return $this->status === 'submitted';
    }

    /**
     * Validé par le responsable : le rapport est figé, plus aucune correction possible.
     */
    public function isValidated(): bool
    {
        return $this->validated_at !== null;
    }

    /** Chiffre d'affaires total de la journée */
    public function totalRevenue(): float
    {
        return (float) $this->lines->sum('revenue');
    }

    /** Nombre total d'unités vendues */
    public function totalUnitsSold(): int
    {
        return (int) $this->lines->sum('units_sold');
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

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(DailyReportLine::class);
    }

    public function packs(): HasMany
    {
        return $this->hasMany(DailyReportPack::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class)->withTrashed();
    }

    public function corrector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corrected_by')->withTrashed();
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by')->withTrashed();
    }
}
