<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <style>
        @page { margin: 28mm 16mm 18mm 16mm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9.5pt; color: #0f172a; }
        header { position: fixed; top: -20mm; left: 0; right: 0; height: 16mm; border-bottom: 2px solid #027a48; }
        header .logo { height: 11mm; float: left; margin-right: 4mm; }
        header .company { font-size: 12pt; font-weight: bold; color: #027a48; }
        header .meta { font-size: 8pt; color: #64748b; }
        header .doc { position: absolute; right: 0; top: 1mm; text-align: right; font-size: 8pt; color: #64748b; }
        footer { position: fixed; bottom: -12mm; left: 0; right: 0; font-size: 7.5pt; color: #94a3b8; text-align: center; }
        h1 { font-size: 15pt; margin: 0 0 1mm; }
        h2 { font-size: 11pt; margin: 6mm 0 2mm; color: #027a48; }
        .muted { color: #64748b; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 8pt; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 1.6mm 1.5mm; }
        td { border-bottom: 1px solid #e2e8f0; padding: 1.6mm 1.5mm; vertical-align: top; }
        .num { text-align: right; white-space: nowrap; }
        tfoot td { font-weight: bold; border-top: 1.5px solid #0f172a; border-bottom: none; }
        .kpis td { border: none; padding: 0 2mm 0 0; width: 25%; }
        .kpi { background: #ecfdf3; border-radius: 2mm; padding: 2.5mm 3mm; }
        .kpi .label { font-size: 7.5pt; color: #027a48; }
        .kpi .value { font-size: 13pt; font-weight: bold; }
        .kpi .sub { font-size: 7.5pt; color: #64748b; }
        .box { border-radius: 2mm; padding: 3mm; margin-top: 3mm; }
        .box.incident { background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d; }
        .box.note { background: #f8fafc; border: 1px solid #e2e8f0; }
        .badge { display: inline-block; padding: 0.6mm 2mm; border-radius: 3mm; font-size: 7.5pt; font-weight: bold; }
        .badge.ok { background: #d1fadf; color: #05603a; }
        .badge.warn { background: #fef3c7; color: #92400e; }
        .photos td { border: none; width: 33%; padding: 1mm; text-align: center; }
        .photos img { width: 55mm; }
    </style>
</head>
<body>
    <header>
        @if ($logo)
            <img class="logo" src="{{ $logo }}" alt="">
        @endif
        <div class="company">{{ $company->name }}</div>
        <div class="meta">{{ $subtitle ?? '' }}</div>
        <div class="doc">{{ $title }}<br>Édité le {{ now()->format('d/m/Y à H:i') }}</div>
    </header>
    <footer>Document généré par {{ config('app.name') }} · {{ $company->name }}</footer>

    <main>
        @yield('content')
    </main>
</body>
</html>
