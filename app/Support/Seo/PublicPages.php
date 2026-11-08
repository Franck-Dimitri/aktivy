<?php

namespace App\Support\Seo;

use App\Enums\Plan;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pages publiques indexables : source unique du référencement.
 *
 * - balises de chaque page (titre, description, URL canonique, aperçus de partage, données structurées),
 *   transmises à la page dans la prop `seo` : rendues dans le HTML initial par app.blade.php (lues par
 *   les robots qui n'exécutent pas le JavaScript : WhatsApp, Facebook, LinkedIn…), puis reprises par
 *   le composant React <Seo> ;
 * - plan du site (sitemap.xml).
 *
 * Toute autre page (espace connecté, connexion, mot de passe…) est en « noindex ».
 */
final class PublicPages
{
    /** Image de partage par défaut (?v= : les réseaux sociaux gardent l'ancienne image en cache sinon). */
    public const IMAGE = '/images/og-motriks.png?v=3';

    /**
     * @var array<string, array{component: string, path: string, title: string, description: string, changefreq: string, priority: string, files: list<string>, breadcrumb?: string}>
     */
    private const PAGES = [
        'landing' => [
            'component' => 'landing',
            'path' => '/',
            'title' => 'Motriks · Pilotez hôtesses, points de vente et stocks',
            'description' => 'Suivez hôtesses, présences, ventes et stocks en temps réel, depuis le téléphone. Gestion d’équipes terrain pour le Cameroun et l’Afrique francophone.',
            'changefreq' => 'weekly',
            'priority' => '1.0',
            'files' => ['landing.tsx'],
        ],
        'register' => [
            'component' => 'auth/register',
            'path' => '/register',
            'title' => 'Créer un espace entreprise gratuit · Motriks',
            'description' => 'Créez gratuitement l’espace de votre entreprise sur Motriks et suivez vos hôtesses, vos stocks et vos ventes terrain en temps réel.',
            'changefreq' => 'monthly',
            'priority' => '0.8',
            'files' => ['auth/register.tsx'],
            'breadcrumb' => 'Créer un espace entreprise',
        ],
        'contact' => [
            'component' => 'contact',
            'path' => '/contact',
            'title' => 'Contact et démonstration · Motriks',
            'description' => 'Une question, une démonstration ou un projet pilote ? Écrivez à l’équipe Motriks, à Yaoundé : nous vous répondons sous 24 heures.',
            'changefreq' => 'monthly',
            'priority' => '0.7',
            'files' => ['contact.tsx'],
            'breadcrumb' => 'Contact',
        ],
        'conditions' => [
            'component' => 'legal/conditions',
            'path' => '/conditions',
            'title' => 'Conditions d’utilisation · Motriks',
            'description' => 'Conditions générales d’utilisation de la plateforme Motriks : compte entreprise, forfaits, données et responsabilités.',
            'changefreq' => 'yearly',
            'priority' => '0.3',
            'files' => ['legal/conditions.tsx', 'legal/legal-layout.tsx'],
            'breadcrumb' => 'Conditions d’utilisation',
        ],
        'confidentialite' => [
            'component' => 'legal/confidentialite',
            'path' => '/confidentialite',
            'title' => 'Politique de confidentialité · Motriks',
            'description' => 'Comment Motriks collecte, utilise et protège les données personnelles, dans le respect de la loi camerounaise sur la protection des données.',
            'changefreq' => 'yearly',
            'priority' => '0.3',
            'files' => ['legal/confidentialite.tsx', 'legal/legal-layout.tsx'],
            'breadcrumb' => 'Politique de confidentialité',
        ],
    ];

    /**
     * Réponse Inertia d'une page publique, avec ses balises de référencement.
     *
     * @param  array<string, mixed>  $props
     */
    public static function render(string $key, array $props = []): Response
    {
        return Inertia::render(self::PAGES[$key]['component'], [...$props, 'seo' => self::meta($key)]);
    }

    /**
     * Balises d'une page : URL et image absolues (domaine de APP_URL, jamais celui de la requête,
     * pour une seule adresse canonique).
     *
     * @return array{title: string, description: string, url: string, image: string, image_alt: string, json_ld: list<array<string, mixed>>}
     */
    public static function meta(string $key): array
    {
        $page = self::PAGES[$key];

        return [
            'title' => $page['title'],
            'description' => $page['description'],
            'url' => self::url($page['path']),
            'image' => self::url(self::IMAGE),
            'image_alt' => 'Motriks, gestion des équipes terrain',
            'json_ld' => self::jsonLd($key),
        ];
    }

    /**
     * Entrées du plan du site ; lastmod = dernière modification du fichier de la page.
     *
     * @return list<array{loc: string, lastmod: ?string, changefreq: string, priority: string}>
     */
    public static function sitemap(): array
    {
        return array_values(array_map(function (array $page) {
            $times = array_filter(array_map(
                fn (string $file) => is_file($path = resource_path('js/pages/'.$file)) ? filemtime($path) : false,
                $page['files'],
            ));

            return [
                'loc' => self::url($page['path']),
                'lastmod' => $times ? date('Y-m-d', max($times)) : null,
                'changefreq' => $page['changefreq'],
                'priority' => $page['priority'],
            ];
        }, self::PAGES));
    }

    /** @return list<string> Composants Inertia indexables. */
    public static function components(): array
    {
        return array_values(array_column(self::PAGES, 'component'));
    }

    private static function url(string $path): string
    {
        return rtrim((string) config('app.url'), '/').$path;
    }

    /**
     * Données structurées schema.org : l'organisation, le site et l'application sur l'accueil ;
     * le fil d'Ariane sur les autres pages. Rien d'inventé : ni avis ni note, prix tirés des forfaits.
     *
     * @return list<array<string, mixed>>
     */
    private static function jsonLd(string $key): array
    {
        $home = self::url('/');
        $organization = [
            '@type' => 'Organization',
            '@id' => $home.'#organization',
            'name' => 'Motriks',
            'url' => $home,
            'logo' => self::url('/icon-512.png'),
            'email' => config('motriks.support.email') ?: 'contact@motriks.com',
            'address' => [
                '@type' => 'PostalAddress',
                'addressLocality' => 'Yaoundé',
                'addressCountry' => 'CM',
            ],
            'areaServed' => ['@type' => 'Place', 'name' => 'Afrique francophone'],
        ];

        if ($key !== 'landing') {
            $page = self::PAGES[$key];

            return [
                $organization,
                [
                    '@type' => 'BreadcrumbList',
                    'itemListElement' => [
                        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Accueil', 'item' => $home],
                        ['@type' => 'ListItem', 'position' => 2, 'name' => $page['breadcrumb'] ?? $page['title'], 'item' => self::url($page['path'])],
                    ],
                ],
            ];
        }

        return [
            $organization,
            [
                '@type' => 'WebSite',
                '@id' => $home.'#website',
                'name' => 'Motriks',
                'url' => $home,
                'inLanguage' => 'fr',
                'publisher' => ['@id' => $home.'#organization'],
            ],
            [
                '@type' => 'SoftwareApplication',
                'name' => 'Motriks',
                'url' => $home,
                'applicationCategory' => 'BusinessApplication',
                // Application web (installable sur l'écran d'accueil), pas d'application native
                'operatingSystem' => 'Web',
                'inLanguage' => 'fr',
                'description' => 'Plateforme de gestion d’équipes terrain : suivi des hôtesses, présences, points de vente, stocks, ventes et rapports PDF.',
                'publisher' => ['@id' => $home.'#organization'],
                'offers' => array_map(fn (Plan $plan) => [
                    '@type' => 'Offer',
                    'name' => $plan->label(),
                    'price' => (string) $plan->price(),
                    'priceCurrency' => 'XAF',
                ], Plan::cases()),
            ],
        ];
    }
}
