@extends('emails.layouts.aktivy')

@section('title', 'Confirmez votre adresse email')

@section('preheader', 'Un dernier clic pour activer votre compte '.config('app.name').'.')

@section('content')
    <p style="margin:0 0 8px 0; font-size:13px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:#4FC031;">
        Vérification du compte
    </p>

    <h1 class="h1" style="margin:0 0 24px 0; font-size:26px; line-height:34px; font-weight:800; letter-spacing:-0.5px; color:#0f172a;">
        Confirmez votre adresse email
    </h1>

    <p style="margin:0 0 16px 0; font-size:15px; line-height:24px; color:#334155;">
        Bonjour {{ $user->name }},
    </p>

    <p style="margin:0 0 16px 0; font-size:15px; line-height:24px; color:#334155;">
        Merci d'avoir rejoint <strong style="color:#0f172a;">{{ config('app.name') }}</strong>@if ($user->company) avec <strong style="color:#0f172a;">{{ $user->company->name }}</strong>@endif.
        Pour sécuriser votre compte et accéder à votre espace, confirmez que l'adresse
        <strong style="color:#0f172a;">{{ $user->email }}</strong> vous appartient bien.
    </p>

    {{-- Bouton d'action --}}
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
        <tr>
            <td align="center" style="border-radius:12px; background-color:#4FC031;">
                <a href="{{ $url }}" target="_blank" rel="noopener"
                   style="display:inline-block; padding:15px 32px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:12px; font-family:'Montserrat', 'Segoe UI', Helvetica, Arial, sans-serif;">
                    Confirmer mon adresse email &rarr;
                </a>
            </td>
        </tr>
    </table>

    {{-- Encadré d'information --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
        <tr>
            <td style="padding:16px 20px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; font-size:13px; line-height:20px; color:#475569;">
                &#9201;&nbsp; Ce lien est valable <strong style="color:#0f172a;">{{ $expire }} minutes</strong>.
                Passé ce délai, vous pourrez en demander un nouveau depuis votre espace.
            </td>
        </tr>
    </table>

    <p style="margin:0 0 24px 0; font-size:13px; line-height:20px; color:#64748b;">
        Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email :
        aucun compte ne sera activé.
    </p>

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
    Vous recevez cet email car un compte a été créé avec cette adresse sur {{ config('app.name') }}.
@endsection
