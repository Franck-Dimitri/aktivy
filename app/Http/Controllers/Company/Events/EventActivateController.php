<?php

namespace App\Http\Controllers\Company\Events;

use App\Enums\AccountStatus;
use App\Enums\EventStatus;
use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventActivateController extends Controller
{
    /**
     * Lancer l'event : passe en "active" + crée les affectations terrain.
     */
    public function __invoke(Request $request, Event $event): RedirectResponse
    {
        abort_unless($event->company_id === $request->user()->company_id, 403);

        $data = $request->validate([
            'action' => 'required|in:activate,complete',
        ]);

        // On lance un brouillon, on clôture un événement en cours
        if ($data['action'] === 'activate') {
            abort_unless($event->isDraft(), 422, 'L\'événement est déjà lancé ou terminé.');
        } else {
            abort_unless($event->isActive(), 422, 'Seul un événement en cours peut être clôturé.');
        }

        DB::transaction(function () use ($event, $data, $request) {
            if ($data['action'] === 'activate') {
                $this->activate($event, $request->user()->id);
            } else {
                $this->complete($event);
            }
        });

        $message = $data['action'] === 'activate'
            ? 'Événement lancé ! Les hôtesses peuvent maintenant se connecter.'
            : 'Événement clôturé. Les comptes recrutés ont été archivés.';

        return back()->with('success', $message);
    }

    private function activate(Event $event, int $activatedBy): void
    {
        $event->update([
            'status'       => EventStatus::Active,
            'activated_at' => now(),
        ]);

        // Créer une affectation terrain pour chaque hôtesse
        foreach ($event->hostesses()->with('eventSite.site')->get() as $hostess) {
            $siteId = $hostess->eventSite?->site_id;

            // Si le PDV de l'event est un nouveau (sans site_id), on ne peut pas créer d'affectation standard
            // On crée quand même si on a un site_id
            if (!$siteId) {
                continue;
            }

            // Éviter les doublons si l'event est relancé
            $exists = DB::table('affectations')
                ->where('event_id', $event->id)
                ->where('user_id', $hostess->user_id)
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('affectations')->insert([
                'company_id'  => $event->company_id,
                'event_id'    => $event->id,
                'site_id'     => $siteId,
                'user_id'     => $hostess->user_id,
                'assigned_by' => $activatedBy,
                'starts_on'   => $event->start_date,
                'ends_on'     => $event->end_date,
                'status'      => 'active',
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }
    }

    private function complete(Event $event): void
    {
        $event->update([
            'status'       => EventStatus::Completed,
            'completed_at' => now(),
        ]);

        // Archiver les comptes recrutés spécialement pour l'event
        $recruitedIds = $event->hostesses()
            ->where('recruited_for_event', true)
            ->pluck('user_id');

        if ($recruitedIds->isNotEmpty()) {
            DB::table('users')
                ->whereIn('id', $recruitedIds)
                ->update(['status' => AccountStatus::Suspended->value, 'updated_at' => now()]);

            $event->hostesses()
                ->where('recruited_for_event', true)
                ->update(['status' => 'archived']);
        }

        // Clore les affectations de l'event
        DB::table('affectations')
            ->where('event_id', $event->id)
            ->where('status', 'active')
            ->update(['status' => 'completed', 'ends_on' => now()->toDateString(), 'updated_at' => now()]);
    }
}
