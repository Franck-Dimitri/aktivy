<?php

namespace App\Support\Pdf;

/**
 * Nombre entier écrit en toutes lettres, en français (orthographe traditionnelle avec traits d'union),
 * pour le « total en lettres » des factures. 125 000 → « cent vingt-cinq mille ».
 */
final class FrenchNumber
{
    private const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];

    private const TENS = [2 => 'vingt', 3 => 'trente', 4 => 'quarante', 5 => 'cinquante', 6 => 'soixante', 8 => 'quatre-vingt'];

    public static function words(int $n): string
    {
        if ($n === 0) {
            return 'zéro';
        }
        if ($n < 0) {
            return 'moins '.self::words(-$n);
        }

        $parts = [];
        foreach ([[1_000_000_000, 'milliard'], [1_000_000, 'million']] as [$size, $name]) {
            if ($n >= $size) {
                $count = intdiv($n, $size);
                $parts[] = self::belowThousand($count, true).' '.$name.($count > 1 ? 's' : '');
                $n %= $size;
            }
        }
        if ($n >= 1000) {
            $count = intdiv($n, 1000);
            $parts[] = ($count === 1 ? '' : self::belowThousand($count, true).' ').'mille';
            $n %= 1000;
        }
        if ($n > 0) {
            $parts[] = self::belowThousand($n, false);
        }

        return trim(implode(' ', $parts));
    }

    /** 1 à 999. `$multiplied` : suivi de « mille / million » (« quatre-vingt mille », « deux cent mille »). */
    private static function belowThousand(int $n, bool $multiplied): string
    {
        $hundreds = intdiv($n, 100);
        $rest = $n % 100;
        $out = [];

        if ($hundreds > 0) {
            $out[] = ($hundreds > 1 ? self::UNITS[$hundreds].' ' : '').'cent'.($hundreds > 1 && $rest === 0 && ! $multiplied ? 's' : '');
        }
        if ($rest > 0) {
            $out[] = self::belowHundred($rest, $multiplied);
        }

        return implode(' ', $out);
    }

    private static function belowHundred(int $n, bool $multiplied): string
    {
        if ($n < 20) {
            return self::UNITS[$n];
        }

        $ten = intdiv($n, 10);
        $unit = $n % 10;

        // 70-79 et 90-99 : soixante-dix…, quatre-vingt-dix…
        if ($ten === 7 || $ten === 9) {
            $base = $ten === 7 ? 'soixante' : 'quatre-vingt';
            $tail = self::UNITS[10 + $unit];

            return $base.($ten === 7 && $unit === 1 ? ' et ' : '-').$tail;
        }

        $base = self::TENS[$ten];
        if ($unit === 0) {
            // « quatre-vingts », sauf devant mille
            return $ten === 8 && ! $multiplied ? 'quatre-vingts' : $base;
        }

        return $base.($unit === 1 && $ten !== 8 ? ' et ' : '-').self::UNITS[$unit];
    }
}
