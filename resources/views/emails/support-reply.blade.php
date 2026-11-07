@extends('emails.layouts.motriks')

@section('title', 'Réponse du support')
@section('preheader', 'Le support '.config('app.name').' a répondu à votre demande.')

@section('content')
    <x-email.eyebrow>Support · demande n° {{ $number }}</x-email.eyebrow>
    <x-email.heading>{{ $topic }}</x-email.heading>

    <x-email.text>Bonjour {{ $name }},</x-email.text>
    <x-email.text>{!! nl2br(e($body)) !!}</x-email.text>

    <x-email.callout tone="slate">
        <strong>Votre message :</strong><br>
        {!! nl2br(e(\Illuminate\Support\Str::limit($original, 800))) !!}
    </x-email.callout>

    <x-email.text>Pour poursuivre l’échange, répondez simplement à cet e-mail.</x-email.text>
@endsection

@section('footer')
    Vous recevez cet e-mail en réponse à une demande envoyée au support {{ config('app.name') }}.
@endsection
