@extends('emails.layouts.motriks')

@section('title', 'Votre dossier est à compléter')
@section('preheader', 'Le dossier de '.$company->name.' doit être corrigé avant validation.')

@section('content')
    <x-email.eyebrow tone="amber">Dossier à compléter</x-email.eyebrow>
    <x-email.heading>Votre dossier doit être corrigé</x-email.heading>

    <x-email.text>Bonjour{{ $name ? ' '.$name : '' }},</x-email.text>
    <x-email.text>
        Nous avons examiné la demande d’inscription de <strong style="color:#0f172a;">{{ $company->name }}</strong>. Nous ne pouvons pas la valider en l’état, pour la raison suivante :
    </x-email.text>

    <x-email.callout tone="amber">{!! nl2br(e($reason)) !!}</x-email.callout>

    <x-email.text>Corrigez votre dossier puis renvoyez-le depuis votre espace : nous l’examinerons à nouveau rapidement.</x-email.text>

    <x-email.button :href="$url">Corriger mon dossier</x-email.button>

    <x-email.fallback :url="$url" />
@endsection

@section('footer')
    Vous recevez cet e-mail suite à la demande d’inscription de {{ $company->name }}.
@endsection
