<?php

namespace App\Support\Import;

use OpenSpout\Reader\CSV\Options as CsvOptions;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

/**
 * Lit la première feuille d'un fichier Excel (.xlsx) ou CSV en lignes « intitulé normalisé => valeur ».
 * La première ligne non vide donne les intitulés ; les lignes vides sont ignorées.
 */
class Spreadsheet
{
    /**
     * @return array<int, array<string, string>> lignes indexées par leur numéro dans le fichier
     */
    public static function rows(string $path, string $extension): array
    {
        $reader = strtolower($extension) === 'xlsx' ? new XlsxReader : new CsvReader(self::csvOptions($path));
        $reader->open($path);

        $headers = null;
        $rows = [];

        foreach ($reader->getSheetIterator() as $sheet) {
            $number = 0;

            foreach ($sheet->getRowIterator() as $row) {
                $number++;
                $values = array_map(fn ($v) => trim(self::text($v)), $row->toArray());

                if (implode('', $values) === '') {
                    continue;
                }

                if ($headers === null) {
                    $headers = array_map([self::class, 'normalize'], $values);

                    continue;
                }

                $rows[$number] = array_combine($headers, array_pad(array_slice($values, 0, count($headers)), count($headers), ''));
            }

            break; // première feuille seulement
        }

        $reader->close();

        return $rows;
    }

    /** « Téléphone contact » → « telephone contact » : minuscules, sans accents ni ponctuation. */
    public static function normalize(string $header): string
    {
        $ascii = strtolower(\Illuminate\Support\Str::ascii($header));

        return trim(preg_replace('/[^a-z0-9]+/', ' ', $ascii));
    }

    private static function text(mixed $value): string
    {
        return match (true) {
            $value instanceof \DateTimeInterface => $value->format('Y-m-d'),
            is_float($value) && floor($value) === $value => (string) (int) $value,
            default => (string) $value,
        };
    }

    /** Excel en français enregistre les CSV avec « ; » : on prend le séparateur le plus présent. */
    private static function csvOptions(string $path): CsvOptions
    {
        $options = new CsvOptions;
        $first = (string) fgets(fopen($path, 'r'));
        $options->FIELD_DELIMITER = substr_count($first, ';') > substr_count($first, ',') ? ';' : ',';

        return $options;
    }
}
