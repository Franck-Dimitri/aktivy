<?php

namespace App\Support\Excel;

use DateTimeInterface;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Cell\StringCell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\AutoFilter;
use OpenSpout\Writer\XLSX\Entity\SheetView;
use OpenSpout\Writer\XLSX\Options;
use OpenSpout\Writer\XLSX\Writer;

/**
 * Classeur Excel (.xlsx) écrit au fil de l'eau : un onglet par tableau,
 * en-tête figé et filtrable, montants et dates typés pour être recalculables dans Excel.
 */
class Workbook
{
    /** Types de colonnes : chaque valeur est écrite avec le format correspondant. */
    public const TEXT = 'text';

    public const INT = 'int';

    public const MONEY = 'money';

    public const DATE = 'date';

    public const DATETIME = 'datetime';

    public const PERCENT = 'percent';

    private Writer $writer;

    private bool $firstSheet = true;

    private Style $header;

    /** @var array<string, Style> */
    private array $styles;

    public function __construct(string $path, string $headerColor = '#3B6D11')
    {
        $this->writer = new Writer(new Options);
        $this->writer->openToFile($path);

        $this->header = (new Style)
            ->setFontBold()
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor(ltrim($headerColor, '#'));

        $this->styles = [
            self::INT => (new Style)->setFormat('#,##0'),
            self::MONEY => (new Style)->setFormat('#,##0'),
            self::DATE => (new Style)->setFormat('dd/mm/yyyy'),
            self::DATETIME => (new Style)->setFormat('dd/mm/yyyy hh:mm'),
            self::PERCENT => (new Style)->setFormat('+0.0%;-0.0%;0.0%'),
        ];
    }

    /**
     * Ajoute un onglet.
     *
     * @param  array<string, array{0: string, 1?: int|float}>  $columns  intitulé => [type, largeur]
     * @param  iterable<array<int, mixed>>  $rows  valeurs dans l'ordre des colonnes
     * @param  array<int, mixed>  $intro  lignes affichées avant le tableau (une valeur ou une liste de valeurs)
     */
    public function sheet(string $name, array $columns, iterable $rows, array $intro = []): void
    {
        if ($this->firstSheet) {
            $sheet = $this->writer->getCurrentSheet();
            $this->firstSheet = false;
        } else {
            $sheet = $this->writer->addNewSheetAndMakeItCurrent();
        }

        // Excel limite le nom d'un onglet à 31 caractères, sans : \ / ? * [ ]
        $sheet->setName(mb_substr(str_replace([':', '\\', '/', '?', '*', '[', ']'], ' ', $name), 0, 31));

        // Lignes d'introduction éventuelles (titre, période…), avant le tableau
        foreach ($intro as $line) {
            $this->writer->addRow(new Row(array_map(
                fn (mixed $value) => is_string($value) ? new StringCell($value, null) : Cell::fromValue($value),
                array_values((array) $line),
            )));
        }

        $headerRow = count($intro) + 1;
        $types = [];
        $index = 1;

        foreach ($columns as $title => $spec) {
            $types[] = $spec[0];
            $sheet->setColumnWidth($spec[1] ?? 18, $index++);
        }

        $this->writer->addRow(Row::fromValues(array_keys($columns), $this->header));

        $count = 0;

        foreach ($rows as $values) {
            $cells = [];

            foreach (array_values($values) as $i => $value) {
                $cells[] = $this->cell($value, $types[$i] ?? self::TEXT);
            }

            $this->writer->addRow(new Row($cells));
            $count++;
        }

        $sheet->setSheetView((new SheetView)->setFreezeRow($headerRow + 1));
        $sheet->setAutoFilter(new AutoFilter(0, $headerRow, max(count($columns) - 1, 0), $headerRow + max($count, 1)));
    }

    public function close(): void
    {
        $this->writer->close();
    }

    private function cell(mixed $value, string $type): Cell
    {
        if ($value === null || $value === '') {
            return Cell::fromValue(null);
        }

        return match ($type) {
            self::INT => Cell::fromValue((int) $value, $this->styles[self::INT]),
            self::MONEY => Cell::fromValue((float) $value, $this->styles[self::MONEY]),
            // valeur en points de pourcentage (12.5 = +12,5 %), stockée en fraction pour Excel
            self::PERCENT => Cell::fromValue((float) $value / 100, $this->styles[self::PERCENT]),
            self::DATE, self::DATETIME => Cell::fromValue(
                $value instanceof DateTimeInterface ? $value : new \DateTimeImmutable((string) $value),
                $this->styles[$type],
            ),
            // Toujours du texte : avec Cell::fromValue, un texte commençant par « = » devenait une vraie formule
            // dans le fichier. Une hôtesse pouvait glisser =HYPERLINK(…) dans une remarque, et des données
            // partaient du classeur quand le gérant l'ouvrait et cliquait.
            default => new StringCell(is_scalar($value) ? (string) $value : (string) json_encode($value, JSON_UNESCAPED_UNICODE), null),
        };
    }
}
