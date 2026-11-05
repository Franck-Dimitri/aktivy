<?php

namespace App\Console\Commands;

use App\Support\Reminders\ReminderEngine;
use Illuminate\Console\Command;

/**
 * Rappels automatiques (hôtesses, responsables, administrateurs). Planifiée chaque minute :
 * chaque rappel n'est envoyé qu'une fois par cas, selon les réglages de chaque entreprise.
 */
class RunRemindersCommand extends Command
{
    protected $signature = 'reminders:run';

    protected $description = 'Envoie les rappels automatiques dus (prise de service, retards, rapports, stocks, demandes, événements, abonnements)';

    public function handle(ReminderEngine $engine): int
    {
        $sent = $engine->run();

        $this->info($sent ? collect($sent)->map(fn ($n, $type) => "{$type}: {$n}")->implode(', ') : 'Aucun rappel à envoyer.');

        return self::SUCCESS;
    }
}
