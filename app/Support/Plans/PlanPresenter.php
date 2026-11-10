<?php

namespace App\Support\Plans;

use App\Enums\Plan;
use App\Models\Company;

/**
 * Forfaits mis en forme pour les pages (administration et page Abonnement du gérant).
 */
class PlanPresenter
{
    /**
     * Les quatre forfaits, avec prix, public, limites et points forts.
     *
     * @return list<array<string, mixed>>
     */
    public static function catalog(): array
    {
        return array_map(fn (Plan $plan) => [
            'key' => $plan->value,
            'label' => $plan->label(),
            'short' => $plan->shortLabel(),
            'price' => $plan->price(),
            'audience' => $plan->audience(),
            'limits' => $plan->limits(),
            'highlights' => $plan->highlights(),
            'accepts_packs' => $plan->acceptsPacks(),
            'accepts_supervisor_packs' => $plan->acceptsSupervisorPacks(),
        ], Plan::cases());
    }

    /**
     * Forfait de l'entreprise : celui en vigueur, celui souscrit (s'il a expiré), limites et usage.
     *
     * @return array<string, mixed>
     */
    public static function state(Company $company): array
    {
        $current = $company->currentPlan();
        $subscribed = $company->plan ?? Plan::Starter;
        $endsOn = $company->plan_ends_on;

        return [
            'key' => $current->value,
            'label' => $current->label(),
            'price' => $current->price(),
            'subscribed_key' => $subscribed->value,
            'subscribed_label' => $subscribed->label(),
            'expired' => $subscribed !== Plan::Starter && $company->planExpired(),
            'trial' => $current !== Plan::Starter && (bool) $company->plan_trial,
            'ends_on' => $endsOn?->format('d/m/Y'),
            'ends_on_iso' => $endsOn?->toDateString(),
            'days_left' => $endsOn && ! $company->planExpired() ? (int) today()->diffInDays($endsOn, false) : null,
            'extra_packs' => $company->activeExtraPacks(),
            'supervisor_packs' => $company->activeSupervisorPacks(),
            'monthly_price' => $company->monthlyPrice(),
            'limits' => $company->planLimits(),
            'usage' => PlanUsage::of($company),
        ];
    }
}
