<?php

namespace App\Support\Terrain;

use App\Models\DailyReport;
use App\Models\Visit;
use Carbon\CarbonInterface;

/**
 * Pour le responsable : actions de la journée faites sans réseau par l'hôtesse, avec leur heure
 * (celle du téléphone) et l'heure à laquelle le serveur les a reçues.
 */
final class OfflineTrace
{
    /**
     * @return list<array{label: string, at: string, received: string}>
     */
    public static function of(?Visit $visit, ?DailyReport $report): array
    {
        $entries = [
            ['Prise de service', $visit?->checked_in_at, $visit?->checkin_synced_at],
            ['Rapport', $report?->submitted_at, $report?->submit_synced_at],
            ['Fin de service', $visit?->checked_out_at, $visit?->checkout_synced_at],
        ];

        return collect($entries)
            ->filter(fn (array $e) => $e[1] !== null && $e[2] !== null)
            ->map(fn (array $e) => [
                'label' => $e[0],
                'at' => $e[1]->format('H:i'),
                'received' => self::received($e[1], $e[2]),
            ])
            ->values()
            ->all();
    }

    /** « 10:40 », ou « le 12/11 à 10:40 » si l'envoi s'est fait un autre jour. */
    private static function received(CarbonInterface $at, CarbonInterface $received): string
    {
        return $at->isSameDay($received) ? $received->format('H:i') : 'le '.$received->format('d/m').' à '.$received->format('H:i');
    }
}
