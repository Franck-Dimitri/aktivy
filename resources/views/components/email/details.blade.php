@props(['details' => []])
{{--
    Tableau « libellé : valeur ». Les adresses e-mail, numéros de téléphone et adresses de page
    deviennent des liens (mailto:, tel:, lien absolu) : la messagerie ne les rend pas cliquables d'elle-même.
--}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0 0; border:1px solid #e5e9e7; border-radius:12px;">
    @foreach ($details as $label => $value)
        @php
            $value = (string) $value;
            $href = match (true) {
                (bool) filter_var($value, FILTER_VALIDATE_EMAIL) => 'mailto:'.$value,
                (bool) preg_match('/^\+?[0-9][0-9 ().-]{5,}$/', $value) => 'tel:'.preg_replace('/[^0-9+]/', '', $value),
                str_starts_with($value, 'http://'), str_starts_with($value, 'https://') => $value,
                str_starts_with($value, '/') => url($value),
                default => null,
            };
        @endphp
        <tr>
            <td style="padding:10px 16px; width:110px; font-size:12px; line-height:18px; color:#64748b; vertical-align:top; {{ $loop->last ? '' : 'border-bottom:1px solid #eef1f0;' }}">{{ $label }}</td>
            <td style="padding:10px 16px 10px 0; font-size:13px; line-height:18px; color:#0f172a; word-break:break-word; {{ $loop->last ? '' : 'border-bottom:1px solid #eef1f0;' }}">
                @if ($href)
                    <a href="{{ $href }}" target="_blank" rel="noopener" style="color:#027a48; text-decoration:underline;">{{ $value }}</a>
                @else
                    {{ $value }}
                @endif
            </td>
        </tr>
    @endforeach
</table>
