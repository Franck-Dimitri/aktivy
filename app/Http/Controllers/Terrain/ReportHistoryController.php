<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportHistoryController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $reports = DailyReport::where('user_id', $user->id)
            ->where('company_id', $user->company_id)
            ->with(['site:id,name', 'lines'])
            ->latest('report_date')
            ->limit(30)
            ->get()
            ->map(fn (DailyReport $r) => [
                'id'               => $r->id,
                'visit_id'         => $r->visit_id,
                'site_name'        => $r->site->name,
                'report_date'      => $r->report_date->translatedFormat('l d MMMM'),
                'report_date_iso'  => $r->report_date->toDateString(),
                'status'           => $r->status,
                'total_revenue'    => $r->totalRevenue(),
                'total_units_sold' => $r->totalUnitsSold(),
                'submitted_at'     => $r->submitted_at?->format('H:i'),
                'has_incident'     => ! empty($r->incident_notes),
            ]);

        return Inertia::render('terrain/rapports', [
            'reports' => $reports,
        ]);
    }
}
