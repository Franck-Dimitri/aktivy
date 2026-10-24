<?php

namespace App\Exports;

use App\Support\Excel\Workbook;
use Carbon\CarbonImmutable;
use App\Support\Reports\SalesReport;

/**
 * Export comptable des ventes : synthèse, journal détaillé et ventilations (jour, site, produit, hôtesse).
 */
class SalesExport
{
    public function __construct(private SalesReport $report) {}

    public function write(string $path, array $filterLabels = []): void
    {
        $report = $this->report;
        $currency = $report->company->currency ?: 'XAF';
        $totals = $report->totals();
        $previous = $report->previous();
        $previousRevenue = $previous->totals()['revenue'];
        $variation = $previousRevenue > 0
            ? sprintf('%+.1f %%', ($totals['revenue'] - $previousRevenue) / $previousRevenue * 100)
            : 'n.d.';
        $book = new Workbook($path);

        $book->sheet('Synthèse', [
            'Indicateur' => [Workbook::TEXT, 34],
            'Valeur' => [Workbook::TEXT, 40],
        ], [
            ['Entreprise', $report->company->name],
            ['Période', $report->from->format('d/m/Y').' au '.$report->to->format('d/m/Y')],
            ...array_map(fn ($label, $value) => [$label, $value], array_keys($filterLabels), $filterLabels),
            ['Devise', $currency],
            ["Chiffre d'affaires", number_format($totals['revenue'], 0, ',', ' ').' '.$currency],
            ['Période précédente', $previous->from->format('d/m/Y').' au '.$previous->to->format('d/m/Y')],
            ["Chiffre d'affaires période précédente", number_format($previousRevenue, 0, ',', ' ').' '.$currency],
            ['Variation', $variation],
            ['Unités vendues', number_format($totals['units_sold'], 0, ',', ' ')],
            ['Rapports journaliers', $totals['reports_count']],
            ['Jours d’activité', $totals['days_count']],
            ['Sites actifs', $totals['sites_count']],
            ['Hôtesses actives', $totals['hostesses_count']],
            ['Généré le', now($report->company->timezone ?: config('app.timezone'))->format('d/m/Y H:i')],
            ['Source', 'Rapports journaliers envoyés par les hôtesses (Motriks)'],
        ]);

        $book->sheet('Journal des ventes', [
            'Date' => [Workbook::DATE, 12],
            'Site' => [Workbook::TEXT, 24],
            'Code site' => [Workbook::TEXT, 11],
            'Ville' => [Workbook::TEXT, 14],
            'Hôtesse' => [Workbook::TEXT, 22],
            'Téléphone' => [Workbook::TEXT, 16],
            'Événement' => [Workbook::TEXT, 20],
            'Produit' => [Workbook::TEXT, 24],
            'Unité' => [Workbook::TEXT, 9],
            "Prix unitaire ($currency)" => [Workbook::MONEY, 15],
            'Stock ouverture' => [Workbook::INT, 12],
            'Quantité vendue' => [Workbook::INT, 12],
            'Stock clôture' => [Workbook::INT, 12],
            "Chiffre d'affaires ($currency)" => [Workbook::MONEY, 17],
            'N° rapport' => [Workbook::INT, 10],
            'Envoyé le' => [Workbook::DATETIME, 16],
            'Remarque' => [Workbook::TEXT, 30],
        ], $report->lines()->map(fn ($l) => [
            $l->report_date, $l->site_name, $l->site_code, $l->site_city,
            $l->hostess_name, $l->hostess_phone, $l->event_name,
            $l->product_name, $l->unit, $l->unit_price,
            $l->opening_stock, $l->units_sold, $l->closing_stock, $l->revenue,
            $l->report_id, $l->submitted_at, $l->notes,
        ]));

        $summary = fn (string $label, ?string $detail = null) => [
            $label => [$label === 'Date' ? Workbook::DATE : Workbook::TEXT, 26],
            ...($detail ? [$detail => [Workbook::TEXT, 18]] : []),
            "Chiffre d'affaires ($currency)" => [Workbook::MONEY, 18],
            'Unités vendues' => [Workbook::INT, 14],
            'Rapports' => [Workbook::INT, 10],
        ];
        $rows = fn ($items, bool $withDetail = true) => $items->map(fn ($r) => $withDetail
            ? [$r['label'], $r['detail'], $r['revenue'], $r['units_sold'], $r['reports_count']]
            : [$r['label'], $r['revenue'], $r['units_sold'], $r['reports_count']]);

        $book->sheet('Par mois', [
            'Mois' => [Workbook::TEXT, 16],
            "Chiffre d'affaires ($currency)" => [Workbook::MONEY, 18],
            'Unités vendues' => [Workbook::INT, 14],
            'Rapports' => [Workbook::INT, 10],
            'Variation vs mois précédent' => [Workbook::PERCENT, 22],
        ], array_map(fn ($m) => [
            ucfirst(CarbonImmutable::parse($m['date'])->locale('fr')->isoFormat('MMMM YYYY')),
            $m['revenue'], $m['units_sold'], $m['reports_count'],
            $m['variation'],
        ], $report->monthly()));

        $book->sheet('Par jour', $summary('Date'), $rows($report->byDay(), false));
        $book->sheet('Par site', $summary('Site', 'Ville'), $rows($report->bySite()));
        $book->sheet('Par produit', $summary('Produit', 'Unité'), $rows($report->byProduct()));
        $book->sheet('Par hôtesse', $summary('Hôtesse', 'Téléphone'), $rows($report->byHostess()));

        $book->close();
    }
}
