@extends('emails.layouts.motriks')

@section('title', 'Votre espace est activé')
@section('preheader', $company->name.' peut désormais utiliser '.config('app.name').'.')

@section('content')
    <x-email.eyebrow>Inscription validée</x-email.eyebrow>
    <x-email.heading>Votre espace est activé</x-email.heading>

    <x-email.text>Bonjour{{ $name ? ' '.$name : '' }},</x-email.text>
    <x-email.text>
        Le dossier de <strong style="color:#0f172a;">{{ $company->name }}</strong> est validé. Votre espace est ouvert, avec toutes ses fonctionnalités.
    </x-email.text>

    <x-email.callout tone="green">
        <strong>Pour bien démarrer :</strong> ajoutez vos points de vente, invitez votre équipe, puis affectez vos hôtesses. Elles pourront pointer et envoyer leurs rapports dès le premier jour.
    </x-email.callout>

    <x-email.button :href="$url">Accéder à mon espace</x-email.button>

    <x-email.fallback :url="$url" />
@endsection

@section('footer')
    Vous recevez cet e-mail en tant que gérant de {{ $company->name }}.
@endsection
