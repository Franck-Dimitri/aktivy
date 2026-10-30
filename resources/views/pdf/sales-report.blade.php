@php
    $money = fn ($v) => \App\Support\Pdf\PdfDocument::money($v, $currency);
    $share = fn ($v) => $totals['revenue'] > 0 ? number_format($v / $totals['revenue'] * 100, 1, ',', ' ').' %' : '—';
    $variation = $previous['revenue'] > 0 ? ($totals['revenue'] - $previous['revenue']) / $previous['revenue'] * 100 : null;
@endphp
@extends('pdf.layout')

@section('content')
    <h1>Synthèse des ventes</h1>
    <p class="muted">
        Du {{ $report->from->format('d/m/Y') }} au {{ $report->to->format('d/m/Y') }}
        @foreach ($filters as $name => $value) · {{ $name }} : {{ $value }} @endforeach
    </p>

    <table class="kpis" style="margin-top: 4mm;">
        <tr>
            <td><div class="kpi">
                <div class="label">Chiffre d’affaires</div>
                <div class="value">{{ $money($totals['revenue']) }}</div>
                <div class="sub">
                    @if ($variation !== null)
                        {{ $variation >= 0 ? '+' : '' }}{{ number_format($variation, 1, ',', ' ') }} % vs période précédente
                    @else
                        pas de comparaison possible
                    @endif
                </div>
            </div></td>
            <td><div class="kpi"><div class="label">Unités vendues</div><div class="value">{{ number_format($totals['units_sold'], 0, ',', ' ') }}</div></div></td>
            <td><div class="kpi"><div class="label">Rapports</div><div class="value">{{ $totals['reports_count'] }}</div><div class="sub">sur {{ $totals['days_count'] }} jour(s)</div></div></td>
            <td><div class="kpi"><div class="label">Terrain</div><div class="value">{{ $totals['sites_count'] }} site(s)</div><div class="sub">{{ $totals['hostesses_count'] }} hôtesse(s)</div></div></td>
        </tr>
    </table>

    @foreach ([
        'Par point de vente' => $bySite,
        'Par produit' => $byProduct,
        'Par hôtesse' => $byHostess,
    ] as $heading => $rows)
        <h2>{{ $heading }}</h2>
        @if ($rows->isEmpty())
            <p class="muted">Aucune vente sur la période.</p>
        @else
            <table>
                <thead><tr><th></th><th class="num">Unités</th><th class="num">Rapports</th><th class="num">CA</th><th class="num">Part</th></tr></thead>
                <tbody>
                    @foreach ($rows as $row)
                        <tr>
                            <td>{{ $row['label'] }}@if ($row['detail'])<span class="muted"> · {{ $row['detail'] }}</span>@endif</td>
                            <td class="num">{{ number_format($row['units_sold'], 0, ',', ' ') }}</td>
                            <td class="num">{{ $row['reports_count'] }}</td>
                            <td class="num">{{ $money($row['revenue']) }}</td>
                            <td class="num">{{ $share($row['revenue']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endforeach

    @if ($byDay->isNotEmpty())
        <h2>Jour par jour</h2>
        <table>
            <thead><tr><th>Jour</th><th class="num">Unités</th><th class="num">Rapports</th><th class="num">CA</th></tr></thead>
            <tbody>
                @foreach ($byDay as $row)
                    <tr>
                        <td>{{ \Carbon\Carbon::parse($row['label'])->translatedFormat('D j M Y') }}</td>
                        <td class="num">{{ number_format($row['units_sold'], 0, ',', ' ') }}</td>
                        <td class="num">{{ $row['reports_count'] }}</td>
                        <td class="num">{{ $money($row['revenue']) }}</td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td>Total</td>
                    <td class="num">{{ number_format($totals['units_sold'], 0, ',', ' ') }}</td>
                    <td class="num">{{ $totals['reports_count'] }}</td>
                    <td class="num">{{ $money($totals['revenue']) }}</td>
                </tr>
            </tfoot>
        </table>
    @endif
@endsection
