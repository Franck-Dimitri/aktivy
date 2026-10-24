<?php

namespace App\Http\Controllers\Company\Events;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventPack;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

class EventPackController extends Controller
{
    public function store(Request $request, Event $event): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_if($event->isFinished(), 403);

        $data = $this->validatePack($request);

        $pack = $event->packs()->create([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'type'        => $data['type'],
            'price'       => $data['price'] ?? null,
        ]);

        foreach ($data['lines'] as $line) {
            $pack->lines()->create($line);
        }

        return back()->with('success', 'Pack créé.');
    }

    public function update(Request $request, Event $event, EventPack $pack): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_unless($pack->event_id === $event->id, 403);

        $data = $this->validatePack($request, ['active' => 'boolean']);

        $pack->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'type'        => $data['type'],
            'price'       => $data['price'] ?? null,
            'active'      => $data['active'] ?? $pack->active,
        ]);

        $pack->lines()->delete();
        foreach ($data['lines'] as $line) {
            $pack->lines()->create($line);
        }

        return back()->with('success', 'Pack mis à jour.');
    }

    public function destroy(Request $request, Event $event, EventPack $pack): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_unless($pack->event_id === $event->id, 403);

        $pack->lines()->delete();
        $pack->delete();

        return back()->with('success', 'Pack supprimé.');
    }

    /**
     * Règles communes à la création et à la modification d'un pack.
     * Les produits doivent appartenir à l'entreprise ; un bundle a un prix,
     * un pack « acheté / offert » a au moins un produit payant et un produit offert.
     */
    private function validatePack(Request $request, array $extraRules = []): array
    {
        $validator = Validator::make($request->all(), [
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type'        => 'required|in:grouped_discount,buy_get_free',
            'price'       => 'nullable|required_if:type,grouped_discount|integer|min:0',
            'lines'       => 'required|array|min:1',
            'lines.*.product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')->where('company_id', $request->user()->company_id),
            ],
            'lines.*.quantity'   => 'required|integer|min:1',
            'lines.*.role'       => 'required|in:paid,free',
            'lines.*.unit_price' => 'nullable|integer|min:0',
            ...$extraRules,
        ], [
            'price.required_if'           => 'Indiquez le prix du bundle.',
            'price.integer'               => 'Le prix doit être un nombre entier, sans décimales.',
            'lines.required'              => 'Ajoutez au moins un produit au pack.',
            'lines.*.product_id.required' => 'Choisissez un produit pour chaque ligne.',
            'lines.*.product_id.exists'   => 'Ce produit n’existe pas dans votre catalogue.',
            'lines.*.quantity.required'   => 'Indiquez une quantité pour chaque produit.',
            'lines.*.quantity.min'        => 'La quantité de chaque produit doit être d’au moins 1.',
        ], [
            'name' => 'nom du pack',
        ]);

        $validator->after(function ($validator) use ($request) {
            if ($request->input('type') !== 'buy_get_free') {
                return;
            }

            $roles = collect($request->input('lines', []))->pluck('role');

            if (! $roles->contains('paid') || ! $roles->contains('free')) {
                $validator->errors()->add('lines', 'Un pack « acheté / offert » doit contenir au moins un produit payant et un produit offert.');
            }
        });

        return $validator->validate();
    }
}
