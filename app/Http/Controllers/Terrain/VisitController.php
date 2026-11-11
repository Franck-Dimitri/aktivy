<?php

namespace App\Http\Controllers\Terrain;

use App\Enums\VisitStatus;
use App\Http\Controllers\Controller;
use App\Http\Middleware\HandleBackgroundSync;
use App\Models\Affectation;
use App\Models\DailyReport;
use App\Models\DailyReportLine;
use App\Models\Visit;
use App\Notifications\LiveNotification;
use App\Support\Notifications\Notify;
use App\Support\Terrain\OfflineTime;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VisitController extends Controller
{
    /**
     * Check-in : prise de service.
     *
     * Faite sans réseau, elle arrive plus tard avec l'heure du téléphone (checked_in_at) et l'identifiant
     * choisi par le téléphone (uuid), que reprennent les envois suivants (rapport, photos, fin de service).
     * Un renvoi de la même prise de service (réponse perdue) ne crée rien de plus.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'affectation_id' => ['required', 'integer'],
            'latitude'       => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'      => ['nullable', 'numeric', 'between:-180,180'],
            // Rayon de précision annoncé par le téléphone, en mètres
            'accuracy'       => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            // Prise de service faite hors ligne
            'uuid'           => ['nullable', 'uuid'],
            'checked_in_at'  => ['nullable', 'date'],
        ]);

        $uuid = isset($validated['uuid']) ? strtolower($validated['uuid']) : null;

        // Déjà reçue : la réponse s'était perdue en route
        if ($uuid !== null && ($known = $user->visits()->where('uuid', $uuid)->first())) {
            return $this->checkedIn($request, $known);
        }
        abort_if($uuid !== null && Visit::where('uuid', $uuid)->exists(), 409);

        [$at, $offline] = OfflineTime::resolve($validated['checked_in_at'] ?? null, 'checked_in_at');
        $day = $at->toDateString();

        // Visite en cours (potentiellement d'un jour précédent sans checkout)
        $inProgress = $user->visits()->where('status', 'in_progress')->first();
        if ($inProgress && $offline && $inProgress->checked_in_at->toDateString() < $day) {
            // Journée précédente jamais clôturée : elle reste « incomplète », celle du jour commence
            $inProgress->update(['status' => VisitStatus::Incomplete]);
        } elseif ($inProgress) {
            // Hors ligne, les envois suivants sont rattachés à cette visite (même journée)
            if ($offline) {
                return $this->checkedIn($request, $inProgress);
            }

            return redirect()->route('terrain.report.show', $inProgress)
                ->with('info', 'Vous avez une visite en cours. Continuez votre journée.');
        }

        // Déjà pointé ce jour-là (visite terminée ou signalée)
        $dayVisit = $user->visits()->whereDate('checked_in_at', $day)->first();
        if ($dayVisit) {
            if ($offline) {
                return $this->checkedIn($request, $dayVisit);
            }

            return back()->withErrors(['visit' => 'Vous avez déjà pointé aujourd\'hui.']);
        }

        // Seule une affectation active et en cours ce jour-là permet de pointer (même règle que l'accueil)
        $affectation = Affectation::where('id', $validated['affectation_id'])
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->whereDate('starts_on', '<=', $day)
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $day))
            ->firstOrFail();

        $visit = $user->company->visits()->make([
            'site_id'            => $affectation->site_id,
            'user_id'            => $user->id,
            'affectation_id'     => $affectation->id,
            'checked_in_at'      => $at,
            'checkin_synced_at'  => $offline ? now() : null,
            'checkin_latitude'   => $validated['latitude'] ?? null,
            'checkin_longitude'  => $validated['longitude'] ?? null,
            // Distance au site, pour signaler au responsable un pointage fait ailleurs
            'checkin_distance_m' => isset($validated['latitude'], $validated['longitude'])
                ? $affectation->site->distanceTo((float) $validated['latitude'], (float) $validated['longitude'])
                : null,
            'checkin_accuracy_m' => isset($validated['latitude'], $validated['accuracy']) ? (int) round((float) $validated['accuracy']) : null,
            'status'             => 'in_progress',
        ]);
        $visit->uuid = $uuid;
        $visit->save();

        // Créer le rapport journalier en brouillon + snapshot des stocks d'ouverture
        $report = DailyReport::create([
            'company_id'  => $user->company_id,
            'site_id'     => $affectation->site_id,
            'user_id'     => $user->id,
            'visit_id'    => $visit->id,
            // Les ventes d'un événement sont retrouvées par ce lien
            'event_id'    => $affectation->event_id,
            'report_date' => $day,
            'status'      => 'draft',
        ]);

        // Snapshot : une ligne par produit du site avec son stock actuel
        $siteProducts = $affectation->site->siteProducts()
            ->with('product:id,name,unit,price')
            ->get();

        foreach ($siteProducts as $sp) {
            DailyReportLine::create([
                'daily_report_id' => $report->id,
                'site_product_id' => $sp->id,
                'product_name'    => $sp->product->name,
                'unit'            => $sp->product->unit,
                'unit_price'      => $sp->product->price ?? 0,
                'opening_stock'   => $sp->current_stock,
                'units_sold'      => 0,
                'closing_stock'   => $sp->current_stock,
                'revenue'         => 0,
            ]);
        }

        // Les responsables du site voient la prise de service en direct
        Notify::send(Notify::siteManagers($user->company_id, [$affectation->site_id]), LiveNotification::shiftStarted($visit->setRelation('site', $affectation->site), $user));

        return $this->checkedIn($request, $visit, 'Prise de service enregistrée.');
    }

    /** Check-out : fin de service (hors ligne : avec l'heure du téléphone). */
    public function checkout(Request $request, Visit $visit): RedirectResponse
    {
        abort_if($visit->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'latitude'       => ['nullable', 'numeric'],
            'longitude'      => ['nullable', 'numeric'],
            'checked_out_at' => ['nullable', 'date'],
        ]);

        // Renvoi d'une fin de service déjà reçue (réponse perdue en route)
        if ($visit->status->value !== 'in_progress' && $request->has('checked_out_at')) {
            HandleBackgroundSync::done($request, ['visit' => $visit->uuid]);

            return redirect()->route('terrain.home');
        }

        abort_if($visit->status->value !== 'in_progress', 422);

        [$at, $offline] = OfflineTime::resolve($validated['checked_out_at'] ?? null, 'checked_out_at', $visit->checked_in_at);

        if ($offline) {
            $visit->checkout_synced_at = now();
        }

        $visit->checkout(
            at: $at,
            latitude: $validated['latitude'] ?? null,
            longitude: $validated['longitude'] ?? null,
        );

        Notify::send(Notify::siteManagers($visit->company_id, [$visit->site_id]), LiveNotification::shiftEnded($visit->fresh('site'), $request->user()));
        HandleBackgroundSync::done($request, ['visit' => $visit->uuid]);

        return redirect()->route('terrain.home')
            ->with('success', 'Fin de service enregistrée. Bonne soirée !');
    }

    /** Prise de service enregistrée : direction le rapport du jour. */
    private function checkedIn(Request $request, Visit $visit, ?string $message = null): RedirectResponse
    {
        // Le téléphone rattache ses envois suivants à cette visite
        HandleBackgroundSync::done($request, ['visit' => $visit->uuid]);

        $redirect = redirect()->route('terrain.report.show', $visit);

        return $message ? $redirect->with('success', $message) : $redirect;
    }
}
