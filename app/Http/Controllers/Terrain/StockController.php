<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\SiteProduct;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Le stock des points de vente de l'hôtesse, tel qu'il est maintenant : ce qu'il reste de chaque
 * produit, et ce qui arrive bientôt à épuisement. En lecture seule : le stock bouge avec les rapports
 * et les réassorts du responsable.
 */
class StockController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $affectations = Affectation::current()
            ->where('user_id', $user->id)
            ->with('site:id,name,city')
            ->get()
            ->unique('site_id');

        $sites = $affectations->map(function (Affectation $a) {
            $stocks = SiteProduct::where('site_id', $a->site_id)
                ->with('product:id,name,unit,price,image')
                ->get()
                ->filter(fn (SiteProduct $s) => $s->product !== null)
                ->sortBy(fn (SiteProduct $s) => $s->product->name, SORT_NATURAL | SORT_FLAG_CASE);

            return [
                'id' => $a->site_id,
                'name' => $a->site?->name,
                'city' => $a->site?->city,
                'updated_at' => $stocks->max('updated_at')?->locale('fr')->isoFormat('D MMM à HH:mm'),
                'totals' => [
                    'products' => $stocks->count(),
                    'units' => (int) $stocks->sum('current_stock'),
                    'value' => (float) $stocks->sum(fn (SiteProduct $s) => $s->current_stock * (float) $s->product->price),
                    'warning' => $stocks->filter(fn (SiteProduct $s) => $s->stockStatus() === 'warning')->count(),
                    'critical' => $stocks->filter(fn (SiteProduct $s) => $s->stockStatus() === 'critical')->count(),
                ],
                'products' => $stocks->map(fn (SiteProduct $s) => [
                    'id' => $s->id,
                    'name' => $s->product->name,
                    'unit' => $s->product->unit,
                    'price' => (float) $s->product->price,
                    'stock' => (int) $s->current_stock,
                    'alert_threshold' => (int) $s->alert_threshold,
                    'critical_threshold' => (int) $s->critical_threshold,
                    'status' => $s->stockStatus(),
                    'image_url' => $s->product->image ? asset('storage/'.$s->product->image) : null,
                ])->values(),
            ];
        })->values();

        return Inertia::render('terrain/stock', [
            'sites' => $sites,
            'currency' => $user->company->currency ?: 'XAF',
        ]);
    }
}
