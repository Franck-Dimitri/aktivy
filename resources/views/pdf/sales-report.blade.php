@php
    $money = fn ($v) => \App\Support\Pdf\PdfDocument::money($v, $currency);
    $int = fn ($v) => number_format($v, 0, ',', "\u{00A0}");
    $share = fn ($v) => $totals['revenue'] > 0 ? number_format($v / $totals['revenue'] * 100, 1, ',', ' ').' %' : '—';
    $variation = $previous['revenue'] > 0 ? ($totals['revenue'] - $previous['revenue']) / $previous['revenue'] * 100 : null;
    $section = 0;
@endphp
@extends('pdf.layout')

@section('content')
    <h1>Synthèse des ventes</h1>

    <table class="info">
        <tr><td class="label" style="width: 22%">Période</td><td style="width: 78%">Du {{ $report->from->format('d/m/Y') }} au {{ $report->to->format('d/m/Y') }} · {{ $totals['days_count'] }} jour{{ $totals['days_count'] > 1 ? 's' : '' }} avec des ventes</td></tr>
        @foreach ($filters as $name => $value)
            <tr><td class="label">{{ $name }}</td><td>{{ $value }}</td></tr>
        @endforeach
        <tr><td class="label">Terrain</td><td>{{ $totals['sites_count'] }} point{{ $totals['sites_count'] > 1 ? 's' : '' }} de vente · {{ $totals['hostesses_count'] }} hôtesse{{ $totals['hostesses_count'] > 1 ? 's' : '' }}</td></tr>
    </table>

    <div class="bloc">
    <h2>{{ ++$section }}. Chiffres clés</h2>
    <table class="grid">
        <thead><tr><th>Chiffre d’affaires</th><th>Évolution</th><th>Unités vendues</th><th>Rapports</th></tr></thead>
        <tbody>
            <tr>
                <td><strong>{{ $money($totals['revenue']) }}</strong></td>
                <td>
                    @if ($variation !== null)
                        {{ $variation >= 0 ? '+' : '' }}{{ number_format($variation, 1, ',', ' ') }} % par rapport à la période précédente
                    @else
                        Pas de comparaison possible
                    @endif
                </td>
                <td>{{ $int($totals['units_sold']) }}</td>
                <td>{{ $totals['reports_count'] }}</td>
            </tr>
        </tbody>
    </table>
    </div>

    @foreach ([
        'Par point de vente' => ['Point de vente', $bySite],
        'Par produit' => ['Produit', $byProduct],
        'Par hôtesse' => ['Hôtesse', $byHostess],
    ] as $heading => [$column, $rows])
        <div class="{{ $rows->count() <= 15 ? 'bloc' : '' }}">
        <h2>{{ ++$section }}. {{ $heading }}</h2>
        @if ($rows->isEmpty())
            <p class="muted">Aucune vente sur la période.</p>
        @else
            <table class="grid">
                <thead><tr><th style="width: 40%">{{ $column }}</th><th class="num" style="width: 13%">Unités</th><th class="num" style="width: 13%">Rapports</th><th class="num" style="width: 21%">Chiffre d’affaires</th><th class="num" style="width: 13%">Part</th></tr></thead>
                <tbody>
                    @foreach ($rows as $row)
                        <tr>
                            <td>{{ $row['label'] }}@if ($row['detail'])<br><span class="detail">{{ $row['detail'] }}</span>@endif</td>
                            <td class="num">{{ $int($row['units_sold']) }}</td>
                            <td class="num">{{ $row['reports_count'] }}</td>
                            <td class="num">{{ $money($row['revenue']) }}</td>
                            <td class="num">{{ $share($row['revenue']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
        </div>
    @endforeach

    @if ($byDay->isNotEmpty())
        <div class="{{ $byDay->count() <= 15 ? 'bloc' : '' }}">
        <h2>{{ ++$section }}. Jour par jour</h2>
        <table class="grid">
            <thead><tr><th style="width: 45%">Jour</th><th class="num" style="width: 15%">Unités</th><th class="num" style="width: 15%">Rapports</th><th class="num" style="width: 25%">Chiffre d’affaires</th></tr></thead>
            <tbody>
                @foreach ($byDay as $row)
                    <tr>
                        <td>{{ ucfirst(\Carbon\Carbon::parse($row['label'])->translatedFormat('l j F Y')) }}</td>
                        <td class="num">{{ $int($row['units_sold']) }}</td>
                        <td class="num">{{ $row['reports_count'] }}</td>
                        <td class="num">{{ $money($row['revenue']) }}</td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td>Total</td>
                    <td class="num">{{ $int($totals['units_sold']) }}</td>
                    <td class="num">{{ $totals['reports_count'] }}</td>
                    <td class="num">{{ $money($totals['revenue']) }}</td>
                </tr>
            </tfoot>
        </table>
        </div>
    @endif
@endsection
