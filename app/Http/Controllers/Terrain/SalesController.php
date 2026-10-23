<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalesController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        // Charger tous les rapports soumis avec lignes + image produit
        $reports = DailyReport::with([
            'lines',
            'lines.siteProduct.product:id,image',
            'site:id,name,city',
        ])
            ->where('user_id', $user->id)
            ->where('status', 'submitted')
            ->orderByDesc('report_date')
            ->get();

        // ── Grouper par mois ──
        $months = $reports
            ->groupBy(fn ($r) => $r->report_date->translatedFormat('MMMM Y'))
            ->map(function ($monthReports, $monthKey) {
                $allLines = $monthReports->flatMap(fn ($r) => $r->lines);
                $soldLines = $allLines->filter(fn ($l) => $l->units_sold > 0);

                $topProducts = $soldLines
                    ->groupBy('product_name')
                    ->map(fn ($lines, $name) => [
                        'name'      => $name,
                        'units'     => (int) $lines->sum('units_sold'),
                        'revenue'   => (float) $lines->sum('revenue'),
                        'image_url' => $lines->first()->siteProduct?->product?->image
                            ? asset('storage/'.$lines->first()->siteProduct->product->image)
                            : null,
                    ])
                    ->sortByDesc('revenue')
                    ->values()
                    ->take(3);

                return [
                    'key'           => $monthKey,
                    'revenue'       => (float) $allLines->sum('revenue'),
                    'units'         => (int) $allLines->sum('units_sold'),
                    'reports_count' => $monthReports->count(),
                    'top_products'  => $topProducts,
                    'days'          => $monthReports->map(fn ($r) => [
                        'report_id'     => $r->id,
                        'visit_id'      => $r->visit_id,
                        'date'          => $r->report_date->toDateString(),
                        'date_formatted' => $r->report_date->translatedFormat('l d MMMM Y'),
                        'site_name'     => $r->site->name,
                        'site_city'     => $r->site->city,
                        'total_revenue' => (float) $r->lines->sum('revenue'),
                        'total_units'   => (int) $r->lines->sum('units_sold'),
                        'has_incident'  => filled($r->incident_notes),
                        'notes'         => $r->notes,
                        'lines'         => $r->lines
                            ->filter(fn ($l) => $l->units_sold > 0)
                            ->sortByDesc('revenue')
                            ->map(fn ($l) => [
                                'product_name' => $l->product_name,
                                'unit'         => $l->unit,
                                'unit_price'   => $l->unit_price,
                                'units_sold'   => $l->units_sold,
                                'revenue'      => $l->revenue,
                                'notes'        => $l->notes,
                                'image_url'    => $l->siteProduct?->product?->image
                                    ? asset('storage/'.$l->siteProduct->product->image)
                                    : null,
                            ])
                            ->values(),
                    ])->values(),
                ];
            })
            ->values();

        // ── Résumé global ──
        $allLines = $reports->flatMap(fn ($r) => $r->lines);
        $soldLines = $allLines->filter(fn ($l) => $l->units_sold > 0);

        $bestProduct = $soldLines
            ->groupBy('product_name')
            ->map(fn ($lines, $name) => [
                'name'      => $name,
                'revenue'   => (float) $lines->sum('revenue'),
                'units'     => (int) $lines->sum('units_sold'),
                'image_url' => $lines->first()->siteProduct?->product?->image
                    ? asset('storage/'.$lines->first()->siteProduct->product->image)
                    : null,
            ])
            ->sortByDesc('revenue')
            ->first();

        $bestDay = $reports
            ->map(fn ($r) => [
                'date'       => $r->report_date->translatedFormat('d MMMM Y'),
                'revenue'    => (float) $r->lines->sum('revenue'),
                'site_name'  => $r->site->name,
            ])
            ->sortByDesc('revenue')
            ->first();

        return Inertia::render('terrain/ventes', [
            'summary' => [
                'total_revenue'  => (float) $allLines->sum('revenue'),
                'total_units'    => (int) $allLines->sum('units_sold'),
                'total_reports'  => $reports->count(),
                'best_product'   => $bestProduct,
                'best_day'       => $bestDay,
            ],
            'months' => $months,
        ]);
    }
}
