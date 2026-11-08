<?php

namespace App\Support\Traffic;

/**
 * Lecture légère de l'en-tête User-Agent : type d'appareil, navigateur, système, et détection des robots.
 * Volontairement simple (sans dépendance) : assez précis pour des statistiques d'audience, pas pour
 * identifier un modèle de téléphone. Les navigateurs courants en Afrique francophone sont reconnus
 * (Opera Mini, UC Browser, Samsung Internet, KaiOS, navigateur intégré de Facebook).
 */
final class UserAgent
{
    /** Robots, aperçus de liens, outils d'audit et navigateurs sans interface. */
    private const BOT = '/bot\b|bot[\/;\s-]|crawl|spider|slurp|scrap|fetch|preview|facebookexternalhit|facebot|embedly|quora link|'
        .'whatsapp\/|telegrambot|discordbot|slackbot|twitterbot|linkedinbot|pinterest|bingpreview|google-?(?:inspectiontool|read-aloud|site-verification)|'
        .'mediapartners|adsbot|apis-google|feedfetcher|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|headless|phantomjs|puppeteer|playwright|selenium|'
        .'curl\/|wget\/|python-|python\/|httpclient|okhttp|go-http|java\/|libwww|axios\/|node-fetch|guzzle|postman|insomnia|ahrefs|semrush|mj12|dotbot|petalbot|yandex|baidu|bytespider|gptbot|claudebot|ccbot|perplexity/i';

    /**
     * @return array{bot: bool, device: string, browser: string, os: string}
     */
    public static function parse(?string $agent): array
    {
        $ua = trim((string) $agent);

        if ($ua === '' || preg_match(self::BOT, $ua)) {
            return ['bot' => true, 'device' => 'desktop', 'browser' => 'Robot', 'os' => 'Autre'];
        }

        return ['bot' => false, 'device' => self::device($ua), 'browser' => self::browser($ua), 'os' => self::os($ua)];
    }

    private static function device(string $ua): string
    {
        if (preg_match('/iPad|Tablet|Kindle|Silk|PlayBook|Nexus (?:7|9|10)\b|SM-T\d|Tab\b/i', $ua)
            || (stripos($ua, 'Android') !== false && stripos($ua, 'Mobile') === false)) {
            return 'tablet';
        }

        if (preg_match('/Mobi|iPhone|iPod|Android|KAIOS|Opera Mini|IEMobile|Windows Phone|BlackBerry|BB10/i', $ua)) {
            return 'mobile';
        }

        return 'desktop';
    }

    private static function browser(string $ua): string
    {
        return match (true) {
            (bool) preg_match('/FBAN|FBAV|FB_IAB/i', $ua) => 'Facebook',
            (bool) preg_match('/Instagram/i', $ua) => 'Instagram',
            (bool) preg_match('/Opera Mini|OPiOS/i', $ua) => 'Opera Mini',
            (bool) preg_match('/OPR\/|Opera/i', $ua) => 'Opera',
            (bool) preg_match('/Edg(?:e|A|iOS)?\//i', $ua) => 'Edge',
            (bool) preg_match('/SamsungBrowser/i', $ua) => 'Samsung Internet',
            (bool) preg_match('/UCBrowser|UCWEB/i', $ua) => 'UC Browser',
            (bool) preg_match('/YaBrowser/i', $ua) => 'Yandex',
            (bool) preg_match('/Firefox|FxiOS/i', $ua) => 'Firefox',
            (bool) preg_match('/Chrome|CriOS|Chromium/i', $ua) => 'Chrome',
            (bool) preg_match('/Safari/i', $ua) && (bool) preg_match('/Version\//i', $ua) => 'Safari',
            (bool) preg_match('/MSIE|Trident/i', $ua) => 'Internet Explorer',
            default => 'Autre',
        };
    }

    private static function os(string $ua): string
    {
        return match (true) {
            (bool) preg_match('/KAIOS/i', $ua) => 'KaiOS',
            (bool) preg_match('/iPhone|iPad|iPod|iOS/i', $ua) => 'iOS',
            (bool) preg_match('/Android/i', $ua) => 'Android',
            (bool) preg_match('/Windows Phone/i', $ua) => 'Windows Phone',
            (bool) preg_match('/Windows/i', $ua) => 'Windows',
            (bool) preg_match('/CrOS/i', $ua) => 'ChromeOS',
            (bool) preg_match('/Macintosh|Mac OS X/i', $ua) => 'macOS',
            (bool) preg_match('/Linux|X11/i', $ua) => 'Linux',
            default => 'Autre',
        };
    }
}
