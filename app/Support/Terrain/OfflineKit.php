<?php

namespace App\Support\Terrain;

use App\Models\Affectation;
use App\Models\DailyReportLine;
use App\Models\DailyReportPhoto;
use App\Models\EventPack;
use App\Models\User;
use App\Support\Reports\ExternalSales;
use App\Support\Reports\ReportSales;

/**
 * Trousse hors ligne de l'hôtesse : tout ce qu'il faut pour prendre son service et remplir son
 * rapport sans réseau (produits du point de vente, stock, prix, packs de l'événement).
 *
 * Elle arrive avec l'accueil de l'espace terrain, que le téléphone garde en mémoire. Le rapport
 * a la même forme que celui de la page « Rapport » ; ses lignes n'existent pas encore sur le
 * serveur, elles portent donc un numéro provisoire (négatif) et le produit du point de vente
 * (site_product_id), par lequel le serveur les retrouve à l'envoi.
 */
final class OfflineKit
{
    /**
     * @return array<string, mixed>
     */
    public static function for(Affectation $affectation, User $user): array
    {
        $site = $affectation->site;
        $siteProducts = $site->siteProducts()->with('product:id,name,unit,price,image')->get();

        // Lignes du futur rapport, comme les crée la prise de service
        $lines = $siteProducts->map(function ($sp) {
            $line = new DailyReportLine([
                'site_product_id' => $sp->id,
                'product_name' => $sp->product->name,
                'unit' => $sp->product->unit,
                'unit_price' => $sp->product->price ?? 0,
                'opening_stock' => $sp->current_stock,
            ]);
            $line->id = -$sp->id;
            $line->setRelation('siteProduct', $sp);

            return $line;
        });

        $byProduct = $lines->keyBy(fn (DailyReportLine $l) => $l->siteProduct->product_id);

        return [
            'affectation_id' => $affectation->id,
            'site_name' => $site->name,
            'starts_on' => $affectation->starts_on->toDateString(),
            'ends_on' => $affectation->ends_on?->toDateString(),
            'prepared_at' => now()->toIso8601String(),
            'report' => [
                'id' => 0,
                'status' => 'draft',
                'site_name' => $site->name,
                'notes' => null,
                'incident_notes' => null,
                'submitted_at' => null,
                'total_revenue' => 0,
                'total_units_sold' => 0,
                'validated' => false,
                'corrected' => false,
                'packs' => self::packs($affectation->event_id, $byProduct),
                'external_sales' => [],
                'external_products' => $lines
                    ->map(fn (DailyReportLine $l) => [
                        'id' => (int) $l->siteProduct->product_id,
                        'name' => $l->product_name,
                        'unit' => $l->unit,
                        'unit_price' => (float) $l->unit_price,
                    ])
                    ->unique('id')
                    ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                    ->values(),
                'external_shops' => ExternalSales::shopsUsedBy($user),
                'photos' => [],
                'max_photos' => DailyReportPhoto::maxFor($user->company),
                'lines' => $lines->map(fn (DailyReportLine $l) => [
                    'restocked' => 0,
                    'stock_gap' => null,
                    'gap_reason' => null,
                    'id' => $l->id,
                    'site_product_id' => $l->site_product_id,
                    'product_name' => $l->product_name,
                    'unit' => $l->unit,
                    'unit_price' => $l->unit_price,
                    'opening_stock' => $l->opening_stock,
                    'units_sold' => 0,
                    'pack_units' => 0,
                    'closing_stock' => $l->opening_stock,
                    'revenue' => 0,
                    'notes' => null,
                    'image_url' => $l->siteProduct->product->image ? asset('storage/'.$l->siteProduct->product->image) : null,
                ])->values(),
            ],
        ];
    }

    /**
     * Packs actifs de l'événement dont tous les produits sont vendus sur ce point de vente
     * (même règle que ReportSales::availablePacks).
     *
     * @param  \Illuminate\Support\Collection<int, DailyReportLine>  $byProduct  lignes par produit
     * @return list<array<string, mixed>>
     */
    private static function packs(?int $eventId, $byProduct): array
    {
        if (! $eventId) {
            return [];
        }

        return EventPack::where('event_id', $eventId)
            ->where('active', true)
            ->with('lines')
            ->orderBy('name')
            ->get()
            ->filter(fn (EventPack $pack) => $pack->lines->isNotEmpty()
                && $pack->lines->every(fn ($line) => $byProduct->has($line->product_id)))
            ->map(fn (EventPack $pack) => [
                'id' => $pack->id,
                'name' => $pack->name,
                'value' => ReportSales::packValue($pack, $byProduct),
                'quantity' => 0,
                'items' => $pack->lines->map(fn ($l) => [
                    'line_id' => $byProduct->get($l->product_id)?->id,
                    'name' => $byProduct->get($l->product_id)?->product_name ?? '',
                    'quantity' => $l->quantity,
                    'free' => $l->role === 'free',
                ])->values(),
            ])
            ->values()
            ->all();
    }
}
