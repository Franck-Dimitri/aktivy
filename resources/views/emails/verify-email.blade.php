@extends('emails.layouts.motriks')

@section('title', 'Confirmez votre adresse e-mail')
@section('preheader', 'Un clic pour activer votre compte '.config('app.name').'.')

@section('content')
    <x-email.eyebrow>Bienvenue sur {{ config('app.name') }}</x-email.eyebrow>
    <x-email.heading>Confirmez votre adresse e-mail</x-email.heading>

    <x-email.text>Bonjour {{ $user->name }},</x-email.text>
    <x-email.text>
        Merci d’avoir créé votre compte{{ $user->company ? ' pour '.$user->company->name : '' }}.
        Confirmez que <strong style="color:#0f172a;">{{ $user->email }}</strong> est bien votre adresse pour accéder à votre espace.
    </x-email.text>

    <x-email.button :href="$url">Confirmer mon adresse</x-email.button>

    <x-email.text :muted="true">Ce lien est valable {{ $expire }} minutes. Vous n’avez rien demandé ? Ignorez cet e-mail : aucun compte ne sera activé.</x-email.text>

    <x-email.fallback :url="$url" />
@endsection

@section('footer')
    Envoyé à {{ $user->email }} suite à la création d’un compte.
@endsection
