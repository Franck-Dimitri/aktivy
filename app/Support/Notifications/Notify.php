<?php

namespace App\Support\Notifications;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\Affectation;
use App\Models\User;
use App\Notifications\AppNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

/**
 * Envoi des notifications aux bons destinataires : le gérant de l'entreprise et
 * les superviseurs affectés au site concerné.
 */
class Notify
{
    /**
     * Responsables d'un site : gérants de l'entreprise et superviseurs affectés au site.
     *
     * @param  array<int, int>  $siteIds
     * @return Collection<int, User>
     */
    public static function siteManagers(int $companyId, array $siteIds): Collection
    {
        return User::where('company_id', $companyId)
            ->where('status', AccountStatus::Active)
            ->where(fn ($q) => $q
                ->where('role', Role::CompanyAdmin)
                ->orWhere(fn ($q) => $q
                    ->where('role', Role::Supervisor)
                    ->whereHas('affectations', fn ($a) => $a->ongoing()->whereIn('site_id', $siteIds))))
            ->get();
    }

    /**
     * Responsables d'une hôtesse : ceux des sites où elle est affectée (le gérant à défaut).
     *
     * @return Collection<int, User>
     */
    public static function managersOf(User $hostess): Collection
    {
        $siteIds = Affectation::where('user_id', $hostess->id)->ongoing()->pluck('site_id')->all();

        return self::siteManagers($hostess->company_id, $siteIds);
    }

    /**
     * Envoie la notification une fois la transaction en cours validée (rien n'est envoyé si elle échoue).
     *
     * @param  iterable<User>|User  $users
     */
    public static function send(iterable|User $users, AppNotification $notification): void
    {
        Notification::send($users, $notification->afterCommit());
    }
}
