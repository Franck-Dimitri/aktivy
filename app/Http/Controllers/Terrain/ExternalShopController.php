<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\DailyReportLine;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Ventes en boutique extérieure de l'hôtesse : ce qu'elle a vendu hors de son point de vente,
 * boutique par boutique. Elles se saisissent dans le rapport du jour.
 */
class ExternalShopController extends Controller
{
    /** Historique affiché : les 90 derniers jours. */
    private const DAYS = 90;

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $since = CarbonImmutable::today()->subDays(self::DAYS);
        $monthStart = CarbonImmutable::today()->startOfMonth();

        $lines = DailyReportLine::query()
            ->join('daily_reports as r', 'r.id', '=', 'daily_report_lines.daily_report_id')
            ->leftJoin('sites as s', 's.id', '=', 'r.site_id')
            ->join('visits as v', 'v.id', '=', 'r.visit_id')
            ->where('r.user_id', $user->id)
            ->where('r.company_id', $user->company_id)
            ->whereNotNull('daily_report_lines.external_shop')
            ->whereDate('r.report_date', '>=', $since->toDateString())
            ->orderByDesc('r.report_date')
            ->orderBy('daily_report_lines.external_shop')
            ->get([
                'daily_report_lines.*',
                'r.report_date', 'r.status as report_status', 'r.visit_id', 'v.uuid as visit_uuid', 's.name as site_name',
            ]);

        $thisMonth = $lines->filter(fn ($l) => CarbonImmutable::parse($l->report_date)->gte($monthStart));

        return Inertia::render('terrain/boutiques', [
            'currency' => $user->company->currency ?: 'XAF',
            'summary' => [
                'month_revenue' => (float) $thisMonth->sum('revenue'),
                'month_units' => (int) $thisMonth->sum('units_sold'),
                'month_shops' => $thisMonth->pluck('external_shop')->map(fn ($s) => mb_strtolower($s))->unique()->count(),
                'days' => self::DAYS,
            ],
            // Boutiques du mois, de la plus vendeuse à la moins vendeuse
            'shops' => $thisMonth->groupBy('external_shop')
                ->map(fn (Collection $g, string $shop) => [
                    'shop' => $shop,
                    'revenue' => (float) $g->sum('revenue'),
                    'units' => (int) $g->sum('units_sold'),
                    'days' => $g->pluck('report_date')->unique()->count(),
                ])
                ->sortByDesc('revenue')
                ->values(),
            // Journées, de la plus récente à la plus ancienne
            'days' => $lines->groupBy(fn ($l) => CarbonImmutable::parse($l->report_date)->toDateString())
                ->map(fn (Collection $day, string $date) => [
                    'date' => $date,
                    'date_label' => CarbonImmutable::parse($date)->locale('fr')->isoFormat('dddd D MMMM'),
                    'site_name' => $day->first()->site_name,
                    'visit_id' => $day->first()->visit_id,
                    'visit_uuid' => $day->first()->visit_uuid,
                    'submitted' => $day->first()->report_status === 'submitted',
                    'revenue' => (float) $day->sum('revenue'),
                    'shops' => $day->groupBy('external_shop')->map(fn (Collection $g, string $shop) => [
                        'shop' => $shop,
                        'revenue' => (float) $g->sum('revenue'),
                        'lines' => $g->map(fn ($l) => [
                            'id' => $l->id,
                            'product_name' => $l->product_name,
                            'unit' => $l->unit,
                            'unit_price' => (float) $l->unit_price,
                            'units' => (int) $l->units_sold,
                            'revenue' => (float) $l->revenue,
                        ])->values(),
                    ])->values(),
                ])
                ->values(),
        ]);
    }
}
