<?php

namespace App\Enums;

enum EventPackType: string
{
    case GroupedDiscount = 'grouped_discount'; // bundle de produits à prix réduit
    case BuyGetFree      = 'buy_get_free';     // produit acheté → produit offert

    public function label(): string
    {
        return match ($this) {
            self::GroupedDiscount => 'Bundle prix réduit',
            self::BuyGetFree      => 'Produit acheté / offert',
        };
    }
}
