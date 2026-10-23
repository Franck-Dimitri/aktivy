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

        // Tendance 7 derniers jours
        $trend = collect(range(6, 0))->map(function (int $daysAgo) use ($user, $base) {
            $date = now()->subDays($daysAgo)->toDateString();
            return [
                'label'   => now()->subDays($daysAgo)->format('d/m'),
                'revenue' => (float) $base()->where('daily_reports.report_date', $date)->sum('daily_report_lines.revenue'),
                'visits'  => $user->visits()->whereDate('checked_in_at', $date)->count(),
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
