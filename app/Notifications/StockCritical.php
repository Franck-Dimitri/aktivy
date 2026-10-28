<?php

namespace App\Notifications;

use App\Models\SiteProduct;

/**
 * Le stock d'un produit sur un site vient de passer sous son seuil critique.
 */
class StockCritical extends AppNotification
{
    private string $product;

    private string $site;

    private string $unit;

    public function __construct(SiteProduct $stock, private int $remaining, private int $threshold)
    {
        $this->product = $stock->product?->name ?? 'Un produit';
        $this->site = $stock->site?->name ?? 'un point de vente';
        $this->unit = $stock->product?->unit ?? 'unités';
    }

    public function kind(): string
    {
        return 'stock';
    }

    public function title(): string
    {
        return "Stock critique · {$this->product} ({$this->site})";
    }

    public function body(): string
    {
        return "Il reste {$this->remaining} {$this->unit} de {$this->product} à {$this->site} (seuil critique : {$this->threshold}). Prévoyez un réassort.";
    }

    protected function route(): array
    {
        return ['stock-alerts.index'];
    }
}
