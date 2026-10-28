<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\DailyReport;
use App\Models\DailyReportLine;
use App\Models\Visit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VisitController extends Controller
{
    /** Check-in : prise de service. */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $today = now()->toDateString();

        // Visite en cours (potentiellement d'un jour précédent sans checkout)
        $inProgress = $user->visits()->where('status', 'in_progress')->first();
        if ($inProgress) {
            return redirect()->route('terrain.report.show', $inProgress)
                ->with('info', 'Vous avez une visite en cours. Continuez votre journée.');
        }

        // Déjà pointé aujourd'hui (visite terminée ou signalée)
        $todayVisit = $user->visits()->whereDate('checked_in_at', $today)->first();
        if ($todayVisit) {
            return back()->withErrors(['visit' => 'Vous avez déjà pointé aujourd\'hui.']);
        }

        $validated = $request->validate([
            'affectation_id' => ['required', 'integer'],
            'latitude'       => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'      => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        // Seule une affectation active et en cours aujourd'hui permet de pointer (même règle que l'accueil)
        $affectation = Affectation::where('id', $validated['affectation_id'])
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->whereDate('starts_on', '<=', $today)
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $today))
            ->firstOrFail();

        $visit = $user->company->visits()->create([
            'site_id'            => $affectation->site_id,
            'user_id'            => $user->id,
            'affectation_id'     => $affectation->id,
            'checked_in_at'      => now(),
            'checkin_latitude'   => $validated['latitude'] ?? null,
            'checkin_longitude'  => $validated['longitude'] ?? null,
            // Distance au site, pour signaler au responsable un pointage fait ailleurs
            'checkin_distance_m' => isset($validated['latitude'], $validated['longitude'])
                ? $affectation->site->distanceTo((float) $validated['latitude'], (float) $validated['longitude'])
                : null,
            'status'             => 'in_progress',
        ]);

        // Créer le rapport journalier en brouillon + snapshot des stocks d'ouverture
        $report = DailyReport::create([
            'company_id'  => $user->company_id,
            'site_id'     => $affectation->site_id,
            'user_id'     => $user->id,
            'visit_id'    => $visit->id,
            // Les ventes d'un événement sont retrouvées par ce lien
            'event_id'    => $affectation->event_id,
            'report_date' => $today,
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

        return redirect()->route('terrain.report.show', $visit)
            ->with('success', 'Prise de service enregistrée.');
    }

    /** Check-out : fin de service. */
    public function checkout(Request $request, Visit $visit): RedirectResponse
    {
        abort_if($visit->user_id !== $request->user()->id, 403);
        abort_if($visit->status->value !== 'in_progress', 422);

        $validated = $request->validate([
            'latitude'  => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
        ]);

        $visit->checkout(
            at: now(),
            latitude: $validated['latitude'] ?? null,
            longitude: $validated['longitude'] ?? null,
        );

        return redirect()->route('terrain.home')
            ->with('success', 'Fin de service enregistrée. Bonne soirée !');
    }
}
