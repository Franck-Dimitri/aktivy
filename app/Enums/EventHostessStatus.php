<?php

namespace App\Enums;

enum EventHostessStatus: string
{
    case Active   = 'active';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Active   => 'Active',
            self::Archived => 'Archivée',
        };
    }
}
