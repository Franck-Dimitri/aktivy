<?php

namespace App\Console\Commands;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\Affectation;
use App\Notifications\HostessesNotCheckedIn;
use App\Support\Notifications\Notify;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Prévient les responsables quand une hôtesse attendue aujourd'hui n'a pas pris son service :
 * 30 minutes après le début de son créneau, ou à 10 h si aucun créneau n'est fixé.
 * Chaque hôtesse n'est signalée qu'une fois par jour.
 */
class NotifyAttendanceCommand extends Command
{
    protected $signature = 'notifications:attendance';

    protected $description = 'Signale aux responsables les hôtesses qui n’ont pas pointé';

    /** Délai après le début du créneau avant de signaler l'absence. */
    private const GRACE_MINUTES = 30;

    /** Heure de référence quand l'affectation n'a pas de créneau. */
    private const DEFAULT_START = '10:00';

    public function handle(): int
    {
        $now = now();
        $today = $now->toDateString();

        $missing = Affectation::current()
            ->whereHas('agent', fn ($q) => $q->where('role', Role::FieldAgent)->where('status', AccountStatus::Active))
            ->whereDoesntHave('agent.visits', fn ($q) => $q->whereDate('checked_in_at', $today))
            ->with(['agent:id,name', 'site:id,name'])
            ->get()
            ->filter(function (Affectation $a) use ($now, $today) {
                $start = $now->copy()->setTimeFromTimeString($a->slot_start ?: self::DEFAULT_START);

                return $now->gte($start->addMinutes(self::GRACE_MINUTES))
                    && Cache::add("attendance-alert:{$a->user_id}:{$today}", true, $now->copy()->endOfDay());
            });

        // Une notification par responsable, qui regroupe toutes ses hôtesses absentes
        $byManager = [];
        foreach ($missing as $a) {
            $label = $a->agent?->name.' ('.$a->site?->name.($a->slot_start ? ', attendue à '.substr($a->slot_start, 0, 5) : '').')';

            foreach (Notify::siteManagers($a->company_id, [$a->site_id]) as $manager) {
                $byManager[$manager->id]['user'] = $manager;
                $byManager[$manager->id]['hostesses'][] = $label;
            }
        }

        foreach ($byManager as $entry) {
            Notify::send($entry['user'], new HostessesNotCheckedIn($entry['hostesses']));
        }

        $this->info(count($missing).' hôtesse(s) signalée(s) à '.count($byManager).' responsable(s).');

        return self::SUCCESS;
    }
}
