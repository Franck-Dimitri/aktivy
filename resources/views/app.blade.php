<!DOCTYPE html>
{{-- Application en français uniquement : « fr » en dur, sinon Chrome propose de « traduire » la page et abîme les textes --}}
<html lang="fr" style="color-scheme: light">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#027a48">

        {{-- Pages publiques indexables : celles qui reçoivent la prop « seo » (App\Support\Seo\PublicPages).
             L'espace connecté et les écrans d'authentification ne sont pas indexés. --}}
        @php($seo = $page['props']['seo'] ?? null)
        @unless ($seo)
            <meta name="robots" content="noindex, nofollow">
        @endunless

        {{-- Motriks is light-only (docs/CARTE_APP.md §4) --}}
        <style>
            html {
                background-color: #f1f5f9;
            }
        </style>

        <link rel="icon" href="/favicon.ico?v=2" sizes="any">
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
        <link rel="manifest" href="/manifest.json">
        {{-- Application installée (écran d'accueil) : plein écran, nom court, barre d'état claire sous iOS --}}
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-title" content="Motriks">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        {{-- Montserrat servie par l'application (vite.config.ts, fonts) et préchargée : pas de feuille Google Fonts
             bloquante ni de requête vers un autre domaine avant l'affichage --}}
        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        {{-- Avec le rendu serveur (SSR), Inertia écrit ici les balises de la page ; sans lui, ce contenu de secours --}}
        <x-inertia::head>
            @if ($seo)
                @include('partials.seo', ['seo' => $seo])
            @else
                <title>{{ config('app.name', 'Motriks') }}</title>
            @endif
        </x-inertia::head>

        @unless ($seo)
            {{-- Aperçu des liens partagés (WhatsApp, Facebook, LinkedIn…) : ces robots ne lancent pas le JavaScript,
                 les balises doivent être dans le HTML. Le symbole Motriks seul ; les pages publiques
                 ont les leurs (composant Seo). --}}
            <meta property="og:type" content="website">
            <meta property="og:site_name" content="Motriks">
            <meta property="og:title" content="Motriks · Pilotez vos équipes terrain">
            <meta property="og:description" content="Hôtesses, points de vente, stocks et ventes en temps réel, depuis votre téléphone.">
            <meta property="og:url" content="{{ url()->current() }}">
            <meta property="og:image" content="{{ asset('images/og-motriks.png') }}?v=3">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">
            <meta property="og:image:alt" content="Logo Motriks">
            <meta property="og:locale" content="fr_FR">
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:image" content="{{ asset('images/og-motriks.png') }}?v=3">
        @endunless
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
