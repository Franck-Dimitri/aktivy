{{--
    Balises de référencement d'une page publique (App\Support\Seo\PublicPages), écrites dans le HTML initial :
    les robots qui n'exécutent pas le JavaScript (WhatsApp, Facebook, LinkedIn, certains moteurs) les lisent.
    Les attributs data-inertia reprennent les « head-key » du composant React <Seo> : une fois la page
    chargée, Inertia remplace ces balises au lieu de les dupliquer.
--}}
<title data-inertia="">{{ $seo['title'] }}</title>
<meta data-inertia="description" name="description" content="{{ $seo['description'] }}">
<meta data-inertia="robots" name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link data-inertia="canonical" rel="canonical" href="{{ $seo['url'] }}">
<link data-inertia="alternate-fr" rel="alternate" hreflang="fr" href="{{ $seo['url'] }}">
<link data-inertia="alternate-default" rel="alternate" hreflang="x-default" href="{{ $seo['url'] }}">

<meta data-inertia="og:type" property="og:type" content="website">
<meta data-inertia="og:site_name" property="og:site_name" content="Motriks">
<meta data-inertia="og:locale" property="og:locale" content="fr_FR">
<meta data-inertia="og:title" property="og:title" content="{{ $seo['title'] }}">
<meta data-inertia="og:description" property="og:description" content="{{ $seo['description'] }}">
<meta data-inertia="og:url" property="og:url" content="{{ $seo['url'] }}">
<meta data-inertia="og:image" property="og:image" content="{{ $seo['image'] }}">
<meta data-inertia="og:image:width" property="og:image:width" content="1200">
<meta data-inertia="og:image:height" property="og:image:height" content="630">
<meta data-inertia="og:image:alt" property="og:image:alt" content="{{ $seo['image_alt'] }}">

<meta data-inertia="twitter:card" name="twitter:card" content="summary_large_image">
<meta data-inertia="twitter:title" name="twitter:title" content="{{ $seo['title'] }}">
<meta data-inertia="twitter:description" name="twitter:description" content="{{ $seo['description'] }}">
<meta data-inertia="twitter:image" name="twitter:image" content="{{ $seo['image'] }}">
<meta data-inertia="twitter:image:alt" name="twitter:image:alt" content="{{ $seo['image_alt'] }}">

@if (! empty($seo['json_ld']))
    <script data-inertia="json-ld" type="application/ld+json">{!! json_encode(['@context' => 'https://schema.org', '@graph' => $seo['json_ld']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
@endif
