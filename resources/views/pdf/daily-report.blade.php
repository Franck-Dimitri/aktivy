@php($money = fn ($v) => \App\Support\Pdf\PdfDocument::money($v, $currency))
@extends('pdf.layout')

@section('content')
    <h1>Rapport du {{ $report->report_date->translatedFormat('l j F Y') }}</h1>
    <p class="muted">
        {{ $report->agent?->name ?? 'Hôtesse' }} · {{ $report->site?->name }}{{ $report->site?->city ? ', '.$report->site->city : '' }}
        @if ($report->event) · Événement « {{ $report->event->name }} » @endif
        <br>
        @if ($report->isValidated())
            <span class="badge ok">Validé le {{ $report->validated_at->format('d/m/Y') }}{{ $report->validator ? ' par '.$report->validator->name : '' }}</span>
        @elseif ($report->isSubmitted())
            <span class="badge warn">Soumis, en attente de validation</span>
        @else
            <span class="badge warn">Brouillon</span>
        @endif
        @if ($report->corrected_at)
            <span class="badge warn">Corrigé par le responsable</span>
        @endif
    </p>

    <table class="kpis" style="margin-top: 4mm;">
        <tr>
            <td><div class="kpi"><div class="label">Chiffre d’affaires</div><div class="value">{{ $money($report->totalRevenue()) }}</div></div></td>
            <td><div class="kpi"><div class="label">Unités vendues</div><div class="value">{{ $report->totalUnitsSold() }}</div></div></td>
            <td><div class="kpi"><div class="label">Arrivée / départ</div><div class="value">{{ $report->visit?->checked_in_at?->format('H:i') ?? '—' }} – {{ $report->visit?->checked_out_at?->format('H:i') ?? '—' }}</div></div></td>
            <td><div class="kpi"><div class="label">Pointage</div><div class="value" style="font-size: 10pt;">
                @if ($report->visit?->checkin_distance_m === null) Non vérifié
                @elseif ($report->visit->isOffSite()) À {{ number_format($report->visit->checkin_distance_m / 1000, 1, ',', ' ') }} km
                @else Sur le site
                @endif
            </div></div></td>
        </tr>
    </table>

    <h2>Ventes par produit</h2>
    <table>
        <thead>
            <tr>
                <th>Produit</th>
                <th class="num">Prix</th>
                <th class="num">Stock arrivée</th>
                <th class="num">Vendus</th>
                <th class="num">dont packs</th>
                <th class="num">Stock restant</th>
                <th class="num">CA</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($report->lines as $line)
                <tr>
                    <td>{{ $line->product_name }}@if ($line->notes)<br><span class="muted">{{ $line->notes }}</span>@endif</td>
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

    @if ($report->packs->isNotEmpty())
        <h2>Packs vendus</h2>
        <table>
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
    @endif

    @if ($report->incident_notes)
        <div class="box incident"><strong>Incident signalé</strong><br>{!! nl2br(e($report->incident_notes)) !!}</div>
    @endif
    @if ($report->notes)
        <div class="box note"><strong>Notes de l’hôtesse</strong><br>{!! nl2br(e($report->notes)) !!}</div>
    @endif

    @if ($photos !== [])
        <h2>Photos</h2>
        <table class="photos">
            @foreach (array_chunk($photos, 3) as $row)
                <tr>
                    @foreach ($row as $photo)
                        <td><img src="{{ $photo['src'] }}" alt=""><br><span class="muted">{{ $photo['caption'] }}</span></td>
                    @endforeach
                </tr>
            @endforeach
        </table>
    @endif
@endsection
