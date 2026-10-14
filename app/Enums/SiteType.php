<?php

namespace App\Enums;

enum SiteType: string
{
    case Supermarche = 'supermarche';
    case Hypermarche = 'hypermarche';
    case Epicerie = 'epicerie';
    case Pharmacie = 'pharmacie';
    case Kiosque = 'kiosque';
    case StationService = 'station_service';
    case Boutique = 'boutique';
    case Autre = 'autre';

    public function label(): string
    {
        return match ($this) {
            self::Supermarche => 'Supermarché',
            self::Hypermarche => 'Hypermarché',
            self::Epicerie => 'Épicerie',
            self::Pharmacie => 'Pharmacie',
            self::Kiosque => 'Kiosque',
            self::StationService => 'Station-service',
            self::Boutique => 'Boutique',
            self::Autre => 'Autre',
        };
    }
}
