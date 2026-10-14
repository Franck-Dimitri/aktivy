<?php

namespace App\Enums;

enum AffectationStatus: string
{
    case Active = 'active';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Completed => 'Terminée',
            self::Cancelled => 'Annulée',
        };
    }
}
