<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PageView;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Volet « Trafic du site » du journal d'audit : audience des pages publiques (voir TrackPageView).
 *
 * Une « visite » = un visiteur sur une journée : l'empreinte anonyme change chaque jour, donc
 * count(distinct visitor) compte directement les visites, sur un jour comme sur une période.
 */
class TrafficController extends Controller
{
    public const PERIODS = [7, 30, 90];

    private const PAGES = [
        '/' => 'Accueil',
        '/contact' => 'Contact',
        '/conditions' => 'Conditions d’utilisation',
        '/confidentialite' => 'Confidentialité',
        '/login' => 'Connexion',
        '/register' => 'Inscription',
        '/forgot-password' => 'Mot de passe oublié',
        '/reset-password/{token}' => 'Nouveau mot de passe',
        '/invitation/{user}' => 'Invitation d’un gérant',
        '/two-factor-challenge' => 'Double authentification',
    ];

    /** Sites d'origine regroupés sous un nom lisible (motif sur le domaine → nom). */
    private const SOURCES = [
        '/(^|\.)google\./' => 'Google',
        '/(^|\.)bing\.com$/' => 'Bing',
        '/(^|\.)(facebook\.com|fb\.me|fb\.com)$/' => 'Facebook',
        '/(^|\.)instagram\.com$/' => 'Instagram',
        '/(^|\.)(whatsapp\.com|wa\.me)$/' => 'WhatsApp',
        '/(^|\.)linkedin\.com$|^lnkd\.in$/' => 'LinkedIn',
        '/(^|\.)(t\.co|twitter\.com|x\.com)$/' => 'X (Twitter)',
        '/(^|\.)tiktok\.com$/' => 'TikTok',
        '/(^|\.)youtube\.com$|^youtu\.be$/' => 'YouTube',
        '/(^|\.)(t\.me|telegram\.org)$/' => 'Telegram',
        '/(^|\.)duckduckgo\.com$/' => 'DuckDuckGo',
        '/(^|\.)yahoo\./' => 'Yahoo',
        '/(^|\.)(chatgpt\.com|openai\.com)$/' => 'ChatGPT',
        // Valeurs utm_source courantes (sans domaine)
        '/^(google|adwords|gads)$/' => 'Google',
        '/^(facebook|fb|meta)$/' => 'Facebook',
        '/^(instagram|ig)$/' => 'Instagram',
        '/^(whatsapp|wa)$/' => 'WhatsApp',
        '/^linkedin$/' => 'LinkedIn',
        '/^(twitter|x)$/' => 'X (Twitter)',
        '/^(tiktok|youtube|telegram)$/' => '', // remplacé par le nom avec majuscule, ci-dessous
    ];

    private const LANGUAGES = [
        'fr' => 'Français', 'en' => 'Anglais', 'es' => 'Espagnol', 'pt' => 'Portugais', 'de' => 'Allemand',
        'ar' => 'Arabe', 'it' => 'Italien', 'nl' => 'Néerlandais', 'zh' => 'Chinois', 'ru' => 'Russe', 'sw' => 'Swahili',
    ];

    private const COUNTRIES = [
        'CM' => 'Cameroun', 'FR' => 'France', 'CI' => 'Côte d’Ivoire', 'SN' => 'Sénégal', 'GA' => 'Gabon', 'CG' => 'Congo',
        'CD' => 'RD Congo', 'TD' => 'Tchad', 'CF' => 'Centrafrique', 'GQ' => 'Guinée équatoriale', 'BJ' => 'Bénin', 'TG' => 'Togo',
        'BF' => 'Burkina Faso', 'ML' => 'Mali', 'NE' => 'Niger', 'GN' => 'Guinée', 'NG' => 'Nigeria', 'RW' => 'Rwanda',
        'MA' => 'Maroc', 'TN' => 'Tunisie', 'DZ' => 'Algérie', 'BE' => 'Belgique', 'CH' => 'Suisse', 'CA' => 'Canada',
        'US' => 'États-Unis', 'GB' => 'Royaume-Uni', 'DE' => 'Allemagne', 'CN' => 'Chine',
    ];

    public function __invoke(Request $request): Response
    {
        $days = in_array((int) $request->query('periode'), self::PERIODS, true) ? (int) $request->query('periode') : 30;
        $start = today()->subDays($days - 1);
        $previousStart = $start->copy()->subDays($days);

        $period = PageView::query()->where('viewed_at', '>=', $start);
        $previous = PageView::query()->where('viewed_at', '>=', $previousStart)->where('viewed_at', '<', $start);

        $current = $this->totals($period);
        $before = $this->totals($previous);
        $visits = max($current['visits'], 1);

        return Inertia::render('admin/audit/traffic', [
            'period' => $days,
            'periods' => self::PERIODS,
            'tracking_since' => ($first = PageView::min('viewed_at')) ? Carbon::parse($first)->format('d/m/Y') : null,
            'live' => PageView::where('viewed_at', '>=', now()->subMinutes(30))->distinct()->count('visitor'),
            'totals' => $current,
            'previous' => $before,
            'daily' => $this->daily($period, $start, $days),
            'hours' => $this->hours($period),
            'devices' => collect(PageView::DEVICES)->map(fn (string $label, string $key) => [
                'key' => $key,
                'label' => $label,
                'visits' => $current['devices'][$key] ?? 0,
            ])->values(),
            'browsers' => $this->share($this->breakdown($period, 'browser'), $visits),
            'systems' => $this->share($this->breakdown($period, 'os'), $visits),
            'pages' => $this->share($this->breakdown($period, 'path', 10)->map(fn (array $row) => [
                ...$row,
                'path' => $row['label'],
                'label' => self::PAGES[$row['label']] ?? $row['label'],
            ]), $visits),
            'sources' => $this->share($this->sources($period), $visits),
            'languages' => $this->share($this->breakdown($period, 'language')->map(fn (array $row) => [
                ...$row,
                'label' => $row['label'] === null ? 'Non précisée' : (self::LANGUAGES[$row['label']] ?? strtoupper($row['label'])),
            ]), $visits),
            'countries' => $this->share($this->breakdown($period, 'country')->filter(fn (array $row) => $row['label'] !== null)->map(fn (array $row) => [
                ...$row,
                'label' => self::COUNTRIES[$row['label']] ?? $row['label'],
            ])->values(), $visits),
        ]);
    }

    /**
     * @return array{views: int, visits: int, pages_per_visit: float, mobile_share: float, devices: array<string, int>}
     */
    private function totals(Builder $query): array
    {
        $views = (clone $query)->count();
        $visits = (clone $query)->distinct()->count('visitor');
        $devices = (clone $query)->selectRaw('device, count(distinct visitor) as visits')->groupBy('device')->pluck('visits', 'device')->map(fn ($v) => (int) $v);

        return [
            'views' => $views,
            'visits' => $visits,
            'pages_per_visit' => $visits ? round($views / $visits, 1) : 0.0,
            'mobile_share' => $visits ? round(100 * ($devices['mobile'] ?? 0) / $visits, 1) : 0.0,
            'devices' => $devices->all(),
        ];
    }

    /** Une ligne par jour de la période, jours sans visite compris. */
    private function daily(Builder $query, CarbonInterface $start, int $days): array
    {
        $rows = (clone $query)
            ->selectRaw('date(viewed_at) as day, count(*) as views, count(distinct visitor) as visits')
            ->groupByRaw('date(viewed_at)')
            ->get()
            ->keyBy(fn ($row) => substr((string) $row->day, 0, 10));

        return collect(range(0, $days - 1))->map(function (int $offset) use ($start, $rows) {
            $day = $start->copy()->addDays($offset);
            $row = $rows[$day->toDateString()] ?? null;

            return [
                'date' => $day->toDateString(),
                'label' => $day->locale('fr')->isoFormat('D MMM'),
                'long' => ucfirst($day->locale('fr')->isoFormat('dddd D MMMM')).($day->isToday() ? ' (en cours)' : ''),
                'views' => (int) ($row->views ?? 0),
                'visits' => (int) ($row->visits ?? 0),
            ];
        })->all();
    }

    /** Pages vues par heure de la journée (heure du serveur, Afrique centrale). */
    private function hours(Builder $query): array
    {
        $hour = match (DB::connection()->getDriverName()) {
            'sqlite' => "cast(strftime('%H', viewed_at) as integer)",
            'pgsql' => 'extract(hour from viewed_at)',
            default => 'hour(viewed_at)',
        };

        $rows = (clone $query)->selectRaw("{$hour} as h, count(*) as views")->groupByRaw($hour)->pluck('views', 'h');

        return collect(range(0, 23))->map(fn (int $h) => ['hour' => $h, 'views' => (int) ($rows[$h] ?? 0)])->all();
    }

    /** @return \Illuminate\Support\Collection<int, array{label: ?string, visits: int, views: int}> */
    private function breakdown(Builder $query, string $column, int $limit = 8)
    {
        return (clone $query)
            ->selectRaw("{$column} as label, count(distinct visitor) as visits, count(*) as views")
            ->groupBy($column)
            ->orderByDesc('visits')
            ->orderByDesc('views')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => ['label' => $row->label, 'visits' => (int) $row->visits, 'views' => (int) $row->views]);
    }

    /**
     * Provenance : campagne (utm_source), sinon site d'origine regroupé (Google, Facebook…), sinon accès direct.
     *
     * @return \Illuminate\Support\Collection<int, array{label: string, visits: int, views: int}>
     */
    private function sources(Builder $query)
    {
        return (clone $query)
            ->selectRaw('coalesce(utm_source, referrer_host) as origin, count(distinct visitor) as visits, count(*) as views')
            ->groupByRaw('coalesce(utm_source, referrer_host)')
            ->orderByDesc('visits')
            ->limit(60)
            ->get()
            ->groupBy(fn ($row) => $this->sourceName($row->origin))
            ->map(fn ($rows, string $label) => ['label' => $label, 'visits' => (int) $rows->sum('visits'), 'views' => (int) $rows->sum('views')])
            ->sortByDesc('visits')
            ->take(8)
            ->values();
    }

    private function sourceName(?string $origin): string
    {
        if ($origin === null || $origin === '') {
            return 'Accès direct';
        }

        $origin = strtolower($origin);

        foreach (self::SOURCES as $pattern => $name) {
            if (preg_match($pattern, $origin)) {
                return $name !== '' ? $name : ucfirst($origin);
            }
        }

        // Campagne sans domaine (utm_source=newsletter) : nom avec majuscule ; un domaine reste tel quel
        return str_contains($origin, '.') ? $origin : ucfirst($origin);
    }

    /** Ajoute la part des visites de chaque ligne (en %). */
    private function share($rows, int $visits): array
    {
        return collect($rows)->map(fn (array $row) => [...$row, 'share' => round(100 * $row['visits'] / $visits, 1)])->values()->all();
    }
}
