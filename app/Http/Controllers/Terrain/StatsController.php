<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StatsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $base = fn () => DB::table('daily_report_lines')
            ->join('daily_reports', 'daily_reports.id', '=', 'daily_report_lines.daily_report_id')
            ->where('daily_reports.user_id', $user->id)
            ->where('daily_reports.status', 'submitted');

        $thisMonthStart  = now()->startOfMonth()->toDateString();
        $lastMonthStart  = now()->subMonthNoOverflow()->startOfMonth()->toDateString();
        $lastMonthEnd    = now()->subMonthNoOverflow()->endOfMonth()->toDateString();

        $revenueThis    = (float) $base()->where('daily_reports.report_date', '>=', $thisMonthStart)->sum('daily_report_lines.revenue');
        $unitsThis      = (int)   $base()->where('daily_reports.report_date', '>=', $thisMonthStart)->sum('daily_report_lines.units_sold');
        $visitsThis     = $user->visits()->where('checked_in_at', '>=', now()->startOfMonth())->count();
        $reportsThis    = DB::table('daily_reports')->where('user_id', $user->id)->where('status', 'submitted')->where('report_date', '>=', $thisMonthStart)->count();

        $revenueLast    = (float) $base()->whereBetween('daily_reports.report_date', [$lastMonthStart, $lastMonthEnd])->sum('daily_report_lines.revenue');
        $unitsLast      = (int)   $base()->whereBetween('daily_reports.report_date', [$lastMonthStart, $lastMonthEnd])->sum('daily_report_lines.units_sold');
        $visitsLast     = $user->visits()->whereBetween('checked_in_at', [now()->subMonthNoOverflow()->startOfMonth(), now()->subMonthNoOverflow()->endOfMonth()])->count();
        $reportsLast    = DB::table('daily_reports')->where('user_id', $user->id)->where('status', 'submitted')->whereBetween('report_date', [$lastMonthStart, $lastMonthEnd])->count();

        // Tendance 7 derniers jours : deux requêtes groupées par jour (au lieu de deux par jour)
        $from = now()->subDays(6)->startOfDay();
        $revenueByDay = $base()
            ->where('daily_reports.report_date', '>=', $from->toDateString())
            ->groupBy('daily_reports.report_date')
            ->select('daily_reports.report_date as day', DB::raw('SUM(daily_report_lines.revenue) as revenue'))
            ->pluck('revenue', 'day')
            ->mapWithKeys(fn ($revenue, $day) => [substr((string) $day, 0, 10) => (float) $revenue]);
        $visitsByDay = $user->visits()
            ->where('checked_in_at', '>=', $from)
            ->get(['checked_in_at'])
            ->countBy(fn ($visit) => $visit->checked_in_at->toDateString());

        $trend = collect(range(6, 0))->map(function (int $daysAgo) use ($revenueByDay, $visitsByDay) {
            $date = now()->subDays($daysAgo)->toDateString();

            return [
                'label'   => now()->subDays($daysAgo)->format('d/m'),
                'revenue' => $revenueByDay->get($date, 0.0),
                'visits'  => $visitsByDay->get($date, 0),
            ];
        })->values();

        // Top produits ce mois
        $topProducts = DB::table('daily_report_lines')
            ->join('daily_reports', 'daily_reports.id', '=', 'daily_report_lines.daily_report_id')
            ->where('daily_reports.user_id', $user->id)
            ->where('daily_reports.status', 'submitted')
            ->where('daily_reports.report_date', '>=', $thisMonthStart)
            ->select(
                'daily_report_lines.product_name',
                DB::raw('SUM(daily_report_lines.units_sold) as units'),
                DB::raw('SUM(daily_report_lines.revenue) as revenue'),
            )
            ->groupBy('daily_report_lines.product_name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        // Image de chaque produit du classement, cherchée dans les rapports de l'hôtesse seulement :
        // avant, la recherche par nom parcourait les lignes de toutes les entreprises (lent, et l'image
        // d'un produit homonyme d'une autre entreprise pouvait s'afficher)
        $images = DB::table('daily_report_lines')
            ->join('daily_reports', 'daily_reports.id', '=', 'daily_report_lines.daily_report_id')
            ->join('site_products', 'site_products.id', '=', 'daily_report_lines.site_product_id')
            ->join('products', 'products.id', '=', 'site_products.product_id')
            ->where('daily_reports.user_id', $user->id)
            ->whereIn('daily_report_lines.product_name', $topProducts->pluck('product_name'))
            ->whereNotNull('products.image')
            ->groupBy('daily_report_lines.product_name')
            ->select('daily_report_lines.product_name', DB::raw('MAX(products.image) as image'))
            ->pluck('image', 'product_name');

        $topProducts = $topProducts->map(fn ($p) => [
            'product_name' => $p->product_name,
            'units'        => (int) $p->units,
            'revenue'      => (float) $p->revenue,
            'image_url'    => ($img = $images->get($p->product_name)) ? asset('storage/' . $img) : null,
        ])->values();

        return Inertia::render('terrain/stats', [
            'stats' => [
                'this_month' => [
                    'revenue' => $revenueThis,
                    'units'   => $unitsThis,
                    'visits'  => $visitsThis,
                    'reports' => $reportsThis,
                ],
                'last_month' => [
                    'revenue' => $revenueLast,
                    'units'   => $unitsLast,
                    'visits'  => $visitsLast,
                    'reports' => $reportsLast,
                ],
                'total_visits'  => $user->visits()->count(),
                'total_reports' => DB::table('daily_reports')->where('user_id', $user->id)->where('status', 'submitted')->count(),
            ],
            'trend'        => $trend,
            'top_products' => $topProducts,
        ]);
    }
}