<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use App\Models\Visit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DailyReportController extends Controller
{
    /** Afficher le rapport (saisie brouillon ou lecture seule si soumis). */
    public function show(Request $request, Visit $visit): Response
    {
        abort_if($visit->user_id !== $request->user()->id, 403);

        $report = $visit->dailyReport()->with('lines')->firstOrFail();

        return Inertia::render('terrain/report', [
            'visit' => [
                'id'            => $visit->id,
                'checked_in_at' => $visit->checked_in_at->format('H:i'),
                'checked_out_at' => $visit->checked_out_at?->format('H:i'),
                'status'        => $visit->status->value,
            ],
            'report' => [
                'id'              => $report->id,
                'status'          => $report->status,
                'report_date'     => $report->report_date->translatedFormat('l d MMMM Y'),
                'site_name'       => $visit->site->name,
                'notes'           => $report->notes,
                'incident_notes'  => $report->incident_notes,
                'submitted_at'    => $report->submitted_at?->format('H:i'),
                'total_revenue'   => $report->totalRevenue(),
                'total_units_sold' => $report->totalUnitsSold(),
                'lines' => $report->lines->map(fn ($l) => [
                    'id'            => $l->id,
                    'product_name'  => $l->product_name,
                    'unit'          => $l->unit,
                    'unit_price'    => $l->unit_price,
                    'opening_stock' => $l->opening_stock,
                    'units_sold'    => $l->units_sold,
                    'closing_stock' => $l->closing_stock,
                    'revenue'       => $l->revenue,
                    'notes'         => $l->notes,
                ]),
            ],
        ]);
    }

    /** Sauvegarder le brouillon (quantités vendues). */
    public function update(Request $request, Visit $visit): RedirectResponse
    {
        abort_if($visit->user_id !== $request->user()->id, 403);

        $report = $visit->dailyReport()->firstOrFail();
        abort_if($report->isSubmitted(), 422, 'Ce rapport a déjà été soumis.');

        $validated = $request->validate([
            'notes'  => ['nullable', 'string', 'max:2000'],
            'lines'  => ['required', 'array'],
            'lines.*.id'          => ['required', 'integer'],
            'lines.*.units_sold'  => ['required', 'integer', 'min:0'],
            'lines.*.notes'       => ['nullable', 'string', 'max:500'],
        ]);

        $report->update(['notes' => $validated['notes'] ?? null]);

        foreach ($validated['lines'] as $lineData) {
            $line = $report->lines()->findOrFail($lineData['id']);
            $sold = (int) $lineData['units_sold'];

            $line->update([
                'units_sold'    => $sold,
                'closing_stock' => max(0, $line->opening_stock - $sold),
                'revenue'       => round($sold * $line->unit_price, 2),
                'notes'         => $lineData['notes'] ?? null,
            ]);
        }

        return back()->with('success', 'Brouillon sauvegardé.');
    }

    /** Soumettre le rapport définitivement. */
    public function submit(Request $request, Visit $visit): RedirectResponse
    {
        abort_if($visit->user_id !== $request->user()->id, 403);

        $report = $visit->dailyReport()->with('lines.siteProduct')->firstOrFail();
        abort_if($report->isSubmitted(), 422, 'Ce rapport a déjà été soumis.');

        $validated = $request->validate([
            'notes'          => ['nullable', 'string', 'max:2000'],
            'incident_notes' => ['nullable', 'string', 'max:2000'],
            'lines'          => ['required', 'array'],
            'lines.*.id'          => ['required', 'integer'],
            'lines.*.units_sold'  => ['required', 'integer', 'min:0'],
            'lines.*.notes'       => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($report, $validated) {
            $report->update([
                'notes'          => $validated['notes'] ?? null,
                'incident_notes' => $validated['incident_notes'] ?? null,
            ]);

            foreach ($validated['lines'] as $lineData) {
                $line = $report->lines->firstWhere('id', $lineData['id']);
                if (! $line) {
                    continue;
                }

                $sold = (int) $lineData['units_sold'];
                $closing = max(0, $line->opening_stock - $sold);

                $line->update([
                    'units_sold'    => $sold,
                    'closing_stock' => $closing,
                    'revenue'       => round($sold * $line->unit_price, 2),
                    'notes'         => $lineData['notes'] ?? null,
                ]);

                // Mettre à jour le stock courant du site
                $line->siteProduct->update(['current_stock' => $closing]);
            }

            $report->update([
                'status'       => 'submitted',
                'submitted_at' => now(),
            ]);
        });

        return redirect()->route('terrain.home')
            ->with('success', 'Rapport soumis avec succès. Bonne fin de journée !');
    }

    /** Ajouter un signalement après soumission. */
    public function flag(Request $request, Visit $visit): RedirectResponse
    {
        abort_if($visit->user_id !== $request->user()->id, 403);

        $report = $visit->dailyReport()->firstOrFail();
        abort_unless($report->isSubmitted(), 422);

        $validated = $request->validate([
            'incident_notes' => ['required', 'string', 'max:2000'],
        ]);

        $report->update(['incident_notes' => $validated['incident_notes']]);

        return back()->with('success', 'Signalement enregistré.');
    }
}
