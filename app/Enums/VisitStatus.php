<?php

namespace App\Enums;

enum VisitStatus: string
{
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Incomplete = 'incomplete';
    case Flagged = 'flagged';

    public function label(): string
    {
        return match ($this) {
            self::InProgress => 'En cours',
            self::Completed => 'Terminée',
            self::Incomplete => 'Incomplète',
            self::Flagged => 'Signalée',
        };
    }
}
