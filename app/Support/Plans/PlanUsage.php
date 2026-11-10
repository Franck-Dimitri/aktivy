<?php

namespace App\Support\Plans;

use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Company;

/**
 * Ce que l'entreprise utilise de son forfait, et le message à afficher quand une limite est atteinte.
 * Au back-office, seuls les superviseurs sont comptés : le gérant est toujours inclus, les comptables sont libres.
 */
class PlanUsage
{
    /** Libellés des limites : pluriel, singulier, et « de » ou « d’ » devant le singulier. */
    private const NOUNS = [
        'hostesses' => ['hôtesses', 'hôtesse', 'd’'],
        'sites' => ['points de vente', 'point de vente', 'de '],
        'supervisors' => ['superviseurs', 'superviseur', 'de '],
        'events_per_month' => ['événements par mois', 'événement par mois', 'd’'],
    ];

    /**
     * Utilisation actuelle des limites qui se comptent.
     *
     * @return array{hostesses: int, sites: int, supervisors: int, events_per_month: int}
     */
    public static function of(Company $company): array
    {
        return [
            'hostesses' => $company->users()->where('role', Role::FieldAgent)->count(),
            'sites' => $company->sites()->count(),
            'supervisors' => $company->users()->where('role', Role::Supervisor)->count(),
            'events_per_month' => $company->events()->where('created_at', '>=', now()->startOfMonth())->count(),
        ];
    }

    /** Clé de limite concernée par la création d'un compte de ce rôle (aucune pour le gérant et le comptable). */
    public static function keyForRole(Role $role): ?string
    {
        return match ($role) {
            Role::FieldAgent => 'hostesses',
            Role::Supervisor => 'supervisors',
            default => null,
        };
    }

    /**
     * Message d'erreur si ajouter $adding éléments dépasse la limite du forfait, sinon null.
     */
    public static function exceeded(Company $company, string $key, int $adding = 1): ?string
    {
        $limit = $company->planLimits()[$key] ?? null;
        if ($limit === null) {
            return null;
        }

        $used = self::of($company)[$key];
        if ($used + $adding <= $limit) {
            return null;
        }

        return self::message($company, $key, $limit);
    }

    public static function message(Company $company, string $key, int $limit): string
    {
        $plan = $company->currentPlan();
        [$plural, $singular, $of] = self::NOUNS[$key] ?? [$key, $key, 'de '];
        $noun = $limit > 1 ? $plural : $singular;
        $next = $plan->next();
        $nextLabel = $next?->label() ?? 'un forfait supérieur';

        $text = $limit === 0
            ? "Votre forfait {$plan->label()} ne comprend pas {$of}{$singular}."
            : "Votre forfait {$plan->label()} permet {$limit} {$noun}, vous ".($limit > 1 ? 'les avez atteints.' : 'l’avez atteint.');

        if (in_array($key, ['hostesses', 'sites'], true) && $plan->acceptsPacks()) {
            return $text.' Ajoutez un pack de '.Plan::PACK_HOSTESSES.' hôtesses et '.Plan::PACK_SITES." points de vente, ou passez à {$nextLabel} : contactez-nous.";
        }

        if ($key === 'supervisors' && $plan->acceptsSupervisorPacks()) {
            return $text." Ajoutez un pack superviseur, ou passez à {$nextLabel} : contactez-nous.";
        }

        return $text.($next ? " Passez à {$next->label()} pour aller plus loin : contactez-nous." : ' Contactez-nous pour l’augmenter.');
    }
}
