<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\Plan;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\SupportRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tableau de bord du super administrateur : état de la plateforme et ce qui demande une action.
 */
class DashboardController extends Controller
{
    /** Au-delà de ce nombre de jours sans rapport, une entreprise active est signalée. */
    private const INACTIVE_DAYS = 7;

    public function __invoke(): Response
    {
        $today = today();
        $monthStart = $today->copy()->startOfMonth();

        $byStatus = Company::query()->select('status', DB::raw('count(*) as total'))->groupBy('status')->pluck('total', 'status');

        $activeCompanyIds = Company::where('status', AccountStatus::Active)->pluck('id');

        // Rapports soumis : du jour, du mois, et le chiffre d'affaires déclaré du mois
        $submitted = DB::table('daily_reports')->where('status', 'submitted');
        $revenueMonth = (float) DB::table('daily_report_lines')
            ->join('daily_reports', 'daily_reports.id', '=', 'daily_report_lines.daily_report_id')
            ->where('daily_reports.status', 'submitted')
            ->whereDate('daily_reports.report_date', '>=', $monthStart->toDateString())
            ->sum('daily_report_lines.revenue');

        $lastReports = DB::table('daily_reports')
            ->where('status', 'submitted')
            ->select('company_id', DB::raw('max(report_date) as last_report'))
            ->groupBy('company_id')
            ->pluck('last_report', 'company_id');

        $inactive = Company::where('status', AccountStatus::Active)
            ->withCount(['users as hostesses_count' => fn ($q) => $q->where('role', Role::FieldAgent)])
            ->orderBy('name')
            ->get()
            ->filter(function (Company $c) use ($lastReports, $today) {
                $last = $lastReports[$c->id] ?? null;

                return $last === null || $today->diffInDays($last, true) > self::INACTIVE_DAYS;
            })
            ->map(fn (Company $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'last_report' => isset($lastReports[$c->id]) ? date('d/m/Y', strtotime($lastReports[$c->id])) : null,
                'hostesses_count' => $c->hostesses_count,
                'created_at' => $c->created_at?->format('d/m/Y'),
            ])
            ->values();

        $trialsEnding = Company::query()
            ->where('plan', '!=', Plan::Starter->value)
            ->where('plan_trial', true)
            ->whereBetween('plan_ends_on', [$today->toDateString(), $today->copy()->addDays(7)->toDateString()])
            ->orderBy('plan_ends_on')
            ->get()
            ->map(fn (Company $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'plan' => $c->plan->label(),
                'ends_on' => $c->plan_ends_on->format('d/m/Y'),
                'days_left' => (int) $today->diffInDays($c->plan_ends_on, true),
            ])
            ->values();

        $unverified = User::query()
            ->where('role', Role::CompanyAdmin)
            ->whereNull('email_verified_at')
            ->whereHas('company', fn ($q) => $q->whereIn('status', [AccountStatus::Active, AccountStatus::Pending]))
            ->with('company:id,name')
            ->latest()
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'company_id' => $u->company_id,
                'company' => $u->company?->name,
                'invited' => (bool) $u->must_change_password,
                'created_at' => $u->created_at?->format('d/m/Y'),
            ]);

        return Inertia::render('admin/dashboard', [
            'companies' => [
                'total' => (int) $byStatus->sum(),
                'active' => (int) ($byStatus[AccountStatus::Active->value] ?? 0),
                'pending' => (int) ($byStatus[AccountStatus::Pending->value] ?? 0),
                'pending_with_file' => Company::where('status', AccountStatus::Pending)->whereNotNull('onboarding_completed_at')->count(),
                'suspended' => (int) ($byStatus[AccountStatus::Suspended->value] ?? 0),
            ],
            'usage' => [
                'users' => User::whereIn('company_id', $activeCompanyIds)->count(),
                'hostesses' => User::whereIn('company_id', $activeCompanyIds)->where('role', Role::FieldAgent)->count(),
                'active_hostesses_month' => DB::table('visits')
                    ->whereIn('company_id', $activeCompanyIds)
                    ->where('checked_in_at', '>=', $monthStart)
                    ->distinct()
                    ->count('user_id'),
                'reports_today' => (clone $submitted)->whereDate('report_date', $today->toDateString())->count(),
                'reports_month' => (clone $submitted)->whereDate('report_date', '>=', $monthStart->toDateString())->count(),
                'revenue_month' => $revenueMonth,
                'sites' => DB::table('sites')->whereIn('company_id', $activeCompanyIds)->whereNull('deleted_at')->count(),
            ],
            'inactive' => $inactive,
            'inactive_days' => self::INACTIVE_DAYS,
            'trials_ending' => $trialsEnding,
            'unverified_managers' => $unverified,
            'recent_companies' => Company::latest()->limit(5)->get()->map(fn (Company $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status->value,
                'created_at' => $c->created_at?->format('d/m/Y'),
            ]),
            'support_new' => SupportRequest::where('status', 'new')->count(),
            'month_label' => $today->locale('fr')->isoFormat('MMMM YYYY'),
        ]);
    }
}
