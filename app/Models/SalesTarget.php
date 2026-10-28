<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Objectif mensuel de chiffre d'affaires : global (site_id et user_id null), par site ou par hôtesse.
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

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
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
