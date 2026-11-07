@php
    $money = fn ($v) => \App\Support\Pdf\PdfDocument::money($v, $currency);
    $incident = \App\Support\Incident::meaningful($report->incident_notes);
    $section = 0;

    if ($report->isValidated()) {
        $status = 'Validé le '.$report->validated_at->format('d/m/Y').($report->validator ? ' par '.$report->validator->name : '');
    } elseif ($report->isSubmitted()) {
        $status = 'Soumis, en attente de validation';
    } else {
        $status = 'Brouillon, non soumis';
    }
    if ($report->corrected_at) {
        $status .= ' · corrigé par le responsable';
    }

    if ($report->visit?->checkin_distance_m === null) {
        $pointage = 'Non vérifié (position non transmise)';
    } elseif ($report->visit->isOffSite()) {
        $pointage = 'Hors du point de vente, à '.number_format($report->visit->checkin_distance_m / 1000, 1, ',', ' ').' km';
    } else {
        $pointage = 'Sur le point de vente';
    }
@endphp
@extends('pdf.layout')

@section('content')
    <h1>Rapport journalier du {{ $report->report_date->translatedFormat('l j F Y') }}</h1>

    <table class="info">
        <tr>
            <td class="label" style="width: 20%">Hôtesse</td><td style="width: 30%">{{ $report->agent?->name ?? 'Compte supprimé' }}</td>
            <td class="label" style="width: 20%">Point de vente</td><td style="width: 30%">{{ $report->site?->name }}{{ $report->site?->city ? ', '.$report->site->city : '' }}</td>
        </tr>
        <tr>
            <td class="label">Arrivée</td><td>{{ $report->visit?->checked_in_at?->format('H:i') ?? '—' }}</td>
            <td class="label">Départ</td><td>{{ $report->visit?->checked_out_at?->format('H:i') ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Pointage</td><td>{{ $pointage }}</td>
            <td class="label">Statut</td><td>{{ $status }}</td>
        </tr>
        @if ($report->event)
            <tr><td class="label">Événement</td><td colspan="3">{{ $report->event->name }}</td></tr>
        @endif
    </table>

    <div class="bloc">
    <h2>{{ ++$section }}. Résumé de la journée</h2>
    <table class="grid">
        <thead><tr><th>Chiffre d’affaires</th><th>Unités vendues</th><th>Produits suivis</th><th>Packs vendus</th></tr></thead>
        <tbody>
            <tr>
                <td><strong>{{ $money($report->totalRevenue()) }}</strong></td>
                <td>{{ $report->totalUnitsSold() }}</td>
                <td>{{ $report->lines->count() }}</td>
                <td>{{ $report->packs->sum('quantity') ?: '—' }}</td>
            </tr>
        </tbody>
    </table>
    </div>

    <div class="{{ $report->lines->count() <= 15 ? 'bloc' : '' }}">
    <h2>{{ ++$section }}. Ventes par produit</h2>
    <table class="grid compact">
        <thead>
            <tr>
                <th style="width: 32%">Produit</th>
                <th class="num" style="width: 12%">Prix</th>
                <th class="num" style="width: 11%">Stock départ</th>
                <th class="num" style="width: 9%">Vendus</th>
                <th class="num" style="width: 9%">dont packs</th>
                <th class="num" style="width: 10%">Stock restant</th>
                <th class="num" style="width: 17%">Chiffre d’affaires</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($report->lines as $line)
                <tr>
                    <td>
                        {{ $line->product_name }}
                        @if ($line->notes)<br><span class="detail">{{ $line->notes }}</span>@endif
                        @if ($line->stock_gap)<br><span class="detail">Écart de stock {{ $line->stock_gap > 0 ? '+' : '' }}{{ $line->stock_gap }} : {{ $line->gap_reason }}</span>@endif
                    </td>
                    <td class="num">{{ $money($line->unit_price) }}</td>
                    <td class="num">{{ $line->opening_stock }}</td>
                    <td class="num"><strong>{{ $line->units_sold }}</strong></td>
                    <td class="num">{{ $line->units_sold - $line->single_units ?: '—' }}</td>
                    <td class="num">{{ $line->closing_stock }}</td>
                    <td class="num">{{ $money($line->revenue) }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3">Total</td>
                <td class="num">{{ $report->totalUnitsSold() }}</td>
                <td colspan="2"></td>
                <td class="num">{{ $money($report->totalRevenue()) }}</td>
            </tr>
        </tfoot>
    </table>
    </div>

    @if ($report->packs->isNotEmpty())
        <div class="bloc">
        <h2>{{ ++$section }}. Packs vendus</h2>
        <table class="grid">
            <thead><tr><th>Pack</th><th class="num">Prix du pack</th><th class="num">Vendus</th><th class="num">Montant</th></tr></thead>
            <tbody>
                @foreach ($report->packs as $pack)
                    <tr>
                        <td>{{ $pack->name }}</td>
                        <td class="num">{{ $money($pack->unit_value) }}</td>
                        <td class="num">{{ $pack->quantity }}</td>
                        <td class="num">{{ $money($pack->revenue) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
        </div>
    @endif

    @if ($incident || $report->notes)
        <div class="bloc">
        <h2>{{ ++$section }}. Observations</h2>
        @if ($incident)
            <div class="encadre alerte"><div class="titre">Incident signalé</div>{!! nl2br(e($report->incident_notes)) !!}</div>
        @endif
        @if ($report->notes)
            <div class="encadre"><div class="titre">Notes de l’hôtesse</div>{!! nl2br(e($report->notes)) !!}</div>
        @endif
        </div>
    @endif

    @if ($photos !== [])
        <div class="bloc">
        <h2>{{ ++$section }}. Photos du point de vente</h2>
        <table class="photos">
            @foreach (array_chunk($photos, 3) as $row)
                <tr>
                    @foreach ($row as $photo)
                        <td><img src="{{ $photo['src'] }}" alt="">@if ($photo['caption'])<div class="legende">{{ $photo['caption'] }}</div>@endif</td>
                    @endforeach
                    @for ($i = count($row); $i < 3; $i++)<td></td>@endfor
                </tr>
            @endforeach
        </table>
        </div>
    @endif
@endsection
