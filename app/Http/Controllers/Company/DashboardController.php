<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;

use App\Enums\Role;
use App\Models\Site;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user    = $request->user();
        $company = $user->company;

        if (! $company) {
            return Inertia::render('dashboard', ['stats' => null, 'recent' => []]);
        }

        // Le superviseur ne voit que ses sites (null = toute l'entreprise)
        $siteIds = $user->managedSiteIds();
        $inScope = fn ($q, string $column = 'site_id') => $q->when($siteIds !== null, fn ($q) => $q->whereIn($column, $siteIds));

        // ── KPIs ──────────────────────────────────────────────────────────────
        $sitesTotal   = $inScope($company->sites(), 'id')->count();
        $sitesActive  = $inScope($company->sites(), 'id')->where('status', 'active')->count();

        $staffRoles   = [Role::Supervisor->value, Role::FieldAgent->value, Role::Accountant->value];
        $staffTotal   = $company->users()->whereIn('role', $staffRoles)->visibleTo($user)->count();
        $staffOnSite  = $company->users()
            ->whereIn('role', $staffRoles)
            ->visibleTo($user)
            ->whereHas('activeVisit')
            ->count();

        $visitsToday  = $inScope($company->visits())
            ->whereDate('checked_in_at', today())
            ->count();

        $visitsWeek   = $inScope($company->visits())
            ->where('checked_in_at', '>=', now()->startOfWeek())
            ->count();

        // ── KPIs ventes ───────────────────────────────────────────────────────
        $salesBase = fn () => DB::table('daily_report_lines')
            ->join('daily_reports', 'daily_reports.id', '=', 'daily_report_lines.daily_report_id')
            ->where('daily_reports.company_id', $company->id)
            ->when($siteIds !== null, fn ($q) => $q->whereIn('daily_reports.site_id', $siteIds))
            ->where('daily_reports.status', 'submitted');

        $revenueToday   = (float) $salesBase()->whereDate('daily_reports.report_date', today())->sum('daily_report_lines.revenue');
        $revenueWeek    = (float) $salesBase()->where('daily_reports.report_date', '>=', now()->startOfWeek()->toDateString())->sum('daily_report_lines.revenue');
        $unitsSoldToday = (int)   $salesBase()->whereDate('daily_reports.report_date', today())->sum('daily_report_lines.units_sold');
        $reportsToday   = $inScope($company->dailyReports())->where('status', 'submitted')->whereDate('report_date', today())->count();

        // ── Activité récente ─────────────────────────────────────────────────
        $recentVisits = $inScope($company->visits())
            ->with(['agent:id,name', 'site:id,name'])
            ->latest('checked_in_at')
            ->limit(8)
            ->get()
            ->map(fn ($v) => [
                'id'            => $v->id,
                'agent_name'    => $v->agent->name,
                'site_name'     => $v->site->name,
                'checked_in_at' => $v->checked_in_at->diffForHumans(),
                'status'        => $v->status->value,
                'status_label'  => $v->status->label(),
            ]);

        // ── Sites récents ─────────────────────────────────────────────────────
        $recentSites = $inScope($company->sites(), 'id')
            ->withCount(['affectations' => fn ($q) => $q->where('status', 'active')])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Site $s) => [
                'id'            => $s->id,
                'name'          => $s->name,
                'type_label'    => $s->type->label(),
                'city'          => $s->city,
                'status'        => $s->status->value,
                'status_label'  => $s->status->label(),
                'last_visit_at' => $s->last_visit_at?->diffForHumans() ?? 'Jamais',
                'affectations'  => $s->affectations_count,
            ]);

        return Inertia::render('dashboard', [
            'stats' => [
                'sites_total'     => $sitesTotal,
                'sites_active'    => $sitesActive,
                'staff_total'     => $staffTotal,
                'staff_on_site'   => $staffOnSite,
                'visits_today'    => $visitsToday,
                'visits_week'     => $visitsWeek,
                'revenue_today'   => $revenueToday,
                'revenue_week'    => $revenueWeek,
                'units_sold_today'=> $unitsSoldToday,
                'reports_today'   => $reportsToday,
            ],
            'recent_visits' => $recentVisits,
            'recent_sites'  => $recentSites,
        ]);
    }
}
