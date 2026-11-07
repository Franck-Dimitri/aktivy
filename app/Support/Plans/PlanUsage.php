<?php

namespace App\Support\Plans;

use App\Enums\Role;
use App\Models\Company;

/**
 * Ce que l'entreprise utilise de son forfait, et le message à afficher quand une limite est atteinte.
 */
class PlanUsage
{
    /** Rôles qui comptent comme utilisateurs du back-office. */
    public const BACKOFFICE_ROLES = [Role::CompanyAdmin, Role::Supervisor, Role::Accountant];

    /** Libellés des limites, au pluriel puis au singulier. */
    private const NOUNS = [
        'hostesses' => ['hôtesses', 'hôtesse'],
        'sites' => ['points de vente', 'point de vente'],
        'backoffice' => ['utilisateurs du back-office', 'utilisateur du back-office'],
        'events_per_month' => ['événements par mois', 'événement par mois'],
    ];

    /**
     * Utilisation actuelle des limites qui se comptent.
     *
     * @return array{hostesses: int, sites: int, backoffice: int, events_per_month: int}
     */
    public static function of(Company $company): array
    {
        return [
            'hostesses' => $company->users()->where('role', Role::FieldAgent)->count(),
            'sites' => $company->sites()->count(),
            'backoffice' => $company->users()->whereIn('role', self::BACKOFFICE_ROLES)->count(),
            'events_per_month' => $company->events()->where('created_at', '>=', now()->startOfMonth())->count(),
        ];
    }

    /** Clé de limite concernée par la création d'un compte de ce rôle. */
    public static function keyForRole(Role $role): ?string
    {
        return match (true) {
            $role === Role::FieldAgent => 'hostesses',
            in_array($role, self::BACKOFFICE_ROLES, true) => 'backoffice',
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
        [$plural, $singular] = self::NOUNS[$key] ?? [$key, $key];
        $noun = $limit > 1 ? $plural : $singular;
        $next = $plan->next();

        $text = $limit === 0
            ? "Votre forfait {$plan->label()} ne comprend pas d’{$singular}."
            : "Votre forfait {$plan->label()} permet {$limit} {$noun}, vous les avez atteints.";

        if (in_array($key, ['hostesses', 'sites'], true) && $plan->acceptsPacks()) {
            return $text.' Ajoutez un pack de 5 hôtesses et 5 points de vente, ou passez à '.($next?->label() ?? 'un forfait supérieur').' : contactez-nous.';
        }

        return $text.($next ? " Passez à {$next->label()} pour aller plus loin : contactez-nous." : ' Contactez-nous pour l’augmenter.');
    }
}
