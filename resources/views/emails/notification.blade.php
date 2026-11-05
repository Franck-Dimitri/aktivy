{{-- E-mail des alertes de l'application (incident, stock, absences, demandes, inscriptions…) --}}
@extends('emails.layouts.motriks')

@section('title', $title)
@section('preheader', $preheader)

@section('content')
    <x-email.eyebrow :tone="$tone">{{ $eyebrow }}</x-email.eyebrow>
    <x-email.heading>{{ $title }}</x-email.heading>

    @if ($name)
        <x-email.text>Bonjour {{ $name }},</x-email.text>
    @endif

    <x-email.text>{{ $intro }}</x-email.text>

    @if ($items)
        <x-email.items :items="$items" />
    @endif

    @if ($quote)
        <x-email.callout :tone="$tone === 'red' ? 'red' : 'slate'">« {{ $quote }} »</x-email.callout>
    @endif

    <x-email.button :href="$url">{{ $action }}</x-email.button>

    <x-email.fallback :url="$url" />
@endsection

@section('footer')
    {{ $reason }} Ces alertes s’affichent aussi sous la cloche de votre espace.
@endsection
