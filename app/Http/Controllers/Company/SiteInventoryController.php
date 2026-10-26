<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Site;
use App\Models\SiteProduct;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

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

        SiteProduct::create([
            ...$validated,
            'company_id' => $company->id,
            'site_id'    => $site->id,
            'updated_by' => $request->user()->id,
        ]);

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
        ]);

        $inventory->update([
            ...$validated,
            'updated_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Stock mis à jour.');
    }

    /** Remove a product from a site. */
    public function destroy(Request $request, Site $site, SiteProduct $inventory): RedirectResponse
    {
        $this->authorizeSite($request, $site);
        abort_if($inventory->site_id !== $site->id, 404);

        $inventory->delete();

        return back()->with('success', 'Produit retiré de l\'inventaire.');
    }

    private function authorizeSite(Request $request, Site $site): void
    {
        abort_if($site->company_id !== $request->user()->company_id, 403);
    }
}
