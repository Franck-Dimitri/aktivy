import { Head, usePage } from '@inertiajs/react';

type JsonLd = Record<string, unknown>;

/** Balises d'une page publique, préparées par le serveur (App\Support\Seo\PublicPages). */
export type SeoMeta = {
    title: string;
    description: string;
    /** URL canonique absolue. */
    url: string;
    /** Image de partage, URL absolue. */
    image: string;
    image_alt: string;
    /** Nœuds schema.org (organisation, site, application, fil d'Ariane). */
    json_ld: JsonLd[];
};

/**
 * Balises de référencement d'une page publique : titre, description, URL canonique, aperçus de partage
 * (Open Graph, Twitter) et données structurées schema.org.
 *
 * Source unique : la prop `seo` envoyée par le serveur, déjà écrite dans le HTML initial par
 * app.blade.php (partials/seo) pour les robots qui n'exécutent pas le JavaScript. Ce composant reprend
 * les mêmes balises, avec les mêmes clés : Inertia les remplace au lieu de les dupliquer.
 * `jsonLd` ajoute des nœuds propres à la page (ex. la FAQ de l'accueil).
 */
export function Seo({ jsonLd = [] }: { jsonLd?: JsonLd[] }) {
    const seo = usePage<{ seo?: SeoMeta }>().props.seo;

    if (!seo) {
        return null;
    }

    const graph = [...seo.json_ld, ...jsonLd];

    return (
        <Head title={seo.title}>
            <meta head-key="description" name="description" content={seo.description} />
            <meta head-key="robots" name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
            <link head-key="canonical" rel="canonical" href={seo.url} />
            <link head-key="alternate-fr" rel="alternate" hrefLang="fr" href={seo.url} />
            <link head-key="alternate-default" rel="alternate" hrefLang="x-default" href={seo.url} />

            <meta head-key="og:type" property="og:type" content="website" />
            <meta head-key="og:site_name" property="og:site_name" content="Motriks" />
            <meta head-key="og:locale" property="og:locale" content="fr_FR" />
            <meta head-key="og:title" property="og:title" content={seo.title} />
            <meta head-key="og:description" property="og:description" content={seo.description} />
            <meta head-key="og:url" property="og:url" content={seo.url} />
            <meta head-key="og:image" property="og:image" content={seo.image} />
            <meta head-key="og:image:width" property="og:image:width" content="1200" />
            <meta head-key="og:image:height" property="og:image:height" content="630" />
            <meta head-key="og:image:alt" property="og:image:alt" content={seo.image_alt} />

            <meta head-key="twitter:card" name="twitter:card" content="summary_large_image" />
            <meta head-key="twitter:title" name="twitter:title" content={seo.title} />
            <meta head-key="twitter:description" name="twitter:description" content={seo.description} />
            <meta head-key="twitter:image" name="twitter:image" content={seo.image} />
            <meta head-key="twitter:image:alt" name="twitter:image:alt" content={seo.image_alt} />

            {graph.length > 0 && (
                <script
                    head-key="json-ld"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c'),
                    }}
                />
            )}
        </Head>
    );
}
