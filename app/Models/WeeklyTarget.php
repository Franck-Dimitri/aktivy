<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Objectif hebdomadaire de chiffre d'affaires d'une hôtesse (du lundi au dimanche), facultatif.
 *
 * @property int $id
 * @property int $company_id
 * @property int $user_id
 * @property \Carbon\CarbonImmutable $week_start
 * @property int $amount
 * @property int|null $updated_by
 */
#[Fillable(['company_id', 'user_id', 'week_start', 'amount', 'updated_by'])]
class WeeklyTarget extends Model
{
    use BelongsToCompany;

    protected function casts(): array
    {
        return [
            'week_start' => 'immutable_date',
            'amount' => 'integer',
        ];
    }

    /**
     * Toujours enregistré « AAAA-MM-JJ » : la comparaison avec une date fonctionne alors à l'identique
     * sous SQLite, PostgreSQL et MySQL (le cast seul stockerait « AAAA-MM-JJ 00:00:00 » sous SQLite).
     */
    protected function weekStart(): Attribute
    {
        return Attribute::make(set: fn ($value) => CarbonImmutable::parse($value)->toDateString());
    }

    public function hostess(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Lundi de la semaine qui contient cette date. */
    public static function weekOf(CarbonInterface $date): CarbonImmutable
    {
        return CarbonImmutable::instance($date)->startOfWeek(CarbonInterface::MONDAY)->startOfDay();
    }
}
