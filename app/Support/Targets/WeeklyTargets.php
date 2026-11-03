<?php

namespace App\Support\Targets;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\User;
use App\Models\WeeklyTarget;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Objectifs hebdomadaires : hôtesses concernées pour un responsable, et état de la semaine.
 */
class WeeklyTargets
{
    /** Seuls le gérant et les superviseurs fixent des objectifs. */
    public static function canManage(User $user): bool
    {
        return in_array($user->role, [Role::CompanyAdmin, Role::Supervisor], true);
    }

    /** Date du jour dans le fuseau de l'entreprise. */
    public static function today(User $user): CarbonImmutable
    {
        return CarbonImmutable::now($user->company?->timezone ?: config('app.timezone'));
    }

    /**
     * Hôtesses actives que ce responsable gère : affectées à l'un de ses sites (le superviseur),
     * ou à n'importe quel site (le gérant), plus celles qui ont déjà un objectif cette semaine.
     *
     * @return Builder<User>
     */
    public static function hostesses(User $manager, CarbonImmutable $weekStart): Builder
    {
        $siteIds = $manager->managedSiteIds();

        return User::query()
            ->where('company_id', $manager->company_id)
            ->where('role', Role::FieldAgent)
            ->where('status', AccountStatus::Active)
            ->visibleTo($manager)
            ->where(fn ($q) => $q
                ->whereHas('affectations', fn ($a) => $a->ongoing()->when($siteIds !== null, fn ($a) => $a->whereIn('site_id', $siteIds)))
                ->orWhereIn('id', WeeklyTarget::where('week_start', $weekStart->toDateString())->select('user_id')));
    }

    /**
     * Bandeau du tableau de bord : combien d'hôtesses ont un objectif cette semaine.
     *
     * @return array{week_start: string, hostesses: int, with_target: int}|null
     */
    public static function summary(User $manager): ?array
    {
        if (! self::canManage($manager) || ! $manager->company) {
            return null;
        }

        $weekStart = WeeklyTarget::weekOf(self::today($manager));
        $ids = self::hostesses($manager, $weekStart)->pluck('id');

        return [
            'week_start' => $weekStart->toDateString(),
            'hostesses' => $ids->count(),
            'with_target' => WeeklyTarget::where('week_start', $weekStart->toDateString())->whereIn('user_id', $ids)->count(),
        ];
    }
}
