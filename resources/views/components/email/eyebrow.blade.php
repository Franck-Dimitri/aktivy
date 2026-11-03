@props(['tone' => 'green'])
@php
    $tones = [
        'green' => ['#ecfdf3', '#027a48'],
        'amber' => ['#fffaeb', '#b54708'],
        'red' => ['#fef3f2', '#b42318'],
        'blue' => ['#eff8ff', '#175cd3'],
        'violet' => ['#f4f3ff', '#5925dc'],
        'teal' => ['#f0fdf9', '#107569'],
        'slate' => ['#f2f4f7', '#475467'],
    ];
    [$bg, $fg] = $tones[$tone] ?? $tones['green'];
@endphp
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
    <tr>
        <td style="background-color:{{ $bg }}; border-radius:999px; padding:5px 11px; font-size:12px; line-height:16px; font-weight:600; color:{{ $fg }};">
            {{ $slot }}
        </td>
    </tr>
</table>
