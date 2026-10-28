<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\DailyReportLine;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\StockMovement;
use App\Support\Stock\StockLedger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SiteInventoryController extends Controller
{
    /** Add a product to a site. */
    public function store(Request $request, Site $site): RedirectResponse
    {
        $this->authorizeSite($request, $site);

        $validated = $request->validate([
            'product_id'         => ['required', 'integer', 'exists:products,id'],
            'current_stock'      => ['required', 'integer', 'min:0'],
            'alert_threshold'    => ['required', 'integer', 'min:0'],
            'critical_threshold' => ['required', 'integer', 'min:0', 'lte:alert_threshold'],
        ]);

        $company = $request->user()->company;

        abort_if(! $company->products()->where('id', $validated['product_id'])->exists(), 403);

        $already = $site->siteProducts()->where('product_id', $validated['product_id'])->exists();
        if ($already) {
            return back()->withErrors(['product_id' => 'Ce produit est déjà dans l\'inventaire de ce site.']);
        }

        $stock = SiteProduct::create([
            ...$validated,
            'current_stock' => 0,
            'company_id'    => $company->id,
            'site_id'       => $site->id,
            'updated_by'    => $request->user()->id,
        ]);
        StockLedger::set($stock, $validated['current_stock'], StockMovement::INITIAL, $request->user());

        return back()->with('success', 'Produit ajouté à l\'inventaire.');
    }

    /** Update stock or thresholds. */
    public function update(Request $request, Site $site, SiteProduct $inventory): RedirectResponse
    {
        $this->authorizeSite($request, $site);
        abort_if($inventory->site_id !== $site->id, 404);

        $validated = $request->validate([
            'current_stock'      => ['required', 'integer', 'min:0'],
            'alert_threshold'    => ['required', 'integer', 'min:0'],
            'critical_threshold' => ['required', 'integer', 'min:0', 'lte:alert_threshold'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($inventory, $validated, $request) {
            $inventory->update([
                'alert_threshold'    => $validated['alert_threshold'],
                'critical_threshold' => $validated['critical_threshold'],
            ]);

            // Un stock saisi à la main est un inventaire : l'écart est tracé dans le journal
            StockLedger::set($inventory, $validated['current_stock'], StockMovement::ADJUSTMENT, $request->user(), $validated['notes'] ?? null);
        });

        return back()->with('success', 'Stock mis à jour.');
    }

    /** Réassort : ajoute une livraison au stock du site. */
    public function restock(Request $request, Site $site, SiteProduct $inventory): RedirectResponse
    {
        $this->authorizeSite($request, $site);
        abort_if($inventory->site_id !== $site->id, 404);

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'notes'    => ['nullable', 'string', 'max:500'],
        ], [
            'quantity.min' => 'Indiquez au moins une unité livrée.',
        ]);

        StockLedger::move($inventory->id, $validated['quantity'], StockMovement::RESTOCK, $request->user(), notes: $validated['notes'] ?? null);

        return back()->with('success', "Réassort de {$validated['quantity']} enregistré.");
    }

    /** Remove a product from a site. */
    public function destroy(Request $request, Site $site, SiteProduct $inventory): RedirectResponse
    {
        $this->authorizeSite($request, $site);
        abort_if($inventory->site_id !== $site->id, 404);

        // Les rapports journaliers référencent la ligne d'inventaire (clé étrangère restrictive)
        if (DailyReportLine::where('site_product_id', $inventory->id)->exists()) {
            return back()->withErrors(['inventory' => 'Ce produit figure dans des rapports de vente : il ne peut pas être retiré. Mettez son stock à 0.']);
        }

        $inventory->delete();

        return back()->with('success', 'Produit retiré de l\'inventaire.');
    }

    private function authorizeSite(Request $request, Site $site): void
    {
        abort_if($site->company_id !== $request->user()->company_id, 403);
        abort_unless($request->user()->managesSite($site->id), 403);
    }
}
