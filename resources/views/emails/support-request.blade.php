{{-- Demande envoyée au support depuis le centre d'aide de l'application --}}
@extends('emails.layouts.motriks')

@section('title', $topic)
@section('preheader', \Illuminate\Support\Str::limit($body, 120))

@section('content')
    <x-email.eyebrow tone="blue">Demande de support</x-email.eyebrow>
    <x-email.heading>{{ $topic }}</x-email.heading>

    <x-email.callout>{!! nl2br(e($body)) !!}</x-email.callout>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0 0; border:1px solid #e5e9e7; border-radius:12px;">
        @foreach ($details as $label => $value)
            <tr>
                <td style="padding:10px 16px; width:110px; font-size:12px; line-height:18px; color:#64748b; vertical-align:top; {{ $loop->last ? '' : 'border-bottom:1px solid #eef1f0;' }}">{{ $label }}</td>
                <td style="padding:10px 16px 10px 0; font-size:13px; line-height:18px; color:#0f172a; word-break:break-word; {{ $loop->last ? '' : 'border-bottom:1px solid #eef1f0;' }}">{{ $value }}</td>
            </tr>
        @endforeach
    </table>
@endsection

@section('footer')
    Répondez directement à cet e-mail : la réponse partira à l’utilisateur.
@endsection
