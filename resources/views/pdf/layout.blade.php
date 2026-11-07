@php
    $color = $company->documentColor();
    $font = fn (string $file) => resource_path('fonts/liberation-serif/'.$file);
    $contact = array_filter([$company->email, $company->phone, implode(', ', array_filter([$company->address, $company->city]))]);
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <style>
        /* Times New Roman, servie par Liberation Serif (mêmes dimensions de caractères) */
        @font-face { font-family: 'Times New Roman'; font-weight: normal; font-style: normal; src: url('{{ $font('LiberationSerif-Regular.ttf') }}') format('truetype'); }
        @font-face { font-family: 'Times New Roman'; font-weight: bold; font-style: normal; src: url('{{ $font('LiberationSerif-Bold.ttf') }}') format('truetype'); }
        @font-face { font-family: 'Times New Roman'; font-weight: normal; font-style: italic; src: url('{{ $font('LiberationSerif-Italic.ttf') }}') format('truetype'); }
        @font-face { font-family: 'Times New Roman'; font-weight: bold; font-style: italic; src: url('{{ $font('LiberationSerif-BoldItalic.ttf') }}') format('truetype'); }

        /* Présentation d'un document Word : marges de 2,5 cm, en-tête et pied de page dans les marges */
        @page { margin: 34mm 25mm 25mm 25mm; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.15; color: #1a1a1a; }

        header { position: fixed; top: -24mm; left: 0; right: 0; height: 18mm; border-bottom: 1.5pt solid {{ $color }}; }
        header table { width: 100%; border-collapse: collapse; }
        header td { border: none; padding: 0; vertical-align: middle; }
        header .logo-cell { width: 48mm; }
        header .logo { max-height: 13mm; max-width: 44mm; }
        header .company { font-size: 13pt; font-weight: bold; color: {{ $color }}; line-height: 1.1; }
        header .meta { font-size: 9.5pt; color: #595959; margin-top: 0.8mm; }
        header .doc { text-align: right; font-size: 9.5pt; color: #595959; line-height: 1.3; }
        header .doc strong { color: #1a1a1a; font-size: 10.5pt; }

        footer { position: fixed; bottom: -16mm; left: 0; right: 0; height: 10mm; border-top: 0.5pt solid #a6a6a6; padding-top: 1.5mm; font-size: 9pt; color: #595959; line-height: 1.25; }
        footer .by { color: #7f7f7f; }

        h1 { font-size: 18pt; font-weight: bold; margin: 0 0 4mm; color: #1a1a1a; }
        h2 { font-size: 13pt; font-weight: bold; margin: 7mm 0 2.5mm; color: {{ $color }}; page-break-after: avoid; }
        p { margin: 0 0 3mm; text-align: justify; }
        .muted { color: #595959; }
        .small { font-size: 10pt; }

        /* Tableaux quadrillés, ligne de titres aux couleurs de l'entreprise */
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.grid { font-size: 10.5pt; margin-bottom: 2mm; }
        table.grid th, table.grid td { border: 0.5pt solid #8c8c8c; padding: 1.4mm 2mm; vertical-align: top; }
        table.grid thead th { background: {{ $color }}; color: #ffffff; font-weight: bold; text-align: left; }
        table.grid tbody tr { page-break-inside: avoid; }
        table.grid tfoot td { background: #f2f2f2; font-weight: bold; }
        table.grid .num { text-align: right; white-space: nowrap; }
        table.grid th.num { white-space: normal; }
        /* Titre de section et tableau court restent sur la même page */
        .bloc { page-break-inside: avoid; }
        table.grid .detail { font-size: 9.5pt; color: #595959; }
        table.grid.compact { font-size: 10pt; }
        table.grid.compact th { font-size: 9.5pt; }

        /* Fiche d'identification du document : libellé à gauche, valeur à droite */
        table.info { font-size: 11pt; margin-bottom: 2mm; }
        table.info td { border: 0.5pt solid #8c8c8c; padding: 1.3mm 2mm; vertical-align: top; }
        table.info td.label { background: #f2f2f2; font-weight: bold; }

        .encadre { border: 0.5pt solid #8c8c8c; border-left: 3pt solid {{ $color }}; padding: 2.5mm 3.5mm; margin: 0 0 3mm; text-align: justify; }
        .encadre.alerte { border-left-color: #c00000; }
        .encadre .titre { font-weight: bold; margin-bottom: 1mm; }
        .encadre.alerte .titre { color: #c00000; }

        table.photos td { border: none; width: 33.3%; padding: 0 2mm 3mm 0; text-align: center; vertical-align: top; }
        table.photos img { width: 49mm; border: 0.5pt solid #8c8c8c; }
        table.photos .legende { font-size: 9.5pt; font-style: italic; color: #595959; margin-top: 1mm; }
    </style>
</head>
<body>
    <header>
        <table>
            <tr>
                @if ($logo)
                    <td class="logo-cell"><img class="logo" src="{{ $logo }}" alt=""></td>
                @endif
                <td>
                    <div class="company">{{ $company->name }}</div>
                    @if (! empty($subtitle))
                        <div class="meta">{{ $subtitle }}</div>
                    @endif
                </td>
                <td class="doc"><strong>{{ $title }}</strong><br>Édité le {{ now()->format('d/m/Y à H:i') }}</td>
            </tr>
        </table>
    </header>

    <footer>
        <div>{{ $company->name }}@if ($contact) · {{ implode(' · ', $contact) }}@endif</div>
        <div class="by">Document généré par {{ config('app.name') }}</div>
    </footer>

    <main>
        @yield('content')
    </main>
</body>
</html>
