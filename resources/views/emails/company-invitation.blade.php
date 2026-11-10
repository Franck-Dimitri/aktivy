@extends('emails.layouts.motriks')

@section('title', 'Votre espace est prêt')
@section('preheader', 'Choisissez votre mot de passe pour ouvrir l’espace '.$company->name.' sur '.config('app.name').'.')

@section('content')
    <x-email.eyebrow>Invitation</x-email.eyebrow>
    <x-email.heading>Votre espace {{ $company->name }} est prêt</x-email.heading>

    <x-email.text>Bonjour{{ $name ? ' '.$name : '' }},</x-email.text>
    <x-email.text>
        L’équipe {{ config('app.name') }} a créé l’espace de <strong style="color:#0f172a;">{{ $company->name }}</strong>, dont vous êtes le gérant.
        Il ne vous reste qu’à choisir votre mot de passe pour y accéder.
    </x-email.text>

    <x-email.callout tone="green">
        <strong>Ensuite :</strong> ajoutez vos points de vente et vos produits, invitez votre équipe, puis affectez vos hôtesses.
        Vous profitez de {{ \App\Models\Company::TRIAL_DAYS }} jours d’essai avec toutes les fonctionnalités.
    </x-email.callout>

    <x-email.button :href="$url">Choisir mon mot de passe</x-email.button>

    <x-email.text>Ce lien est valable {{ $days }} jours et ne sert qu’une fois.</x-email.text>

    <x-email.fallback :url="$url" />
@endsection

@section('footer')
    Vous recevez cet e-mail parce que vous avez été inscrit comme gérant de {{ $company->name }}. Si ce n’est pas le cas, ignorez-le.
@endsection
