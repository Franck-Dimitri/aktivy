<?php

namespace App\Models\Concerns;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Scope a model to the company of the authenticated user, so that a client
 * company can never read or write the data of another one.
 *
 * The super administrator is not scoped and sees every company.
 */
trait BelongsToCompany
{
    /**
     * Boot the trait.
     */
    public static function bootBelongsToCompany(): void
    {
        static::addGlobalScope('company', function (Builder $builder) {
            $companyId = static::currentCompanyId();

            if ($companyId !== null) {
                $builder->where($builder->qualifyColumn('company_id'), $companyId);
            }
        });

        static::creating(function (self $model) {
            $model->company_id ??= static::currentCompanyId();
        });
    }

    /**
     * Get the company that owns the model.
     *
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the company the authenticated user is scoped to, if any.
     */
    protected static function currentCompanyId(): ?int
    {
        $user = Auth::user();

        return $user instanceof User ? $user->company_id : null;
    }
}
