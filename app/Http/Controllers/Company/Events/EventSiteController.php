<?php

namespace App\Http\Controllers\Company\Events;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventSite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EventSiteController extends Controller
{
    public function store(Request $request, Event $event): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_if($event->isFinished(), 403);

        $data = $request->validate([
            'site_id' => ['nullable', 'integer', "exists:sites,id,company_id,{$event->company_id}"],
            'name'    => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'city'    => 'nullable|string|max:100',
        ]);

        // Soit on rattache un PDV existant, soit on saisit un nom
        if (empty($data['site_id']) && empty($data['name'])) {
            return back()->withErrors(['name' => 'Choisissez un PDV existant ou saisissez un nom.']);
        }

        // Vérifier que ce PDV n'est pas déjà dans l'event
        if (!empty($data['site_id'])) {
            $exists = $event->sites()->where('site_id', $data['site_id'])->exists();
            if ($exists) {
                return back()->withErrors(['site_id' => 'Ce point de vente est déjà dans l\'événement.']);
            }
        }

        $event->sites()->create($data);

        return back()->with('success', 'Point de vente ajouté.');
    }

    public function destroy(Request $request, Event $event, EventSite $eventSite): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_unless($eventSite->event_id === $event->id, 403);
        abort_if($event->isFinished(), 403);

        // Retirer les hôtesses du PDV avant suppression
        $eventSite->hostesses()->update(['event_site_id' => null]);
        $eventSite->delete();

        return back()->with('success', 'Point de vente retiré.');
    }
}
