<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use App\Support\Incident;
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
            ->with(['site:id,name', 'lines', 'lines.siteProduct.product:id,image'])
            ->latest('report_date')
            ->limit(30)
            ->get()
            ->map(function (DailyReport $r) {
                $incident = Incident::meaningful($r->incident_notes);

                return [
                    'id'               => $r->id,
                    'visit_id'         => $r->visit_id,
                    'site_name'        => $r->site->name,
                    'report_date'      => $r->report_date->locale('fr')->isoFormat('dddd D MMMM YYYY'),
                    'report_date_iso'  => $r->report_date->toDateString(),
                    'status'           => $r->status,
                    'total_revenue'    => $r->totalRevenue(),
                    'total_units_sold' => $r->totalUnitsSold(),
                    'submitted_at'     => $r->submitted_at?->format('H:i'),
                    'has_incident'     => $incident !== null,
                    'notes'            => $r->notes,
                    'incident_notes'   => $incident,
                    'lines'            => $r->lines->map(fn ($l) => [
                        'id'            => $l->id,
                        'product_name'  => $l->product_name,
                        'unit'          => $l->unit,
                        'unit_price'    => $l->unit_price,
                        'opening_stock' => $l->opening_stock,
                        'units_sold'    => $l->units_sold,
                        'closing_stock' => $l->closing_stock,
                        'revenue'       => $l->revenue,
                        'image_url'     => $l->siteProduct?->product?->image
                            ? asset('storage/' . $l->siteProduct->product->image)
                            : null,
                    ])->values(),
                ];
            });

        return Inertia::render('terrain/rapports', [
            'reports' => $reports,
        ]);
    }
}