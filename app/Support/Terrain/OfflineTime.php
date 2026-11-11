<?php

namespace App\Support\Terrain;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Heure d'une action faite sans réseau (pointage, fin de service, envoi du rapport) : celle du
 * téléphone, envoyée avec l'action au retour du réseau. Elle est bornée pour rester crédible :
 * ni dans le futur (au-delà d'un petit décalage d'horloge), ni plus vieille que la limite donnée.
 */
final class OfflineTime
{
    /** Décalage toléré entre l'horloge du téléphone et celle du serveur. */
    public const CLOCK_SKEW_MINUTES = 5;

    /** Au-delà, une action hors ligne n'est plus acceptée. */
    public const MAX_AGE_HOURS = 48;

    /**
     * @param  string|null  $value  heure envoyée par le téléphone (ISO 8601), null pour une action en direct
     * @param  CarbonInterface|null  $notBefore  heure plancher (ex. la prise de service, pour la fin de service)
     * @return array{0: Carbon, 1: bool} l'heure retenue, et si l'action a été faite hors ligne
     */
    public static function resolve(?string $value, string $field, ?CarbonInterface $notBefore = null): array
    {
        if ($value === null || $value === '') {
            return [now(), false];
        }

        $at = Carbon::parse($value)->setTimezone(config('app.timezone'));

        if ($at->greaterThan(now()->addMinutes(self::CLOCK_SKEW_MINUTES))) {
            throw ValidationException::withMessages([
                $field => 'L’heure du téléphone est en avance : vérifiez la date et l’heure du téléphone.',
            ]);
        }

        $floor = CarbonImmutable::instance(now()->subHours(self::MAX_AGE_HOURS));
        if ($notBefore !== null && $notBefore->greaterThan($floor)) {
            $floor = CarbonImmutable::instance($notBefore);
        }

        if ($at->lessThan($floor)) {
            throw ValidationException::withMessages([
                $field => $notBefore !== null && $at->lessThan($notBefore)
                    ? 'Cette heure est antérieure à la prise de service.'
                    : 'Cette action date de plus de '.self::MAX_AGE_HOURS.' h : elle ne peut plus être envoyée.',
            ]);
        }

        return [$at, true];
    }
}
