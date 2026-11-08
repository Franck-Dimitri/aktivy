<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Seo\PublicPages;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Référencement : plan du site, balises des pages publiques dans le HTML initial (même sans rendu
 * serveur JavaScript), « noindex » sur tout le reste.
 */
class SeoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        // Sans le serveur SSR (cas d'un serveur où il ne tourne pas) : les balises doivent venir de Blade
        config(['inertia.ssr.enabled' => false, 'app.url' => 'https://motriks.com']);
    }

    public function test_the_sitemap_lists_every_public_page()
    {
        $response = $this->get('/sitemap.xml')->assertOk();

        $this->assertStringStartsWith('application/xml', $response->headers->get('Content-Type'));
        $xml = simplexml_load_string($response->getContent());
        $this->assertNotFalse($xml);

        $locs = [];
        foreach ($xml->url as $url) {
            $locs[] = (string) $url->loc;
            $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', (string) $url->lastmod);
        }

        $this->assertSame([
            'https://motriks.com/',
            'https://motriks.com/register',
            'https://motriks.com/contact',
            'https://motriks.com/conditions',
            'https://motriks.com/confidentialite',
        ], $locs);
        $this->assertNotContains('https://motriks.com/login', $locs);
    }

    public function test_robots_txt_hides_the_private_space_and_points_to_the_sitemap()
    {
        $robots = (string) file_get_contents(public_path('robots.txt'));

        foreach (['/admin', '/dashboard', '/terrain', '/settings'] as $private) {
            $this->assertStringContainsString("Disallow: {$private}", $robots);
        }
        $this->assertStringContainsString('Sitemap: https://motriks.com/sitemap.xml', $robots);
        $this->assertStringNotContainsString('Disallow: /build', $robots);
        $this->assertFileDoesNotExist(public_path('sitemap.xml'), 'Un sitemap.xml statique masquerait la route dynamique.');
    }

    public function test_public_pages_carry_their_tags_in_the_initial_html()
    {
        foreach (['/' => 'landing', '/contact' => 'contact', '/conditions' => 'conditions', '/confidentialite' => 'confidentialite', '/register' => 'register'] as $path => $key) {
            $meta = PublicPages::meta($key);
            $html = $this->get($path)->assertOk()->getContent();

            $this->assertStringContainsString('<title data-inertia="">'.e($meta['title']).'</title>', $html, $path);
            $this->assertStringContainsString('name="description" content="'.e($meta['description']).'"', $html, $path);
            $this->assertStringContainsString('rel="canonical" href="https://motriks.com'.($path === '/' ? '/' : $path).'"', $html, $path);
            $this->assertStringContainsString('property="og:image" content="https://motriks.com/images/og-motriks.png?v=3"', $html, $path);
            $this->assertStringContainsString('application/ld+json', $html, $path);
            $this->assertStringContainsString('index, follow', $html, $path);
            $this->assertStringNotContainsString('noindex', $html, $path);
        }
    }

    public function test_the_home_page_describes_the_organisation_in_yaounde()
    {
        $html = $this->get('/')->getContent();
        preg_match('#<script data-inertia="json-ld" type="application/ld\+json">(.+?)</script>#s', $html, $match);
        $graph = json_decode($match[1] ?? '', true)['@graph'] ?? [];

        $types = array_column($graph, '@type');
        $this->assertContains('Organization', $types);
        $this->assertContains('WebSite', $types);
        $this->assertContains('SoftwareApplication', $types);
        $this->assertSame('Yaoundé', $graph[array_search('Organization', $types, true)]['address']['addressLocality']);
    }

    public function test_login_and_the_private_space_are_not_indexed()
    {
        $this->assertStringContainsString('<meta name="robots" content="noindex, nofollow">', $this->get('/login')->getContent());
        $this->assertStringContainsString('<meta name="robots" content="noindex, nofollow">', $this->get('/forgot-password')->getContent());

        $html = $this->actingAs(User::factory()->create())->get('/dashboard')->getContent();
        $this->assertStringContainsString('<meta name="robots" content="noindex, nofollow">', $html);
        $this->assertStringNotContainsString('rel="canonical"', $html);
    }
}
