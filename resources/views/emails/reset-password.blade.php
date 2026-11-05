@extends('emails.layouts.motriks')

@section('title', 'Réinitialisez votre mot de passe')
@section('preheader', 'Choisissez un nouveau mot de passe pour votre compte '.config('app.name').'.')

@section('content')
    <x-email.eyebrow tone="slate">Sécurité du compte</x-email.eyebrow>
    <x-email.heading>Réinitialisez votre mot de passe</x-email.heading>

    <x-email.text>Bonjour {{ $user->name }},</x-email.text>
    <x-email.text>Vous avez demandé à changer le mot de passe de votre compte. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</x-email.text>

    <x-email.button :href="$url">Choisir un nouveau mot de passe</x-email.button>

    <x-email.text :muted="true">Ce lien est valable {{ $expire }} minutes. Vous n’êtes pas à l’origine de cette demande ? Ignorez cet e-mail : votre mot de passe actuel reste valable.</x-email.text>

    <x-email.fallback :url="$url" />
@endsection

@section('footer')
    Envoyé à {{ $user->email }} suite à une demande de réinitialisation.
@endsection
