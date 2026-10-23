<?php

namespace App\Http\Controllers\Company\Events;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventPack;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EventPackController extends Controller
{
    public function store(Request $request, Event $event): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_if($event->isFinished(), 403);

        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type'        => 'required|in:grouped_discount,buy_get_free',
            'price'       => 'nullable|integer|min:0',
            'lines'       => 'required|array|min:1',
            'lines.*.product_id' => 'required|integer|exists:products,id',
            'lines.*.quantity'   => 'required|integer|min:1',
            'lines.*.role'       => 'required|in:paid,free',
            'lines.*.unit_price' => 'nullable|integer|min:0',
        ]);

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

        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type'        => 'required|in:grouped_discount,buy_get_free',
            'price'       => 'nullable|integer|min:0',
            'active'      => 'boolean',
            'lines'       => 'required|array|min:1',
            'lines.*.product_id' => 'required|integer|exists:products,id',
            'lines.*.quantity'   => 'required|integer|min:1',
            'lines.*.role'       => 'required|in:paid,free',
            'lines.*.unit_price' => 'nullable|integer|min:0',
        ]);

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
}
