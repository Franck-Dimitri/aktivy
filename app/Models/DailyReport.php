<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
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
 * @property Carbon $report_date
 * @property string $status draft|submitted
 * @property string|null $notes
 * @property string|null $incident_notes
 * @property int|null $event_id
 * @property Carbon|null $submitted_at
 * @property Carbon|null $submit_synced_at Rapport envoyé hors ligne : heure de réception par le serveur
 * @property Carbon|null $corrected_at
 * @property int|null $corrected_by
 * @property Carbon|null $validated_at
 * @property int|null $validated_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Company $company
 * @property-read Site $site
 * @property-read User $agent
 * @property-read Visit $visit
 * @property-read Event|null $event
 * @property-read User|null $corrector
 * @property-read User|null $validator
 * @property-read Collection<int, DailyReportLine> $lines
 * @property-read float|string|null $lines_sum_revenue Agrégat withSum, présent seulement quand la requête le demande
 * @property-read int|string|null $lines_sum_units_sold Agrégat withSum
 * @property-read float|string|null $external_revenue Agrégat withSum (ventes en boutique extérieure)
 * @property-read bool|int|null $has_gap Agrégat withExists (écart de stock sur une ligne)
 */
#[Fillable([
    'company_id', 'site_id', 'user_id', 'visit_id', 'event_id', 'report_date', 'status', 'notes', 'incident_notes',
    'submitted_at', 'submit_synced_at', 'corrected_at', 'corrected_by', 'validated_at', 'validated_by',
])]
class DailyReport extends Model
{
    /** UUID dans les adresses à la place du numéro */
    use HasPublicUuid;

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'submitted_at' => 'datetime',
            'submit_synced_at' => 'datetime',
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

    /** Chiffre d'affaires total de la journée, ventes en boutique extérieure comprises */
    public function totalRevenue(): float
    {
        return (float) $this->lines->sum('revenue') + $this->externalRevenue();
    }

    /** Nombre total d'unités vendues, ventes en boutique extérieure comprises */
    public function totalUnitsSold(): int
    {
        return (int) $this->lines->sum('units_sold') + $this->externalUnitsSold();
    }

    /** Ventes en boutique extérieure : relation chargée si elle l'est, sinon une seule requête. */
    public function externalRevenue(): float
    {
        return (float) ($this->relationLoaded('externalLines') ? $this->externalLines->sum('revenue') : $this->externalLines()->sum('revenue'));
    }

    public function externalUnitsSold(): int
    {
        return (int) ($this->relationLoaded('externalLines') ? $this->externalLines->sum('units_sold') : $this->externalLines()->sum('units_sold'));
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<Site, $this>
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class)->withTrashed();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    /**
     * @return BelongsTo<Visit, $this>
     */
    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    /**
     * Lignes du stock du point de vente (les ventes en boutique extérieure sont à part).
     *
     * @return HasMany<DailyReportLine, $this>
     */
    public function lines(): HasMany
    {
        return $this->hasMany(DailyReportLine::class)->whereNull('external_shop');
    }

    /**
     * Ventes en boutique extérieure : mêmes produits, mêmes prix, sans effet sur le stock du site.
     *
     * @return HasMany<DailyReportLine, $this>
     */
    public function externalLines(): HasMany
    {
        return $this->hasMany(DailyReportLine::class)->whereNotNull('external_shop');
    }

    /**
     * Toutes les lignes : pour les totaux (chiffre d'affaires, unités).
     *
     * @return HasMany<DailyReportLine, $this>
     */
    public function allLines(): HasMany
    {
        return $this->hasMany(DailyReportLine::class);
    }

    /**
     * @return HasMany<DailyReportPack, $this>
     */
    public function packs(): HasMany
    {
        return $this->hasMany(DailyReportPack::class);
    }

    /**
     * @return HasMany<DailyReportPhoto, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(DailyReportPhoto::class);
    }

    /**
     * @return BelongsTo<Event, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class)->withTrashed();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function corrector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corrected_by')->withTrashed();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by')->withTrashed();
    }
}
