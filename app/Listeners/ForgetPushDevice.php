<?php

namespace App\Listeners;

use App\Http\Controllers\Admin\ImpersonationController;
use App\Models\User;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Request;

/**
 * Déconnexion : le téléphone ne reçoit plus les notifications push de ce compte.
 *
 * Sur un téléphone partagé (hôtesses qui se relaient), la personne suivante ne doit pas voir les
 * notifications de la précédente. Le navigateur garde son abonnement : à la prochaine connexion,
 * l'application le renvoie au serveur pour le nouveau compte, sans redemander l'autorisation.
 *
 * Le serveur ne connaît pas l'appareil qui se déconnecte : l'application le lui indique par le cookie
 * « motriks_appareil » (adresse d'abonnement de ce navigateur, posé par resources/js/lib/pwa.ts).
 * Les autres appareils du compte (ordinateur, autre téléphone) continuent de recevoir les notifications.
 */
class ForgetPushDevice
{
    public const COOKIE = 'motriks_appareil';

    public function handle(Logout $event): void
    {
        if (! $event->user instanceof User || app()->bound(ImpersonationController::SWITCHING)) {
            return;
        }

        $endpoint = Request::cookie(self::COOKIE);

        if (is_string($endpoint) && $endpoint !== '') {
            $event->user->deletePushSubscription($endpoint);
        }
    }
}
