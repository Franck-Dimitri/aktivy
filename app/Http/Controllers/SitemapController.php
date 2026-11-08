<?php

namespace App\Http\Controllers;

use App\Support\Seo\PublicPages;
use Illuminate\Http\Response;

/**
 * Plan du site (sitemap.xml) : les pages publiques indexables, avec leur date de dernière modification.
 * Généré à la volée (aucun fichier à tenir à jour), mis en cache une heure par les navigateurs et les CDN.
 */
class SitemapController
{
    public function __invoke(): Response
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

        foreach (PublicPages::sitemap() as $entry) {
            $xml .= "    <url>\n";
            $xml .= '        <loc>'.e($entry['loc'])."</loc>\n";
            if ($entry['lastmod']) {
                $xml .= '        <lastmod>'.$entry['lastmod']."</lastmod>\n";
            }
            $xml .= '        <changefreq>'.$entry['changefreq']."</changefreq>\n";
            $xml .= '        <priority>'.$entry['priority']."</priority>\n";
            $xml .= "    </url>\n";
        }

        $xml .= "</urlset>\n";

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
