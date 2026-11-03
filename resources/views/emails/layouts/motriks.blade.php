{{--
    Gabarit commun des e-mails Motriks : sobre, clair, lisible sur téléphone.
    Tableaux et styles en ligne pour Gmail, Outlook et Apple Mail ; aucune police ni image distante
    hormis le logo. Couleurs alignées sur l'application (vert Motriks #039855).
--}}
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>@yield('title', config('app.name'))</title>
    <style>
        body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        a { color: #027a48; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .card-pad { padding: 28px 22px !important; }
            .outer-pad { padding: 20px 12px !important; }
            .h1 { font-size: 21px !important; line-height: 29px !important; }
            .btn, .btn a { display: block !important; width: 100% !important; text-align: center !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f5; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">

    {{-- Texte d'aperçu dans la boîte de réception --}}
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f4f6f5; opacity:0;">
        @yield('preheader')
        &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f5;">
        <tr>
            <td class="outer-pad" align="center" style="padding:40px 16px;">

                <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px;">

                    {{-- Marque --}}
                    <tr>
                        <td style="padding:0 4px 20px 4px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td width="28" valign="middle" style="width:28px;">
                                        <img src="{{ asset('images/logo-email.png') }}" width="28" height="28" alt="" style="display:block; width:28px; height:28px;">
                                    </td>
                                    <td valign="middle" style="padding-left:9px; font-size:18px; font-weight:700; letter-spacing:-0.3px; color:#0f172a;">
                                        {{ config('app.name') }}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Carte --}}
                    <tr>
                        <td style="background-color:#ffffff; border:1px solid #e5e9e7; border-radius:18px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td class="card-pad" style="padding:40px 44px;">
                                        @yield('content')
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Pied de page --}}
                    <tr>
                        <td align="center" style="padding:24px 24px 0 24px; font-size:12px; line-height:19px; color:#8a94a6;">
                            @hasSection('footer')
                                @yield('footer')<br>
                            @endif
                            <span style="color:#64748b;">{{ config('app.name') }}</span> · Pilotez vos équipes terrain
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>
</body>
</html>
