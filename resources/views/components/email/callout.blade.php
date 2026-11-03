@props(['tone' => 'slate'])
@php
    $tones = [
        'slate' => ['#f8fafc', '#e5e9e7', '#344054'],
        'red' => ['#fef3f2', '#fecdca', '#7a271a'],
        'amber' => ['#fffaeb', '#fedf89', '#7a2e0e'],
        'green' => ['#ecfdf3', '#abefc6', '#054f31'],
    ];
    [$bg, $border, $fg] = $tones[$tone] ?? $tones['slate'];
@endphp
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;">
    <tr>
        <td style="padding:14px 18px; background-color:{{ $bg }}; border:1px solid {{ $border }}; border-radius:12px; font-size:14px; line-height:22px; color:{{ $fg }};">
            {{ $slot }}
        </td>
    </tr>
</table>
