{{--
    Facture d'abonnement Motriks (DomPDF, A4). Données : App\Support\Billing\InvoiceDocument::data().
    Police DejaVu Sans (intégrée au moteur, accents et chiffres de même largeur), normal et gras uniquement.
    Vert Motriks en touches : titre, filet du tableau, total. Filigrane diagonal selon le statut.
--}}
@php($green = '#027a48')
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <style>
        @page { margin: 16mm 16mm 24mm 16mm; }
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9pt; line-height: 1.5; color: #1f2937; margin: 0; }
        table { width: 100%; border-collapse: collapse; }
        td, th { vertical-align: top; padding: 0; }
        .muted { color: #6b7280; }
        .label { font-size: 7pt; font-weight: bold; letter-spacing: 0.6pt; text-transform: uppercase; color: #9ca3af; }
        .num { text-align: right; white-space: nowrap; }

        /* Filigrane : derrière tout, très léger, ne gêne jamais la lecture */
        .watermark { position: fixed; top: 40%; left: -10%; width: 120%; text-align: center; z-index: -1;
            font-size: 96pt; font-weight: bold; letter-spacing: 6pt; color: {{ $status['color'] }}; opacity: 0.07; transform: rotate(-30deg); }

        /* Pied de page de chaque feuille */
        footer { position: fixed; bottom: -16mm; left: 0; right: 0; height: 10mm; border-top: 0.5pt solid #e5e7eb; padding-top: 2.5mm; font-size: 7.5pt; color: #9ca3af; }

        /* En-tête */
        .head td { vertical-align: middle; }
        .logo { max-height: 11mm; max-width: 52mm; }
        .brand { font-size: 14pt; font-weight: bold; color: #111827; }
        .title { font-size: 26pt; font-weight: bold; letter-spacing: 1pt; color: {{ $green }}; line-height: 1; }
        .badge { display: inline-block; padding: 1.2mm 3mm; border-radius: 10pt; font-size: 7.5pt; font-weight: bold;
            color: {{ $status['color'] }}; background: {{ $status['soft'] }}; }
        .meta td { padding: 0.6mm 0; font-size: 8.5pt; }
        .meta td.key { color: #6b7280; padding-right: 4mm; }

        .rule { height: 0; border-top: 0.5pt solid #e5e7eb; margin: 7mm 0; }

        /* Émetteur / client */
        .party { width: 50%; padding-right: 6mm; }
        .party .name { font-size: 10.5pt; font-weight: bold; color: #111827; margin: 1.5mm 0 1mm; }
        .client-logo { display: block; max-height: 12mm; max-width: 40mm; margin-top: 2.5mm; }

        /* Lignes */
        .lines th { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5pt; color: #6b7280;
            padding: 2.5mm 3mm; border-bottom: 1.2pt solid {{ $green }}; text-align: left; }
        .lines td { padding: 3.5mm 3mm; border-bottom: 0.5pt solid #eef0f3; }
        .lines tbody tr:nth-child(even) td { background: #fafbfc; }
        .lines .designation { font-weight: bold; color: #111827; }
        .lines .detail { font-size: 8pt; color: #6b7280; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }

        /* Totaux, toujours groupés */
        .totals-wrap { page-break-inside: avoid; margin-top: 5mm; }
        .totals { width: 78mm; margin-left: auto; }
        .totals td { padding: 2mm 3mm; font-size: 9pt; }
        .totals .grand td { background: #ecfdf3; color: {{ $green }}; font-size: 11.5pt; font-weight: bold; padding: 3.2mm 3mm; }
        .words { margin-top: 3mm; font-size: 8pt; color: #4b5563; text-align: right; }
        .words strong { color: #111827; }

        /* Bas de facture */
        .blocks { margin-top: 9mm; page-break-inside: avoid; }
        .block { width: 50%; padding-right: 6mm; }
        .block .row { margin-top: 1.2mm; font-size: 8.5pt; }
        .block .row strong { color: #111827; }
        .terms { margin-top: 7mm; padding: 3.5mm 4mm; border-left: 2pt solid {{ $green }}; background: #f9fafb; font-size: 8pt; color: #4b5563; page-break-inside: avoid; }
    </style>
</head>
<body>
    <div class="watermark">{{ $status['watermark'] }}</div>

    <footer>
        <table>
            <tr>
                <td>{{ implode(' · ', $footer) }}<br>Généré par Motriks</td>
                <td class="num"></td>
            </tr>
        </table>
    </footer>

    {{-- En-tête : logo à gauche, FACTURE et ses références à droite --}}
    <table class="head">
        <tr>
            <td style="width: 50%;">
                @if ($logo)
                    <img class="logo" src="{{ $logo }}" alt="{{ $issuer['name'] }}">
                @else
                    <div class="brand">{{ $issuer['name'] }}</div>
                @endif
            </td>
            <td style="width: 50%; text-align: right;">
                <div class="title">FACTURE</div>
                <div style="margin-top: 2.5mm;"><span class="badge">{{ $status['label'] }}</span></div>
            </td>
        </tr>
    </table>

    <table style="margin-top: 6mm;">
        <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%;">
                <table class="meta" style="width: auto; margin-left: auto;">
                    <tr><td class="key">Numéro</td><td class="num"><strong>{{ $invoice['number'] }}</strong></td></tr>
                    <tr><td class="key">Date d’émission</td><td class="num">{{ $invoice['issued_at'] }}</td></tr>
                    <tr><td class="key">Échéance</td><td class="num">{{ $invoice['issued_at'] }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    <div class="rule"></div>

    {{-- Émetteur et client --}}
    <table>
        <tr>
            <td class="party">
                <div class="label">Émetteur</div>
                <div class="name">{{ $issuer['name'] }}</div>
                @foreach ($issuer['lines'] as $line)<div class="muted">{{ $line }}</div>@endforeach
                @if ($issuer['legal'])<div class="muted" style="margin-top: 1mm;">{{ implode(' · ', $issuer['legal']) }}</div>@endif
            </td>
            <td class="party">
                <div class="label">Client</div>
                @if ($client['logo'])
                    <img class="client-logo" src="{{ $client['logo'] }}" alt="{{ $client['name'] }}">
                @endif
                <div class="name">{{ $client['name'] }}</div>
                @foreach ($client['lines'] as $line)<div class="muted">{{ $line }}</div>@endforeach
            </td>
        </tr>
    </table>

    {{-- Lignes (l'en-tête se répète sur chaque page) --}}
    <table class="lines" style="margin-top: 9mm;">
        <thead>
            <tr>
                <th style="width: 52%;">Désignation</th>
                <th class="num" style="width: 10%;">Qté</th>
                <th class="num" style="width: 19%;">Prix unitaire</th>
                <th class="num" style="width: 19%;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($lines as $line)
                <tr>
                    <td>
                        <div class="designation">{{ $line['label'] }}</div>
                        @foreach ($line['details'] as $detail)<div class="detail">{{ $detail }}</div>@endforeach
                    </td>
                    <td class="num">{{ $line['quantity'] }}</td>
                    <td class="num">{{ $line['unit_price'] }}</td>
                    <td class="num"><strong>{{ $line['total'] }}</strong></td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Totaux --}}
    <div class="totals-wrap">
        <table class="totals">
            <tr><td class="muted">Sous-total</td><td class="num">{{ $totals['subtotal'] }}</td></tr>
            <tr class="grand"><td>Total</td><td class="num">{{ $totals['total'] }}</td></tr>
        </table>
        <div class="words">Arrêtée à la somme de <strong>{{ $totals['words'] }}</strong>.</div>
    </div>

    {{-- Règlement et moyens de paiement --}}
    <table class="blocks">
        <tr>
            <td class="block">
                <div class="label">Règlement</div>
                <div class="row">Payée le <strong>{{ $invoice['paid_at'] }}</strong></div>
                <div class="row">Par <strong>{{ $invoice['method'] }}</strong>@if ($invoice['reference']) · réf. {{ $invoice['reference'] }}@endif</div>
            </td>
            <td class="block">
                @if ($methods)
                    <div class="label">Moyens de paiement</div>
                    @foreach ($methods as [$name, $value])
                        <div class="row"><strong>{{ $name }}</strong> · {{ $value }}</div>
                    @endforeach
                @endif
            </td>
        </tr>
    </table>

    @if ($terms)
        <div class="terms">{{ $terms }}</div>
    @endif
</body>
</html>
