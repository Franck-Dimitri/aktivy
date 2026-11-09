{{-- Demande envoyée au support : centre d'aide de l'application ou formulaire « Nous contacter » --}}
@extends('emails.layouts.motriks')

@section('title', $topic)
@section('preheader', \Illuminate\Support\Str::limit($body, 120))

@section('content')
    <x-email.eyebrow tone="blue">{{ $eyebrow ?? 'Demande de support' }}</x-email.eyebrow>
    <x-email.heading>{{ $topic }}</x-email.heading>

    <x-email.callout>{!! nl2br(e($body)) !!}</x-email.callout>

    <x-email.details :details="$details" />

    @if (! empty($url))
        <x-email.button :href="$url">Ouvrir dans l’administration</x-email.button>

        <x-email.fallback :url="$url" />
    @endif
@endsection

@section('footer')
    Répondez directement à cet e-mail : la réponse partira à son auteur.
@endsection
