@props(['items' => []])
{{-- Liste sobre : une ligne par élément, séparées par un filet --}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0; border:1px solid #e5e9e7; border-radius:12px;">
    @foreach ($items as $item)
        <tr>
            <td style="padding:12px 16px; font-size:14px; line-height:20px; color:#0f172a; {{ $loop->last ? '' : 'border-bottom:1px solid #eef1f0;' }}">
                <span style="display:inline-block; width:6px; height:6px; margin:0 10px 2px 0; border-radius:3px; background-color:#039855; vertical-align:middle;"></span>{{ $item }}
            </td>
        </tr>
    @endforeach
</table>
