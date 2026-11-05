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
 * Objectif mensuel de chiffre d'affaires : global (site_id et user_id null), par site ou par hôtesse.
 * Il s'applique à partir de son mois et reste en vigueur les mois suivants, jusqu'à un nouvel
 * objectif (ou un retrait, montant 0) : month est le premier jour du mois de départ.
 *
 * @property int $id
 * @property int $company_id
 * @property int|null $site_id
 * @property int|null $user_id
 * @property \Carbon\CarbonImmutable $month
 * @property int $amount
 */
#[Fillable(['company_id', 'site_id', 'user_id', 'month', 'amount', 'updated_by'])]
class SalesTarget extends Model
{
    use BelongsToCompany;

    protected function casts(): array
    {
        return [
            'month' => 'date',
            'amount' => 'integer',
        ];
    }

    /** Toujours « AAAA-MM-JJ » : comparaison de dates identique sous SQLite, PostgreSQL et MySQL. */
    protected function month(): Attribute
    {
        return Attribute::make(set: fn ($value) => CarbonImmutable::parse($value)->startOfMonth()->toDateString());
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** Ce sur quoi porte l'objectif : « g » (entreprise), « s12 » (site), « u34 » (hôtesse). */
    public function targetKey(): string
    {
        return self::keyFor($this->site_id, $this->user_id);
    }

    public static function keyFor(?int $siteId, ?int $userId): string
    {
        return $userId ? "u{$userId}" : ($siteId ? "s{$siteId}" : 'g');
    }

    /**
     * Dernier objectif fixé pour chaque cible à partir de ce mois ou d'un précédent, par clé
     * (cf. targetKey), y compris les retraits (montant 0).
     *
     * @return Collection<string, self>
     */
    public static function latestFor(int $companyId, CarbonInterface $month): Collection
    {
        return static::where('company_id', $companyId)
            ->whereDate('month', '<=', CarbonImmutable::instance($month)->startOfMonth()->toDateString())
            ->orderBy('month')
            ->orderBy('id')
            ->get()
            // keyBy garde la dernière ligne de chaque cible : la plus récente
            ->keyBy(fn (self $t) => $t->targetKey());
    }

    /**
     * Objectifs en vigueur ce mois-là (montant > 0), par clé.
     *
     * @return Collection<string, self>
     */
    public static function effective(int $companyId, CarbonInterface $month): Collection
    {
        return self::latestFor($companyId, $month)->filter(fn (self $t) => $t->amount > 0);
    }

    /**
     * Avancement d'un objectif du mois : réalisé, objectif et projection de fin de mois au rythme actuel.
     *
     * @return array{actual: float, target: int|null, projection: float}
     */
    public static function progress(float $actual, ?int $target, CarbonInterface $today): array
    {
        return [
            'actual' => $actual,
            'target' => $target,
            'projection' => $actual / $today->day * $today->daysInMonth,
        ];
    }

    public function hostess(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
