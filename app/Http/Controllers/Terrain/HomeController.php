<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
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

        // Visite en cours ou terminée aujourd'hui
        $visit = $user->visits()
            ->with('dailyReport.lines')
            ->whereDate('checked_in_at', $today)
            ->latest('checked_in_at')
            ->first();

        // Stats personnelles de l'hôtesse
        $myStatsBase = fn () => DB::table('daily_report_lines')
            ->join('daily_reports', 'daily_reports.id', '=', 'daily_report_lines.daily_report_id')
            ->where('daily_reports.user_id', $user->id)
            ->where('daily_reports.status', 'submitted');

        $myStats = [
            'total_visits'        => $user->visits()->count(),
            'visits_this_month'   => $user->visits()->where('checked_in_at', '>=', now()->startOfMonth())->count(),
            'revenue_this_month'  => (float) $myStatsBase()->where('daily_reports.report_date', '>=', now()->startOfMonth()->toDateString())->sum('daily_report_lines.revenue'),
            'units_sold_this_month' => (int) $myStatsBase()->where('daily_reports.report_date', '>=', now()->startOfMonth()->toDateString())->sum('daily_report_lines.units_sold'),
            'reports_submitted'   => DB::table('daily_reports')->where('user_id', $user->id)->where('status', 'submitted')->count(),
        ];

        return Inertia::render('terrain/home', [
            'affectation' => $affectation ? [
                'id'         => $affectation->id,
                'site_id'    => $affectation->site_id,
                'site_name'  => $affectation->site->name,
                'site_city'  => $affectation->site->city,
                'site_type'  => $affectation->site->type->label(),
                'site_address' => $affectation->site->address,
                'slot_start' => $affectation->slot_start,
                'slot_end'   => $affectation->slot_end,
            ] : null,
            'visit' => $visit ? [
                'id'             => $visit->id,
                'status'         => $visit->status->value,
                'checked_in_at'  => $visit->checked_in_at->format('H:i'),
                'checked_out_at' => $visit->checked_out_at?->format('H:i'),
                'duration_minutes' => $visit->duration_minutes,
                'has_report'     => $visit->dailyReport !== null,
                'report_status'  => $visit->dailyReport?->status,
                'report_id'      => $visit->dailyReport?->id,
            ] : null,
            'my_stats' => $myStats,
        ]);
    }
}
