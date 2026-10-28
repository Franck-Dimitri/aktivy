<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\SiteProduct;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Produits sous leur seuil d'alerte, tous sites confondus (ceux du superviseur pour lui).
 */
class StockAlertController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $siteIds = $user->managedSiteIds();

        $alerts = SiteProduct::where('company_id', $user->company_id)
            ->when($siteIds !== null, fn ($q) => $q->whereIn('site_id', $siteIds))
            ->whereColumn('current_stock', '<=', 'alert_threshold')
            ->whereHas('site')
            ->whereHas('product')
            ->with(['site:id,name,city', 'product:id,name,unit'])
            ->get()
            ->map(fn (SiteProduct $sp) => [
                'id' => $sp->id,
                'site_id' => $sp->site_id,
                'site_name' => $sp->site->name,
                'site_city' => $sp->site->city,
                'product_name' => $sp->product->name,
                'unit' => $sp->product->unit,
                'current_stock' => $sp->current_stock,
                'alert_threshold' => $sp->alert_threshold,
                'critical_threshold' => $sp->critical_threshold,
                'level' => $sp->current_stock <= $sp->critical_threshold ? 'critical' : 'warning',
            ])
            // Les plus urgents d'abord : critiques, puis stock le plus bas
            ->sortBy([['level', 'asc'], ['current_stock', 'asc']])
            ->values();

        return Inertia::render('stock-alerts/index', [
            'alerts' => $alerts,
        ]);
    }
}
