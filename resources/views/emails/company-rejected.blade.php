@extends('emails.layouts.motriks')

@section('title', 'Votre demande d’inscription')

@section('preheader', 'Votre dossier '.$company->name.' doit être complété avant validation.')

@section('content')
    <p style="margin:0 0 8px 0; font-size:13px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:#dc2626;">
        Inscription non validée
    </p>

    <h1 class="h1" style="margin:0 0 24px 0; font-size:26px; line-height:34px; font-weight:800; letter-spacing:-0.5px; color:#0f172a;">
        Votre dossier doit être corrigé
    </h1>

    <p style="margin:0 0 16px 0; font-size:15px; line-height:24px; color:#334155;">
        Bonjour{{ $name ? ' '.$name : '' }},
    </p>

    <p style="margin:0 0 16px 0; font-size:15px; line-height:24px; color:#334155;">
        Nous avons examiné la demande d'inscription de <strong style="color:#0f172a;">{{ $company->name }}</strong>
        et ne pouvons pas la valider en l'état, pour la raison suivante :
    </p>

    {{-- Motif du refus --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
        <tr>
            <td style="padding:16px 20px; background-color:#fef2f2; border:1px solid #fecaca; border-radius:12px; font-size:14px; line-height:22px; color:#7f1d1d;">
                {!! nl2br(e($reason)) !!}
            </td>
        </tr>
    </table>

    <p style="margin:0 0 16px 0; font-size:15px; line-height:24px; color:#334155;">
        Vous pouvez corriger votre dossier et le soumettre à nouveau depuis votre espace.
    </p>

    {{-- Bouton d'action --}}
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
        <tr>
            <td align="center" style="border-radius:12px; background-color:#4FC031;">
                <a href="{{ $url }}" target="_blank" rel="noopener"
                   style="display:inline-block; padding:15px 32px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:12px; font-family:'Montserrat', 'Segoe UI', Helvetica, Arial, sans-serif;">
                    Corriger mon dossier &rarr;
                </a>
            </td>
        </tr>
    </table>

    {{-- Lien de secours --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td style="padding-top:24px; border-top:1px solid #e2e8f0; font-size:12px; line-height:18px; color:#64748b;">
                Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br>
                <a href="{{ $url }}" target="_blank" rel="noopener" style="color:#2f7d1c; word-break:break-all;">{{ $url }}</a>
            </td>
        </tr>
    </table>
@endsection

@section('footer')
    Vous recevez cet email car vous avez demandé l'inscription de {{ $company->name }} sur {{ config('app.name') }}.
@endsection
