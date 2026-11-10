<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\Plan;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Notifications\LiveNotification;
use App\Support\Notifications\Notify;
use App\Support\Plans\PlanPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Forfait d'une entreprise, choisi par le super administrateur : Starter, Pro, Business ou Entreprise,
 * avec une date de fin, un éventuel essai, des packs hôtesses (+5 hôtesses / +5 points de vente)
 * et des packs superviseur (+1 superviseur).
 */
class CompanyPlanController extends Controller
{
    public function edit(Company $company): Response
    {
        return Inertia::render('admin/companies/plan', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'plan' => PlanPresenter::state($company),
            'plans' => PlanPresenter::catalog(),
            'packs' => Plan::packCatalog(),
        ]);
    }

    public function update(Request $request, Company $company): RedirectResponse
    {
        $data = $request->validate([
            'plan' => ['required', Rule::enum(Plan::class)],
            'ends_on' => ['nullable', 'date', 'after_or_equal:today'],
            'trial' => ['boolean'],
            'extra_packs' => ['nullable', 'integer', 'min:0', 'max:50'],
            'supervisor_packs' => ['nullable', 'integer', 'min:0', 'max:50'],
        ], ['ends_on.after_or_equal' => 'La date de fin doit être aujourd’hui ou plus tard.']);

        $plan = Plan::from($data['plan']);
        $trial = (bool) ($data['trial'] ?? false);

        if ($trial && $plan !== Plan::Starter && empty($data['ends_on'])) {
            return back()->withErrors(['ends_on' => 'Un essai a toujours une date de fin.']);
        }

        $old = [
            'plan' => $company->plan?->value,
            'ends_on' => $company->plan_ends_on?->toDateString(),
            'trial' => (bool) $company->plan_trial,
            'extra_packs' => (int) $company->plan_extra_packs,
            'supervisor_packs' => (int) $company->plan_supervisor_packs,
        ];

        $company->setPlan(
            $plan,
            isset($data['ends_on']) ? Carbon::parse($data['ends_on']) : null,
            $trial,
            (int) ($data['extra_packs'] ?? 0),
            (int) ($data['supervisor_packs'] ?? 0),
        );

        AuditLog::record('plan.changed', $company, $old, [
            'plan' => $plan->value,
            'ends_on' => $company->plan_ends_on?->toDateString(),
            'trial' => (bool) $company->plan_trial,
            'extra_packs' => (int) $company->plan_extra_packs,
            'supervisor_packs' => (int) $company->plan_supervisor_packs,
        ]);

        self::notifyManagers($company, LiveNotification::planChanged(
            $plan->label(),
            $company->plan_ends_on?->format('d/m/Y'),
            (bool) $company->plan_trial,
            (int) $company->plan_extra_packs,
            (int) $company->plan_supervisor_packs,
        ));

        return back()->with('success', "« {$company->name} » est en {$plan->label()}.");
    }

    /** Le gérant est prévenu de tout changement de son forfait. */
    public static function notifyManagers(Company $company, $notification): void
    {
        $managers = $company->users()->where('role', Role::CompanyAdmin)->where('status', AccountStatus::Active)->get();
        if ($managers->isNotEmpty()) {
            Notify::send($managers, $notification);
        }
    }
}
