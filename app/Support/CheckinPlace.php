<?php

namespace App\Support;

use App\Models\Site;
use App\Models\Visit;
use Illuminate\Support\Collection;

/**
 * Où l'hôtesse a pris son service, dit simplement au gérant et au superviseur :
 * sur place, sur un autre point de vente de l'entreprise, loin de son point de vente,
 * ou sans position partagée. Avec un lien vers la position exacte sur la carte.
 *
 * Aucun service extérieur n'est appelé : la position est comparée aux points de vente de l'entreprise.
 * Le lien Google Maps n'est ouvert que si le responsable clique dessus.
 */
final class CheckinPlace
{
    /**
     * @param  Collection<int, Site>|null  $companySites  points de vente de l'entreprise ayant des coordonnées,
     *                                                     pour reconnaître un pointage fait sur un autre point de vente
     * @return array{state: 'on_site'|'other_site'|'off_site'|'unchecked'|'unknown', label: string, short: string, distance_m: int|null, accuracy_m: int|null, other_site: string|null, map_url: string|null}
     */
    public static function describe(Visit $visit, ?Site $site, ?Collection $companySites = null): array
    {
        $lat = $visit->checkin_latitude;
        $lng = $visit->checkin_longitude;
        $distance = $visit->checkin_distance_m;
        $accuracy = $visit->checkin_accuracy_m;

        $base = ['distance_m' => $distance, 'accuracy_m' => $accuracy, 'other_site' => null, 'map_url' => null];

        // Position refusée ou GPS indisponible sur le téléphone
        if ($lat === null || $lng === null) {
            return [...$base, 'state' => 'unknown', 'label' => 'Position non partagée par le téléphone', 'short' => 'position non partagée'];
        }

        $base['map_url'] = self::mapUrl($lat, $lng);

        // Le point de vente n'a pas de coordonnées : la position est connue, mais rien à comparer
        if ($distance === null) {
            return [...$base, 'state' => 'unchecked', 'label' => 'Position enregistrée (point de vente sans coordonnées GPS)', 'short' => 'position enregistrée'];
        }

        if ($distance <= Visit::OFF_SITE_METERS) {
            return [...$base, 'state' => 'on_site', 'label' => 'Sur place, à '.self::meters($distance).' du point de vente', 'short' => 'sur place'];
        }

        // Hors de son point de vente : peut-être sur un autre point de vente de l'entreprise
        $other = ($companySites ?? collect())
            ->filter(fn (Site $s) => $s->id !== $site?->id && $s->hasCoordinates())
            ->map(fn (Site $s) => ['site' => $s, 'distance' => $s->distanceTo($lat, $lng)])
            ->filter(fn (array $c) => $c['distance'] !== null && $c['distance'] <= Visit::OFF_SITE_METERS)
            ->sortBy('distance')
            ->first();

        if ($other) {
            $name = $other['site']->name;

            return [
                ...$base,
                'state' => 'other_site',
                'other_site' => $name,
                'label' => "Au point de vente « {$name} », à ".self::meters($distance).' du sien',
                'short' => "au point de vente « {$name} »",
            ];
        }

        return [...$base, 'state' => 'off_site', 'label' => 'À '.self::meters($distance).' de son point de vente', 'short' => 'à '.self::meters($distance).' de son point de vente'];
    }

    /** Points de vente géolocalisés de l'entreprise, chargés une fois pour toute une liste. */
    public static function companySites(int $companyId): Collection
    {
        return Site::where('company_id', $companyId)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get(['id', 'name', 'latitude', 'longitude']);
    }

    /** « 45 m », « 2,3 km » */
    public static function meters(int $meters): string
    {
        return $meters >= 1000
            ? str_replace('.', ',', (string) round($meters / 1000, 1)).' km'
            : $meters.' m';
    }

    /** Lien universel : ouvre l'application Google Maps sur téléphone, le site sur ordinateur. */
    public static function mapUrl(float $latitude, float $longitude): string
    {
        return 'https://www.google.com/maps/search/?api=1&query='.round($latitude, 6).','.round($longitude, 6);
    }
}
