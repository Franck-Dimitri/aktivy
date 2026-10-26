<?php

namespace App\Http\Controllers\Company\Events;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventHostess;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class EventHostessController extends Controller
{
    /**
     * Ajouter une hôtesse à l'event :
     *  - mode "existing" : relier un compte FieldAgent existant
     *  - mode "new"      : créer un nouveau compte + ajouter à l'event
     */
    public function store(Request $request, Event $event): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_if($event->isFinished(), 403);

        $mode = $request->input('mode', 'existing');

        if ($mode === 'new') {
            return $this->storeNew($request, $event);
        }

        return $this->storeExisting($request, $event);
    }

    private function storeExisting(Request $request, Event $event): RedirectResponse
    {
        $data = $request->validate([
            'user_id'       => ['required', 'integer', "exists:users,id,company_id,{$event->company_id}"],
            'event_site_id' => ['nullable', 'integer', "exists:event_sites,id,event_id,{$event->id}"],
        ]);

        abort_if(
            $event->hostesses()->where('user_id', $data['user_id'])->exists(),
            422,
            'Cette hôtesse est déjà dans l\'événement.'
        );

        $event->hostesses()->create([
            'user_id'              => $data['user_id'],
            'event_site_id'        => $data['event_site_id'] ?? null,
            'recruited_for_event'  => false,
        ]);

        return back()->with('success', 'Hôtesse ajoutée à l\'événement.');
    }

    private function storeNew(Request $request, Event $event): RedirectResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'phone'         => 'required|string|max:25',
            'password'      => ['required', 'string', Password::defaults()],
            'event_site_id' => ['nullable', 'integer', "exists:event_sites,id,event_id,{$event->id}"],
        ]);

        // Le numéro est enregistré normalisé : c'est sous cette forme qu'on vérifie le doublon
        $phone = PhoneNumber::normalize($data['phone']);
        if ($phone === null) {
            return back()->withErrors(['phone' => 'Ce numéro de téléphone n’est pas valide.'])->withInput();
        }
        if (User::withTrashed()->where('phone', $phone)->exists()) {
            return back()->withErrors(['phone' => 'Ce numéro est déjà utilisé par un autre compte.'])->withInput();
        }

        $user = $event->company->users()->create([
            'name'     => $data['name'],
            'phone'    => $data['phone'],
            'password' => Hash::make($data['password']),
            'role'     => Role::FieldAgent->value,
            'status'   => AccountStatus::Active->value,
            'must_change_password' => true,
        ]);

        $event->hostesses()->create([
            'user_id'              => $user->id,
            'event_site_id'        => $data['event_site_id'] ?? null,
            'recruited_for_event'  => true,
        ]);

        return back()->with('success', 'Hôtesse créée et ajoutée à l\'événement.');
    }

    public function update(Request $request, Event $event, EventHostess $hostess): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_unless($hostess->event_id === $event->id, 403);

        $data = $request->validate([
            'event_site_id' => ['nullable', 'integer', "exists:event_sites,id,event_id,{$event->id}"],
        ]);

        $hostess->update($data);

        return back()->with('success', 'Affectation mise à jour.');
    }

    public function destroy(Request $request, Event $event, EventHostess $hostess): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);
        abort_unless($hostess->event_id === $event->id, 403);
        abort_if($event->isActive(), 403, 'Impossible de retirer une hôtesse pendant l\'événement.');

        $hostess->delete();

        return back()->with('success', 'Hôtesse retirée de l\'événement.');
    }
}
