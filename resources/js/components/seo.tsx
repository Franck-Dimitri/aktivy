import { Head, usePage } from '@inertiajs/react';

type JsonLd = Record<string, unknown>;

type SeoProps = {
    title: string;
    description: string;
    /** Chemin canonique de la page, ex. '/contact'. */
    path: string;
    image?: string;
    jsonLd?: JsonLd | JsonLd[];
};

const DEFAULT_IMAGE = '/images/og-motriks.png';

/**
 * Balises de référencement d'une page publique : titre, description, URL canonique,
 * aperçus de partage (Open Graph, Twitter) et données structurées schema.org.
 * Rendues côté serveur (SSR), elles sont lues telles quelles par les moteurs et les réseaux sociaux.
 */
export function Seo({ title, description, path, image = DEFAULT_IMAGE, jsonLd }: SeoProps) {
    const { appUrl, name } = usePage<{ appUrl: string; name: string }>().props;
    const url = `${appUrl}${path}`;
    const imageUrl = image.startsWith('http') ? image : `${appUrl}${image}`;

    return (
        <Head title={title}>
            <meta head-key="description" name="description" content={description} />
            <meta head-key="robots" name="robots" content="index, follow, max-image-preview:large" />
            <link head-key="canonical" rel="canonical" href={url} />

            <meta head-key="og:type" property="og:type" content="website" />
            <meta head-key="og:site_name" property="og:site_name" content={name} />
            <meta head-key="og:locale" property="og:locale" content="fr_FR" />
            <meta head-key="og:title" property="og:title" content={title} />
            <meta head-key="og:description" property="og:description" content={description} />
            <meta head-key="og:url" property="og:url" content={url} />
            <meta head-key="og:image" property="og:image" content={imageUrl} />
            <meta head-key="og:image:width" property="og:image:width" content="1200" />
            <meta head-key="og:image:height" property="og:image:height" content="630" />
            <meta head-key="og:image:alt" property="og:image:alt" content={title} />

            <meta head-key="twitter:card" name="twitter:card" content="summary_large_image" />
            <meta head-key="twitter:title" name="twitter:title" content={title} />
            <meta head-key="twitter:description" name="twitter:description" content={description} />
            <meta head-key="twitter:image" name="twitter:image" content={imageUrl} />

            {jsonLd && (
                <script
                    head-key="json-ld"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
                />
            )}
        </Head>
    );
}
