@php
    $money = fn ($v) => \App\Support\Pdf\PdfDocument::money($v, $payment->currency);
    $period = $payment->period_end
        ? 'Du '.($payment->period_start ?? $payment->paid_at)->format('d/m/Y').' au '.$payment->period_end->format('d/m/Y')
        : null;
@endphp
@extends('pdf.layout')

@section('content')
    <h1>Facture {{ $payment->invoice_number }}</h1>

    <table class="info">
        <tr>
            <td class="label" style="width: 20%">Émise par</td>
            <td style="width: 30%">
                <strong>{{ $billing['name'] }}</strong>
                @if ($billing['address'])<br>{{ $billing['address'] }}@endif
                @if ($billing['city'])<br>{{ $billing['city'] }}@endif
                @if ($billing['niu'])<br>NIU : {{ $billing['niu'] }}@endif
                @if ($billing['rccm'])<br>RCCM : {{ $billing['rccm'] }}@endif
            </td>
            <td class="label" style="width: 20%">Facturée à</td>
            <td style="width: 30%">
                <strong>{{ $client->name }}</strong>
                @if ($client->address)<br>{{ $client->address }}@endif
                @if ($client->city)<br>{{ $client->city }}@endif
                @if ($client->email)<br>{{ $client->email }}@endif
            </td>
        </tr>
        <tr>
            <td class="label">Date</td><td>{{ $payment->paid_at->format('d/m/Y') }}</td>
            <td class="label">Statut</td><td>Payée</td>
        </tr>
    </table>

    <h2>1. Détail</h2>
    <table class="grid">
        <thead>
            <tr>
                <th style="width: 70%">Désignation</th>
                <th class="num" style="width: 30%">Montant</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    {{ $payment->plan ? 'Forfait '.$payment->plan->label() : 'Abonnement à la plateforme '.config('app.name') }}
                    @if ($period)<br><span class="detail">{{ $period }}</span>@endif
                    @if ($payment->extra_packs > 0)
                        <br><span class="detail">{{ $payment->extra_packs }} pack{{ $payment->extra_packs > 1 ? 's' : '' }} d’extension (+{{ $pack['hostesses'] }} hôtesses et +{{ $pack['sites'] }} points de vente chacun)</span>
                    @endif
                    @if ($payment->notes)<br><span class="detail">{{ $payment->notes }}</span>@endif
                </td>
                <td class="num">{{ $money($payment->amount) }}</td>
            </tr>
        </tbody>
        <tfoot>
            <tr>
                <td>Total payé</td>
                <td class="num">{{ $money($payment->amount) }}</td>
            </tr>
        </tfoot>
    </table>

    <h2>2. Règlement</h2>
    <table class="info">
        <tr>
            <td class="label" style="width: 20%">Moyen</td><td style="width: 30%">{{ $payment->methodLabel() }}</td>
            <td class="label" style="width: 20%">Référence</td><td style="width: 30%">{{ $payment->reference ?: '—' }}</td>
        </tr>
        <tr>
            <td class="label">Reçu le</td><td colspan="3">{{ $payment->paid_at->translatedFormat('j F Y') }}</td>
        </tr>
    </table>

    <p class="muted small" style="margin-top: 6mm;">
        Facture acquittée. Merci de votre confiance.
        Pour toute question sur cette facture, écrivez à {{ $billing['email'] ?: 'notre support' }} en rappelant le numéro {{ $payment->invoice_number }}.
    </p>
@endsection
