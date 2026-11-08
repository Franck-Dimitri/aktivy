<?php

namespace App\Notifications\Auth;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Lien de réinitialisation du mot de passe, en file d'attente : la page répond tout de suite.
 * Gabarit défini dans AppServiceProvider (ResetPassword::toMailUsing).
 */
class QueuedResetPassword extends ResetPassword implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 120];
}
