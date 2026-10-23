<?php

namespace App\Enums;

enum EventStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Completed = 'completed';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft     => 'Brouillon',
            self::Active    => 'En cours',
            self::Completed => 'Terminé',
            self::Archived  => 'Archivé',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Draft     => 'warning',
            self::Active    => 'success',
            self::Completed => 'info',
            self::Archived  => 'neutral',
        };
    }
}
