@props(['url'])
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
    <tr>
        <td style="padding-top:20px; border-top:1px solid #eef1f0; font-size:12px; line-height:18px; color:#8a94a6;">
            Le bouton ne s’ouvre pas ? Copiez ce lien dans votre navigateur :<br>
            <a href="{{ $url }}" target="_blank" rel="noopener" style="color:#027a48; word-break:break-all;">{{ $url }}</a>
        </td>
    </tr>
</table>
