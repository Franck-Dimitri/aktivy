<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use App\Models\DailyReportLine;
use App\Models\DailyReportPhoto;
use App\Models\StockMovement;
use App\Notifications\IncidentReported;
use App\Notifications\LiveNotification;
use App\Support\Incident;
use App\Support\Targets\TargetReachedCheck;
use App\Support\Notifications\Notify;
use App\Support\Reports\ReportSales;
use App\Support\Stock\StockLedger;
use App\Models\Visit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
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

            $report->load(['lines', 'lines.siteProduct.product:id,image']);
        }

        $report->setRelation('visit', $visit);
        $restocked = ReportSales::restocked($report, $report->lines);

        return Inertia::render('terrain/report', [
            'visit' => [
                'id'             => $visit->id,
                'checked_in_at'  => $visit->checked_in_at->format('H:i'),
                'checked_out_at' => $visit->checked_out_at?->format('H:i'),
                'status'         => $visit->status->value,
            ],
            'report' => [
                'id'               => $report->id,
                'status'           => $report->status,
                'report_date'      => $report->report_date->locale('fr')->isoFormat('dddd D MMMM YYYY'),
                'site_name'        => $visit->site->name,
                'notes'            => $report->notes,
                'incident_notes'   => $report->incident_notes,
                'submitted_at'     => $report->submitted_at?->format('H:i'),
                'total_revenue'    => $report->totalRevenue(),
                'total_units_sold' => $report->totalUnitsSold(),
                'validated'        => $report->isValidated(),
                'corrected'        => $report->corrected_at !== null,
                'packs'            => $this->packs($report),
                'photos'           => $report->photos()->oldest()->get()->map->toView(),
                'max_photos'       => DailyReportPhoto::maxFor($report->company),
                'lines' => $report->lines->map(fn ($l) => [
                    'restocked'     => $restocked[$l->id] ?? 0,
                    'stock_gap'     => $l->stock_gap,
                    'gap_reason'    => $l->gap_reason,
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

        // Renvoi automatique après une coupure : la première tentative a pu aboutir sans que le téléphone le sache
        if ($report->isSubmitted() && $request->boolean('queued')) {
            return redirect()->route('terrain.home');
        }

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
            $counts = collect($validated['lines'])->keyBy('id');

            foreach ($report->lines()->get() as $line) {
                // Les unités vendues (à l'unité et en packs) sortent du stock actuel du site
                StockLedger::move($line->site_product_id, -$line->units_sold, StockMovement::SALE, $request->user(), $report->id);

                $this->recordClosingCount($report, $line, $counts->get($line->id, []), $request);
            }

            $report->update([
                'status'       => 'submitted',
                'submitted_at' => now(),
            ]);

            // « RAS », « aucun »… ne sont pas des incidents
            if (Incident::meaningful($report->incident_notes) !== null) {
                $this->notifyIncident($report);
            }
        });

        // Rapport envoyé : les responsables du site en sont prévenus ; objectif peut-être atteint
        $report->load(['agent', 'site:id,name', 'lines']);
        Notify::send(Notify::siteManagers($report->company_id, [$report->site_id]), LiveNotification::reportSubmitted($report));
        TargetReachedCheck::afterSubmit($report);

        return redirect()->route('terrain.home')
            ->with('success', 'Rapport soumis avec succès. Bonne fin de journée !');
    }

    /**
     * Clôture : le stock compté est comparé au stock théorique ; tout écart exige un motif
     * et passe dans le journal de stock.
     *
     * @param  array<string, mixed>  $count
     */
    private function recordClosingCount(DailyReport $report, DailyReportLine $line, array $count, Request $request): void
    {
        if (! isset($count['counted_stock'])) {
            return;
        }

        $gap = (int) $count['counted_stock'] - $line->closing_stock;

        if ($gap === 0) {
            return;
        }

        $reason = trim((string) ($count['gap_reason'] ?? ''));

        if ($reason === '') {
            throw ValidationException::withMessages([
                'lines' => "{$line->product_name} : indiquez le motif de l’écart de stock.",
            ]);
        }

        $line->update(['stock_gap' => $gap, 'gap_reason' => $reason, 'closing_stock' => (int) $count['counted_stock']]);
        StockLedger::move($line->site_product_id, $gap, StockMovement::CLOSING_GAP, $request->user(), $report->id, $reason);
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
            'lines.*.counted_stock' => ['nullable', 'integer', 'min:0'],
            'lines.*.gap_reason'  => ['nullable', 'string', 'max:300'],
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

        if (Incident::meaningful($report->incident_notes) !== null) {
            $this->notifyIncident($report);
        }

        return back()->with('success', 'Signalement enregistré.');
    }
}