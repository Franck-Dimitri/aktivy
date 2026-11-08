<?php

namespace Tests\Feature;

use App\Jobs\RecordPageView;
use App\Models\PageView;
use App\Models\User;
use App\Support\Traffic\UserAgent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Audience du site public : collecte sans cookie (TrackPageView → RecordPageView en file d'attente)
 * et volet « Trafic du site » du journal d'audit, réservé au super administrateur.
 */
class SiteTrafficTest extends TestCase
{
    use RefreshDatabase;

    private const ANDROID = 'Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36';

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_a_public_page_view_is_queued_without_the_ip_address()
    {
        Queue::fake();

        $this->withHeaders(['User-Agent' => self::ANDROID, 'Referer' => 'https://www.google.com/search?q=motriks', 'Accept-Language' => 'fr-CM,fr;q=0.9'])
            ->get('/?utm_source=Facebook&utm_campaign=lancement&autre=1')
            ->assertOk();

        Queue::assertPushed(RecordPageView::class, function (RecordPageView $job) {
            return $job->view['path'] === '/'
                && $job->view['referrer_host'] === 'google.com'
                && $job->view['utm_source'] === 'facebook'
                && $job->view['utm_campaign'] === 'lancement'
                && $job->view['language'] === 'fr'
                && strlen($job->view['visitor']) === 16
                && ! str_contains(json_encode($job->view), '127.0.0.1');
        });
    }

    public function test_the_job_stores_the_device_browser_and_system()
    {
        (new RecordPageView([
            'path' => '/contact', 'referrer_host' => null, 'utm_source' => null, 'utm_medium' => null, 'utm_campaign' => null,
            'user_agent' => self::ANDROID, 'language' => 'fr', 'country' => 'CM', 'visitor' => 'abcdef0123456789',
        ], now()->toDateTimeString()))->handle();

        $view = PageView::sole();
        $this->assertSame(['mobile', 'Chrome', 'Android', 'CM'], [$view->device, $view->browser, $view->os, $view->country]);
    }

    public function test_bots_prefetches_and_partial_reloads_are_ignored()
    {
        Queue::fake();

        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'])->get('/')->assertOk();
        $this->withHeaders(['User-Agent' => self::ANDROID, 'Purpose' => 'prefetch'])->get('/contact')->assertOk();
        $this->withHeaders(['User-Agent' => 'facebookexternalhit/1.1'])->get('/contact')->assertOk();

        Queue::assertNothingPushed();
        $this->assertTrue(UserAgent::parse('Mozilla/5.0 HeadlessChrome/128.0')['bot']);
        $this->assertFalse(UserAgent::parse(self::ANDROID)['bot']);
    }

    public function test_pages_of_the_connected_application_and_the_super_admin_are_not_counted()
    {
        Queue::fake();

        $this->actingAs(User::factory()->create())->withHeaders(['User-Agent' => self::ANDROID])->get(route('dashboard'))->assertOk();
        $this->actingAs(User::factory()->superAdmin()->create())->withHeaders(['User-Agent' => self::ANDROID])->get('/')->assertOk();

        Queue::assertNothingPushed();
    }

    public function test_a_link_carrying_a_token_is_stored_under_its_route_pattern()
    {
        Queue::fake();

        $this->withHeaders(['User-Agent' => self::ANDROID])->get('/reset-password/secret-token-123?email=a@b.test')->assertOk();

        Queue::assertPushed(RecordPageView::class, fn (RecordPageView $job) => $job->view['path'] === '/reset-password/{token}');
    }

    public function test_only_the_super_admin_sees_the_traffic_page()
    {
        PageView::factory()->count(3)->create(['visitor' => 'aaaaaaaaaaaaaaaa', 'device' => 'mobile', 'utm_source' => 'facebook', 'referrer_host' => null]);
        PageView::factory()->create(['visitor' => 'bbbbbbbbbbbbbbbb', 'device' => 'desktop', 'utm_source' => null, 'referrer_host' => 'm.facebook.com']);

        $this->actingAs(User::factory()->create())->get(route('admin.traffic.index'))->assertForbidden();

        $this->actingAs(User::factory()->superAdmin()->create())->get(route('admin.traffic.index', ['periode' => 7]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/audit/traffic')
                ->where('period', 7)
                ->where('totals.views', 4)
                ->where('totals.visits', 2)
                ->where('totals.mobile_share', 50)
                ->has('daily', 7)
                ->has('hours', 24)
                // « facebook » (campagne) et m.facebook.com sont regroupés sous un seul nom
                ->where('sources.0.label', 'Facebook')
                ->where('sources.0.visits', 2));
    }
}
