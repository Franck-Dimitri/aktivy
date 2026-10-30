<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use App\Models\DailyReportLine;
use App\Models\DailyReportPhoto;
use App\Models\StockMovement;
use App\Notifications\IncidentReported;
use App\Support\Notifications\Notify;
use App\Support\Reports\ReportSales;
use App\Support\Stock\StockLedger;
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

        $report = $visit->dailyReport()->with(['lines', 'lines.siteProduct.product:id,image'])->firstOrFail();

        // Si le rapport n'a pas encore de lignes (produits ajoutés après la prise de service),
        // on crée le snapshot maintenant à partir des produits actuels du site.
        if ($report->lines->isEmpty() && ! $report->isSubmitted()) {
            $siteProducts = $visit->site->siteProducts()
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

            $report->load('lines');
        }

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
                'validated'        => $report->isValidated(),
                'corrected'        => $report->corrected_at !== null,
                'packs'            => $this->packs($report),
                'photos'           => $report->photos()->oldest()->get()->map->toView(),
                'max_photos'       => DailyReportPhoto::MAX_PER_REPORT,
                'lines' => $report->lines->map(fn ($l) => [
                    'id'            => $l->id,
                    'product_name'  => $l->product_name,
                    'unit'          => $l->unit,
                    'unit_price'    => $l->unit_price,
                    'opening_stock' => $l->opening_stock,
                    // Saisie de l'hôtesse : la part vendue à l'unité ; les packs s'y ajoutent
                    'units_sold'    => $l->single_units,
                    'pack_units'    => $l->units_sold - $l->single_units,
                    'closing_stock' => $l->closing_stock,
                    'revenue'       => $l->revenue,
                    'notes'         => $l->notes,
                    'image_url'     => $l->siteProduct?->product?->image
                        ? asset('storage/' . $l->siteProduct->product->image)
                        : null,
                ]),
            ],
        ]);
    }

    /**
     * Packs de l'événement que l'hôtesse peut vendre, avec la quantité déjà saisie.
     *
     * @return array<int, array<string, mixed>>
     */
    private function packs(DailyReport $report): array
    {
        $sold = $report->packs()->pluck('quantity', 'event_pack_id');
        $names = $report->lines->mapWithKeys(fn ($l) => [$l->siteProduct?->product_id => $l->product_name]);
        $prices = $report->lines->mapWithKeys(fn ($l) => [$l->siteProduct?->product_id => $l]);

        return ReportSales::availablePacks($report)->map(fn ($pack) => [
            'id'       => $pack->id,
            'name'     => $pack->name,
            'value'    => ReportSales::packValue($pack, $prices),
            'quantity' => (int) ($sold[$pack->id] ?? 0),
            // Lignes du rapport consommées par un pack : pour plafonner la saisie au stock
            'items'    => $pack->lines->map(fn ($l) => [
                'line_id'  => $prices[$l->product_id]?->id,
                'name'     => $names[$l->product_id] ?? '',
                'quantity' => $l->quantity,
                'free'     => $l->role === 'free',
            ])->values(),
        ])->values()->all();
    }

    /** Sauvegarder le brouillon (quantités vendues). */
    public function update(Request $request, Visit $visit): RedirectResponse
    {
        abort_if($visit->user_id !== $request->user()->id, 403);

        $report = $visit->dailyReport()->firstOrFail();
        abort_if($report->isSubmitted(), 422, 'Ce rapport a déjà été soumis.');

        $validated = $this->validateSales($request);

        DB::transaction(function () use ($report, $validated) {
            $report->update(['notes' => $validated['notes'] ?? null]);
            $this->applySales($report, $validated);
        });

        return back()->with('success', 'Brouillon sauvegardé.');
    }

    /** Soumettre le rapport définitivement. */
    public function submit(Request $request, Visit $visit): RedirectResponse
    {
        abort_if($visit->user_id !== $request->user()->id, 403);

        $report = $visit->dailyReport()->firstOrFail();
        abort_if($report->isSubmitted(), 422, 'Ce rapport a déjà été soumis.');

        $validated = $this->validateSales($request, [
            'incident_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($report, $validated, $request) {
            $report->update([
                'notes'          => $validated['notes'] ?? null,
                'incident_notes' => $validated['incident_notes'] ?? null,
            ]);

            $this->applySales($report, $validated);

            // Les unités vendues (à l'unité et en packs) sortent du stock actuel du site
            foreach ($report->lines()->get() as $line) {
                StockLedger::move($line->site_product_id, -$line->units_sold, StockMovement::SALE, $request->user(), $report->id);
            }

            $report->update([
                'status'       => 'submitted',
                'submitted_at' => now(),
            ]);

            if (filled($report->incident_notes)) {
                $this->notifyIncident($report);
            }
        });

        return redirect()->route('terrain.home')
            ->with('success', 'Rapport soumis avec succès. Bonne fin de journée !');
    }

    /**
     * Prévient les responsables du site qu'un incident a été signalé.
     */
    private function notifyIncident(DailyReport $report): void
    {
        $report->loadMissing(['site:id,name', 'agent:id,name']);

        Notify::send(Notify::siteManagers($report->company_id, [$report->site_id]), new IncidentReported($report));
    }

    /**
     * Ventes saisies : unités vendues à l'unité par ligne et packs vendus.
     *
     * @param  array<string, mixed>  $extraRules
     * @return array<string, mixed>
     */
    private function validateSales(Request $request, array $extraRules = []): array
    {
        return $request->validate([
            'notes'               => ['nullable', 'string', 'max:2000'],
            'lines'               => ['required', 'array'],
            'lines.*.id'          => ['required', 'integer'],
            'lines.*.units_sold'  => ['required', 'integer', 'min:0'],
            'lines.*.notes'       => ['nullable', 'string', 'max:500'],
            'packs'               => ['nullable', 'array'],
            'packs.*.id'          => ['required', 'integer'],
            'packs.*.quantity'    => ['required', 'integer', 'min:0'],
            ...$extraRules,
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function applySales(DailyReport $report, array $validated): void
    {
        $lines = collect($validated['lines']);

        ReportSales::apply(
            $report,
            $lines->pluck('units_sold', 'id')->all(),
            collect($validated['packs'] ?? [])->pluck('quantity', 'id')->all(),
            $lines->mapWithKeys(fn ($l) => [$l['id'] => $l['notes'] ?? null])->all(),
        );
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
        $this->notifyIncident($report);

        return back()->with('success', 'Signalement enregistré.');
    }
}
