<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $products = $request->user()->company->products()
            ->withCount('siteProducts')
            ->orderBy('name')
            ->get()
            ->map(fn (Product $p) => [
                'id'               => $p->id,
                'name'             => $p->name,
                'sku'              => $p->sku,
                'description'      => $p->description,
                'unit'             => $p->unit,
                'price'            => $p->price,
                'image_url'        => $p->image ? asset("storage/{$p->image}") : null,
                'is_active'        => $p->is_active,
                'sites_count'      => $p->site_products_count,
            ]);

        $stats = [
            'total'    => $products->count(),
            'active'   => $products->where('is_active', true)->count(),
            'inactive' => $products->where('is_active', false)->count(),
            'deployed' => $products->where('sites_count', '>', 0)->count(),
        ];

        return Inertia::render('products/index', [
            'products' => $products->values(),
            'stats'    => $stats,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('products/create', [
            'units' => self::UNITS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'sku'         => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:1000'],
            'unit'        => ['required', 'string', 'max:30'],
            'price'       => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'image'       => ['nullable', 'image', 'max:3072', 'mimes:jpg,jpeg,png,webp'],
            'is_active'   => ['boolean'],
        ]);

        $company = $request->user()->company;

        if (! empty($validated['sku'])) {
            if ($company->products()->where('sku', $validated['sku'])->exists()) {
                return back()->withErrors(['sku' => 'Ce code SKU est déjà utilisé.'])->withInput();
            }
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $company->products()->create([
            ...$validated,
            'image'      => $imagePath,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('products.index')->with('success', 'Produit créé.');
    }

    public function edit(Request $request, Product $product): Response
    {
        $this->authorizeCompany($request, $product);

        return Inertia::render('products/edit', [
            'product' => [
                'id'          => $product->id,
                'name'        => $product->name,
                'sku'         => $product->sku,
                'description' => $product->description,
                'unit'        => $product->unit,
                'price'       => $product->price,
                'image_url'   => $product->image ? asset("storage/{$product->image}") : null,
                'is_active'   => $product->is_active,
            ],
            'units' => self::UNITS,
        ]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeCompany($request, $product);

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'sku'         => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:1000'],
            'unit'        => ['required', 'string', 'max:30'],
            'price'       => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'image'       => ['nullable', 'image', 'max:3072', 'mimes:jpg,jpeg,png,webp'],
            'remove_image'=> ['boolean'],
            'is_active'   => ['boolean'],
        ]);

        if (! empty($validated['sku']) && $validated['sku'] !== $product->sku) {
            $exists = $request->user()->company->products()
                ->where('sku', $validated['sku'])
                ->where('id', '!=', $product->id)
                ->exists();
            if ($exists) {
                return back()->withErrors(['sku' => 'Ce code SKU est déjà utilisé.'])->withInput();
            }
        }

        $imagePath = $product->image;

        if ($request->boolean('remove_image') && $imagePath) {
            Storage::disk('public')->delete($imagePath);
            $imagePath = null;
        }

        if ($request->hasFile('image')) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product->update([
            ...$validated,
            'image' => $imagePath,
        ]);

        return redirect()->route('products.index')->with('success', 'Produit mis à jour.');
    }

    public function destroy(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeCompany($request, $product);

        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();

        return redirect()->route('products.index')->with('success', 'Produit archivé.');
    }

    private function authorizeCompany(Request $request, Product $product): void
    {
        abort_if($product->company_id !== $request->user()->company_id, 403);
    }

    private const UNITS = [
        'pièce', 'carton', 'kg', 'g', 'litre', 'ml', 'sachet', 'boîte', 'palette',
    ];
}
