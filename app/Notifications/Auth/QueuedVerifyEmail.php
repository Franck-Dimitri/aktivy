<?php

namespace App\Notifications\Auth;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Confirmation d'adresse e-mail, en file d'attente (inscription, invitation, changement d'adresse) :
 * la page répond tout de suite. Gabarit défini dans AppServiceProvider (VerifyEmail::toMailUsing).
 */
class QueuedVerifyEmail extends VerifyEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 120];
}
