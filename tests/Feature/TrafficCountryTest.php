<?php

namespace Tests\Feature;

use App\Jobs\RecordPageView;
use App\Models\PageView;
use App\Models\User;
use App\Support\Traffic\GeoIp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Trafic par pays : pays fourni par Cloudflare s'il existe, sinon déduit de l'adresse IP par la base
 * locale DB-IP ; l'adresse IP n'est jamais enregistrée.
 */
class TrafficCountryTest extends TestCase
{
    use RefreshDatabase;

    private const ANDROID = 'Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36';

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /** GeoIp qui répond comme la base DB-IP pour quelques adresses publiques. */
    private function fakeGeoIp(): void
    {
        $this->app->instance(GeoIp::class, new class extends GeoIp
        {
            public function country(?string $ip): ?string
            {
                return ['41.202.207.1' => 'CM', '2.15.0.1' => 'FR'][$ip] ?? null;
            }
        });
    }

    public function test_the_country_comes_from_the_ip_address_without_storing_it()
    {
        Queue::fake();
        $this->fakeGeoIp();

        $this->withHeaders(['User-Agent' => self::ANDROID])->withServerVariables(['REMOTE_ADDR' => '41.202.207.1'])->get('/')->assertOk();

        Queue::assertPushed(RecordPageView::class, fn (RecordPageView $job) => $job->view['country'] === 'CM'
            && ! in_array('41.202.207.1', array_map('strval', $job->view), true));
    }

    public function test_cloudflare_country_wins_and_unknown_addresses_have_no_country()
    {
        Queue::fake();
        $this->fakeGeoIp();

        $this->withHeaders(['User-Agent' => self::ANDROID, 'CF-IPCountry' => 'SN'])->withServerVariables(['REMOTE_ADDR' => '2.15.0.1'])->get('/')->assertOk();
        Queue::assertPushed(RecordPageView::class, fn (RecordPageView $job) => $job->view['country'] === 'SN');

        Queue::fake();
        $this->withHeaders(['User-Agent' => self::ANDROID, 'CF-IPCountry' => ''])->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])->get('/contact')->assertOk();
        Queue::assertPushed(RecordPageView::class, fn (RecordPageView $job) => $job->view['country'] === null);
    }

    public function test_local_addresses_and_a_missing_database_give_no_country()
    {
        $geo = new GeoIp;

        $this->assertNull($geo->country('192.168.1.10'));
        $this->assertNull($geo->country('127.0.0.1'));
        $this->assertNull($geo->country(null));

        if (! is_file(GeoIp::path())) {
            $this->assertNull($geo->country('41.202.207.1'));
        }
    }

    public function test_the_traffic_page_names_the_countries_in_french()
    {
        foreach (['CM', 'CM', 'IN'] as $i => $country) {
            PageView::create([
                'path' => '/', 'device' => 'mobile', 'browser' => 'Chrome', 'os' => 'Android',
                'country' => $country, 'visitor' => str_pad((string) $i, 16, 'a'), 'viewed_at' => now(),
            ]);
        }

        $this->actingAs(User::factory()->superAdmin()->create())->get(route('admin.traffic.index'))
            ->assertInertia(fn ($page) => $page
                ->where('countries.0.label', 'Cameroun')
                ->where('countries.0.code', 'CM')
                ->where('countries.1.label', 'Inde'));
    }

    public function test_a_failed_download_keeps_the_current_database()
    {
        Http::fake(['download.db-ip.com/*' => Http::response('', 404)]);
        $before = is_file(GeoIp::path()) ? md5_file(GeoIp::path()) : null;

        $this->artisan('geoip:update')->assertFailed();

        $this->assertSame($before, is_file(GeoIp::path()) ? md5_file(GeoIp::path()) : null);
        $this->assertFalse(File::exists(GeoIp::path().'.download'));
    }
}
