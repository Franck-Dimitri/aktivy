<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Objectif mensuel de chiffre d'affaires, global (site_id null) ou par site.
 *
 * @property int $id
 * @property int $company_id
 * @property int|null $site_id
 * @property \Carbon\CarbonImmutable $month
 * @property int $amount
 */
#[Fillable(['company_id', 'site_id', 'month', 'amount', 'updated_by'])]
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
}
