<?php

namespace App\Support;

use Illuminate\Support\Str;

class Incident
{
    /** Réponses qui veulent dire « rien à signaler ». */
    private const NOTHING = [
        'aucun', 'aucune', 'rien', 'neant', 'non', 'no', 'none', 'nil', 'nul', 'na', 'n a', 'nan',
        'ras', 'r a s', 'rien a signaler', 'rien de special', 'rien de particulier', 'rien du tout',
        'aucun incident', 'aucun probleme', 'aucune anomalie', 'pas d incident', 'pas de probleme',
        'pas de souci', 'tout va bien', 'tout est bon', 'ok', 'r a s ',
    ];

    /**
     * Retourne le texte de l'incident, ou null s'il est vide
     * ou s'il dit juste « aucun », « rien », « RAS », etc.
     */
    public static function meaningful(?string $text): ?string
    {
        $text = trim((string) $text);

        if ($text === '') {
            return null;
        }

        // minuscules, sans accents ni ponctuation : « Rien à signaler ! » => « rien a signaler »
        $normalized = trim(preg_replace('/[^a-z0-9]+/', ' ', Str::lower(Str::ascii($text))));

        if ($normalized === '' || in_array($normalized, self::NOTHING, true)) {
            return null;
        }

        return $text;
    }
}