<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>@yield('title', config('app.name'))</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');

        body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
        a { color: #2f7d1c; }

        @media only screen and (max-width: 620px) {
            .container { width: 100% !important; }
            .px { padding-left: 24px !important; padding-right: 24px !important; }
            .h1 { font-size: 22px !important; }
            .btn a { display: block !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Montserrat', 'Segoe UI', Helvetica, Arial, sans-serif; color:#0f172a;">

    {{-- Texte d'aperçu affiché dans la boîte de réception --}}
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f1f5f9; opacity:0;">
        @yield('preheader')
        &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
        <tr>
            <td align="center" style="padding:40px 16px;">

                <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

                    {{-- En-tête : logo --}}
                    <tr>
                        <td style="padding:0 0 24px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td width="36" height="36" align="center" valign="middle" style="width:36px; height:36px; background-color:#0f172a; border-radius:10px; color:#ffffff; font-size:18px; font-weight:700; font-family:'Montserrat', 'Segoe UI', Helvetica, Arial, sans-serif;">A</td>
                                    <td style="padding-left:10px; font-size:24px; font-weight:800; letter-spacing:-0.5px; color:#0f172a; font-family:'Montserrat', 'Segoe UI', Helvetica, Arial, sans-serif;">
                                        {{ config('app.name') }}<span style="color:#4FC031;">.</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Carte principale --}}
                    <tr>
                        <td style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td height="4" style="height:4px; line-height:4px; font-size:4px; background-color:#4FC031; border-radius:16px 16px 0 0;">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td class="px" style="padding:40px 48px;">
                                        @yield('content')
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Pied de page --}}
                    <tr>
                        <td class="px" align="center" style="padding:28px 48px 0 48px; font-size:12px; line-height:20px; color:#64748b;">
                            @hasSection('footer')
                                @yield('footer')
                                <br><br>
                            @endif
                            <strong style="color:#0f172a;">{{ config('app.name') }}</strong> — La nouvelle façon de piloter vos équipes sur le terrain.<br>
                            &copy; {{ date('Y') }} {{ config('app.name') }}. Tous droits réservés.
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>
</body>
</html>
