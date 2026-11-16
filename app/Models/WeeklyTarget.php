<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

/**
 * Objectif hebdomadaire de chiffre d'affaires d'une hôtesse (du lundi au dimanche), facultatif.
 * Il s'applique à partir de sa semaine et reste en vigueur les semaines suivantes, jusqu'à un
 * nouvel objectif (ou un retrait, montant 0) : week_start est la semaine de départ.
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

    /**
     * Objectifs reconduits : celui d'une hôtesse pour une semaine est le dernier fixé à partir
     * de cette semaine ou d'une précédente. Une ligne à 0 marque un objectif retiré à partir de là.
     *
     * @param  iterable<int>  $userIds
     * @return Collection<int, self> par user_id, y compris les retraits (montant 0)
     */
    public static function latestFor(iterable $userIds, CarbonInterface $week): Collection
    {
        // Seulement la dernière ligne de chaque hôtesse, choisie en base (une par hôtesse et par semaine,
        // cf. l'index unique) : la page Objectifs appelle ceci une trentaine de fois, et chargeait à
        // chaque fois tout l'historique des objectifs pour n'en garder qu'une ligne
        $latest = static::query()
            ->selectRaw('user_id, MAX(week_start) as latest_week')
            ->whereIn('user_id', collect($userIds)->all())
            ->whereDate('week_start', '<=', $week->toDateString())
            ->groupBy('user_id');

        return static::query()
            ->joinSub($latest, 'latest', fn ($join) => $join
                ->on('weekly_targets.user_id', '=', 'latest.user_id')
                ->on('weekly_targets.week_start', '=', 'latest.latest_week'))
            ->select('weekly_targets.*')
            ->get()
            ->keyBy('user_id');
    }

    /**
     * Objectifs en vigueur cette semaine-là (montant > 0), par user_id.
     *
     * @param  iterable<int>  $userIds
     * @return Collection<int, self>
     */
    public static function effective(iterable $userIds, CarbonInterface $week): Collection
    {
        return self::latestFor($userIds, $week)->filter(fn (self $t) => $t->amount > 0);
    }

    /** Lundi de la semaine qui contient cette date. */
    public static function weekOf(CarbonInterface $date): CarbonImmutable
    {
        return CarbonImmutable::instance($date)->startOfWeek(CarbonInterface::MONDAY)->startOfDay();
    }
}
