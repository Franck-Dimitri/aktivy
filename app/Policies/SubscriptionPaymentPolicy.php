<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\SubscriptionPayment;
use App\Models\User;

/**
 * Factures d'abonnement : le gérant voit celles de son entreprise (isolation entre entreprises),
 * l'administrateur de la plateforme les voit toutes.
 */
class SubscriptionPaymentPolicy
{
    public function view(User $user, SubscriptionPayment $payment): bool
    {
        return $user->hasRole(Role::SuperAdmin)
            || ($user->hasRole(Role::CompanyAdmin) && $user->company_id === $payment->company_id);
    }
}
