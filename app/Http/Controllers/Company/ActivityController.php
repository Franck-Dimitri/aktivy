<?php

namespace App\Http\Controllers\Company;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\DailyReport;
use App\Models\SiteProduct;
use App\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Activité du jour, en direct : par point de vente, qui est attendue, qui est en poste
 * et depuis quand, qui a terminé, qui n'a pas pointé, et ce qui a été vendu.
 */
class ActivityController extends Controller
{
    /** Délai après le début du créneau au-delà duquel une hôtesse est « non pointée ». */
    private const GRACE_MINUTES = 30;

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $company = $user->company;
        $siteIds = $user->managedSiteIds();
        $today = today();
        $now = now();

        $affectations = Affectation::current()
            ->where('company_id', $company->id)
            ->when($siteIds !== null, fn ($q) => $q->whereIn('site_id', $siteIds))
            ->whereHas('agent', fn ($q) => $q->where('role', Role::FieldAgent))
            ->with(['agent:id,name,phone', 'site:id,name,city'])
            ->get();

        $visits = Visit::whereIn('user_id', $affectations->pluck('user_id'))
            ->whereDate('checked_in_at', $today)
            ->get()
            ->keyBy('user_id');

        $reports = DailyReport::whereIn('user_id', $affectations->pluck('user_id'))
            ->whereDate('report_date', $today)
            ->withSum('lines', 'revenue')
            ->withSum('lines', 'units_sold')
            ->get()
            ->keyBy('user_id');

        $stockAlerts = SiteProduct::whereIn('site_id', $affectations->pluck('site_id'))
            ->whereColumn('current_stock', '<=', 'alert_threshold')
            ->selectRaw('site_id, COUNT(*) as total')
            ->groupBy('site_id')
            ->pluck('total', 'site_id');

        $sites = $affectations->groupBy('site_id')->map(function (Collection $group) use ($visits, $reports, $stockAlerts, $now) {
            $site = $group->first()->site;

            return [
                'id' => $site?->id,
                'name' => $site?->name,
                'city' => $site?->city,
                'stock_alerts' => (int) ($stockAlerts[$site?->id] ?? 0),
                'hostesses' => $group->unique('user_id')->map(function (Affectation $a) use ($visits, $reports, $now) {
                    $visit = $visits->get($a->user_id);
                    $report = $reports->get($a->user_id);

                    return [
                        'user_id' => $a->user_id,
                        'name' => $a->agent?->name,
                        'phone' => $a->agent?->phone,
                        'slot_start' => $a->slot_start ? substr($a->slot_start, 0, 5) : null,
                        'slot_end' => $a->slot_end ? substr($a->slot_end, 0, 5) : null,
                        'state' => $this->state($a, $visit, $now),
                        'checked_in_at' => $visit?->checked_in_at?->format('H:i'),
                        'checked_out_at' => $visit?->checked_out_at?->format('H:i'),
                        'off_site' => $visit?->isOffSite() ?? false,
                        'report_id' => $report?->id,
                        'report_status' => $report?->status,
                        'revenue' => (float) ($report?->lines_sum_revenue ?? 0),
                        'units_sold' => (int) ($report?->lines_sum_units_sold ?? 0),
                        'has_incident' => filled($report?->incident_notes),
                    ];
                })->sortBy('name')->values(),
            ];
        })->sortBy('name')->values();

        $hostesses = $sites->pluck('hostesses')->flatten(1);

        return Inertia::render('activity/index', [
            'updated_at' => $now->format('H:i'),
            'currency' => $company->currency ?: 'XAF',
            'has_scope' => $siteIds === null || $siteIds !== [],
            'totals' => [
                'expected' => $hostesses->count(),
                'on_site' => $hostesses->where('state', 'on_site')->count(),
                'done' => $hostesses->where('state', 'done')->count(),
                'missing' => $hostesses->where('state', 'missing')->count(),
                'revenue' => (float) $hostesses->sum('revenue'),
            ],
            'sites' => $sites,
        ]);
    }

    /**
     * en poste, terminé, non pointée (créneau dépassé) ou attendue (pas encore l'heure).
     */
    private function state(Affectation $affectation, ?Visit $visit, $now): string
    {
        if ($visit) {
            return $visit->checked_out_at ? 'done' : 'on_site';
        }

        $start = $now->copy()->setTimeFromTimeString($affectation->slot_start ?: '08:00')->addMinutes(self::GRACE_MINUTES);

        return $now->gte($start) ? 'missing' : 'expected';
    }
}
