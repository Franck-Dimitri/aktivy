<?php

namespace App\Models;

use App\Enums\Module;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Module payant activé pour une entreprise, sur une période (sans fin si ends_on est vide).
 *
 * @property int $id
 * @property int $company_id
 * @property Module $module
 * @property Carbon $starts_on
 * @property Carbon|null $ends_on
 * @property bool $is_trial
 */
#[Fillable(['company_id', 'module', 'starts_on', 'ends_on', 'is_trial', 'activated_by', 'notes'])]
class CompanyModule extends Model
{
    protected function casts(): array
    {
        return [
            'module' => Module::class,
            'starts_on' => 'date',
            'ends_on' => 'date',
            'is_trial' => 'boolean',
        ];
    }

    /**
     * Actif aujourd'hui.
     *
     * @param  Builder<self>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $today = today()->toDateString();

        $query->whereDate('starts_on', '<=', $today)
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $today));
    }

    public function isActive(): bool
    {
        return $this->starts_on->lte(today()) && ($this->ends_on === null || $this->ends_on->gte(today()));
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
