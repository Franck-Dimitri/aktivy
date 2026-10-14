<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;

use App\Enums\Role;
use App\Models\Site;
use Illuminate\Http\Request;
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

        // ── KPIs ──────────────────────────────────────────────────────────────
        $sitesTotal   = $company->sites()->count();
        $sitesActive  = $company->sites()->where('status', 'active')->count();

        $staffRoles   = [Role::Supervisor->value, Role::FieldAgent->value, Role::Accountant->value];
        $staffTotal   = $company->users()->whereIn('role', $staffRoles)->count();
        $staffOnSite  = $company->users()
            ->whereIn('role', $staffRoles)
            ->whereHas('activeVisit')
            ->count();

        $visitsToday  = $company->visits()
            ->whereDate('checked_in_at', today())
            ->count();

        $visitsWeek   = $company->visits()
            ->where('checked_in_at', '>=', now()->startOfWeek())
            ->count();

        // ── Activité récente ─────────────────────────────────────────────────
        $recentVisits = $company->visits()
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
        $recentSites = $company->sites()
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
                'sites_total'  => $sitesTotal,
                'sites_active' => $sitesActive,
                'staff_total'  => $staffTotal,
                'staff_on_site'=> $staffOnSite,
                'visits_today' => $visitsToday,
                'visits_week'  => $visitsWeek,
            ],
            'recent_visits' => $recentVisits,
            'recent_sites'  => $recentSites,
        ]);
    }
}
