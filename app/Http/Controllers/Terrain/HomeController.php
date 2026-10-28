<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\DailyReport;
use App\Models\SalesTarget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $today = now()->toDateString();

        // Affectation active aujourd'hui
        $affectation = Affectation::with('site:id,name,address,city,type')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('starts_on', '<=', $today)
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhere('ends_on', '>=', $today))
            ->first();

        // Pas d'affectation aujourd'hui : la prochaine, pour dire à l'hôtesse quand elle commence
        $nextAffectation = $affectation ? null : Affectation::with('site:id,name')
            ->where('user_id', $user->id)
            ->ongoing()
            ->whereDate('starts_on', '>', $today)
            ->orderBy('starts_on')
            ->first();

        // Visite en cours (in_progress) ou terminée aujourd'hui
        $visit = $user->visits()
            ->with('dailyReport.lines')
            ->where(function ($q) use ($today) {
                $q->where('status', 'in_progress')
                  ->orWhereDate('checked_in_at', $today);
            })
            ->latest('checked_in_at')
            ->first();

        // Stats personnelles
        $statsBase = fn () => DB::table('daily_report_lines')
            ->join('daily_reports', 'daily_reports.id', '=', 'daily_report_lines.daily_report_id')
            ->where('daily_reports.user_id', $user->id)
            ->where('daily_reports.status', 'submitted');

        $thisMonthStart  = now()->startOfMonth()->toDateString();
        $lastMonthStart  = now()->subMonth()->startOfMonth();
        $lastMonthEnd    = now()->subMonth()->endOfMonth();
        $lastMonthStartS = $lastMonthStart->toDateString();
        $lastMonthEndS   = $lastMonthEnd->toDateString();

        $myStats = [
            'total_visits'          => $user->visits()->count(),
            'visits_this_month'     => $user->visits()->where('checked_in_at', '>=', now()->startOfMonth())->count(),
            'visits_last_month'     => $user->visits()->whereBetween('checked_in_at', [$lastMonthStart, $lastMonthEnd])->count(),
            'revenue_this_month'    => (float) $statsBase()->where('daily_reports.report_date', '>=', $thisMonthStart)->sum('daily_report_lines.revenue'),
            'revenue_last_month'    => (float) $statsBase()->whereBetween('daily_reports.report_date', [$lastMonthStartS, $lastMonthEndS])->sum('daily_report_lines.revenue'),
            'units_sold_this_month' => (int)   $statsBase()->where('daily_reports.report_date', '>=', $thisMonthStart)->sum('daily_report_lines.units_sold'),
            'units_last_month'      => (int)   $statsBase()->whereBetween('daily_reports.report_date', [$lastMonthStartS, $lastMonthEndS])->sum('daily_report_lines.units_sold'),
            'reports_submitted'     => DB::table('daily_reports')->where('user_id', $user->id)->where('status', 'submitted')->count(),
            'reports_this_month'    => DB::table('daily_reports')->where('user_id', $user->id)->where('status', 'submitted')->where('report_date', '>=', $thisMonthStart)->count(),
        ];

        // Objectif de CA du mois fixé par le responsable, s'il y en a un
        $targetAmount = SalesTarget::where('user_id', $user->id)
            ->whereDate('month', now()->startOfMonth()->toDateString())
            ->value('amount');
        $myTarget = $targetAmount === null
            ? null
            : SalesTarget::progress($myStats['revenue_this_month'], (int) $targetAmount, now());

        // Tendance 7 derniers jours (2 requêtes)
        $visitsByDate = $user->visits()
            ->where('checked_in_at', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw('DATE(checked_in_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        $revenueByDate = DB::table('daily_report_lines')
            ->join('daily_reports', 'daily_reports.id', '=', 'daily_report_lines.daily_report_id')
            ->where('daily_reports.user_id', $user->id)
            ->where('daily_reports.status', 'submitted')
            ->where('daily_reports.report_date', '>=', now()->subDays(6)->toDateString())
            ->selectRaw('daily_reports.report_date as date, SUM(daily_report_lines.revenue) as revenue')
            ->groupBy('date')
            ->pluck('revenue', 'date');

        $weeklyTrend = collect(range(6, 0))->map(function ($daysAgo) use ($visitsByDate, $revenueByDate) {
            $date    = now()->subDays($daysAgo);
            $dateStr = $date->toDateString();
            return [
                'label'   => $date->format('d/m'),
                'visits'  => (int)   ($visitsByDate[$dateStr]  ?? 0),
                'revenue' => (float) ($revenueByDate[$dateStr] ?? 0),
            ];
        })->values()->toArray();

        // 5 derniers rapports soumis
        $recentReports = DailyReport::with('site:id,name')
            ->where('user_id', $user->id)
            ->where('company_id', $user->company_id)
            ->where('status', 'submitted')
            ->orderByDesc('report_date')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'id'           => $r->id,
                'visit_id'     => $r->visit_id,
                'site_name'    => $r->site->name,
                'report_date'  => $r->report_date->translatedFormat('d MMM Y'),
                'report_date_iso' => $r->report_date->toDateString(),
                'submitted_at' => $r->submitted_at?->format('H:i'),
            ]);

        return Inertia::render('terrain/home', [
            'weekly_trend'   => $weeklyTrend,
            'affectation' => $affectation ? [
                'id'           => $affectation->id,
                'site_id'      => $affectation->site_id,
                'site_name'    => $affectation->site->name,
                'site_city'    => $affectation->site->city,
                'site_type'    => $affectation->site->type->label(),
                'site_address' => $affectation->site->address,
                'slot_start'   => $affectation->slot_start,
                'slot_end'     => $affectation->slot_end,
            ] : null,
            'next_affectation' => $nextAffectation ? [
                'site_name' => $nextAffectation->site?->name,
                'starts_on' => $nextAffectation->starts_on->translatedFormat('l j F'),
            ] : null,
            'visit' => $visit ? [
                'id'               => $visit->id,
                'status'           => $visit->status->value,
                'checked_in_at'    => $visit->checked_in_at->format('H:i'),
                'checked_out_at'   => $visit->checked_out_at?->format('H:i'),
                'duration_minutes' => $visit->duration_minutes,
                'has_report'       => $visit->dailyReport !== null,
                'report_status'    => $visit->dailyReport?->status,
            ] : null,
            'my_stats'       => $myStats,
            'my_target'      => $myTarget,
            'recent_reports' => $recentReports,
        ]);
    }
}
