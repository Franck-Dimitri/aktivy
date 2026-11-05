@props(['href'])
{{-- Bouton « blindé » : un tableau, pour un rendu identique dans Outlook --}}
<table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px 0;">
    <tr>
        <td align="center" bgcolor="#039855" style="border-radius:10px; background-color:#039855;">
            <a href="{{ $href }}" target="_blank" rel="noopener"
               style="display:inline-block; padding:13px 24px; font-size:15px; line-height:20px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px; border:1px solid #027a48;">
                {{ $slot }}&nbsp;&rarr;
            </a>
        </td>
    </tr>
</table>
