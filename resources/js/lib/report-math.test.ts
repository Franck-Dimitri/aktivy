import { describe, expect, it } from 'vitest';
import {
    canAddPack,
    countedStock,
    filledLinesCount,
    hasStockGap,
    lineUnitsSold,
    missingGapReason,
    packUnitsByLine,
    remainingStock,
    stockGap,
    stockLeft,
    theoreticalStock,
    totalRevenue,
    totalUnitsSold,
    type PackLike,
    type PricedLine,
} from '@/lib/report-math';

/** Ligne de produit : 1 000 FCFA l'unité, 10 en stock, rien de vendu. */
function line(changes: Partial<PricedLine> = {}): PricedLine {
    return {
        id: 1,
        opening_stock: 10,
        restocked: 0,
        units_sold: 0,
        unit_price: 1000,
        ...changes,
    };
}

// Pack « Duo » à 2 500 FCFA : 2 unités du produit 1, 1 du produit 2, et 1 produit absent du point de vente (line_id null)
const duo: PackLike = {
    id: 7,
    value: 2500,
    items: [
        { line_id: 1, quantity: 2 },
        { line_id: 2, quantity: 1 },
        { line_id: null, quantity: 1 },
    ],
};

describe('unités consommées par les packs', () => {
    it('multiplie les packs vendus par la quantité de chaque produit', () => {
        expect(packUnitsByLine([duo], { 7: 3 })).toEqual({ 1: 6, 2: 3 });
    });

    it('additionne les packs qui partagent un produit', () => {
        const solo: PackLike = {
            id: 8,
            value: 1200,
            items: [{ line_id: 1, quantity: 1 }],
        };

        expect(packUnitsByLine([duo, solo], { 7: 2, 8: 5 })).toEqual({
            1: 9,
            2: 2,
        });
    });

    it('compte zéro pour un pack sans saisie, et ignore les produits absents du point de vente', () => {
        expect(packUnitsByLine([duo], {})).toEqual({ 1: 0, 2: 0 });
        expect(packUnitsByLine([], { 7: 4 })).toEqual({});
    });
});

describe('ventes et chiffre d’affaires', () => {
    const lines = [
        line({ id: 1, units_sold: 3, unit_price: 1000 }),
        line({ id: 2, units_sold: 0, unit_price: 500 }),
    ];

    it('additionne ventes à l’unité, packs et boutiques extérieures', () => {
        const packUnits = packUnitsByLine([duo], { 7: 2 });

        expect(lineUnitsSold(lines[0], packUnits)).toBe(7);
        expect(lineUnitsSold(lines[1], packUnits)).toBe(2);
        expect(totalUnitsSold(lines, packUnits)).toBe(9);
        expect(totalUnitsSold(lines, packUnits, 4)).toBe(13);
    });

    it('compte les packs à leur prix, pas au prix des produits qu’ils contiennent', () => {
        // 3 × 1 000 à l'unité + 2 packs × 2 500 + 1 500 en boutique extérieure
        expect(totalRevenue(lines, [duo], { 7: 2 })).toBe(8000);
        expect(totalRevenue(lines, [duo], { 7: 2 }, 1500)).toBe(9500);
    });

    it('vaut zéro sans aucune vente', () => {
        expect(totalRevenue([line()], [duo], {})).toBe(0);
        expect(totalUnitsSold([line()], {})).toBe(0);
    });

    it('compte les produits vendus, y compris ceux vendus seulement en pack', () => {
        expect(filledLinesCount(lines, {})).toBe(1);
        expect(filledLinesCount(lines, packUnitsByLine([duo], { 7: 1 }))).toBe(
            2,
        );
        expect(filledLinesCount([line(), line({ id: 2 })], {})).toBe(0);
    });
});

describe('stock théorique', () => {
    it('part du stock d’ouverture, ajoute les livraisons et retire ventes et packs', () => {
        const l = line({ opening_stock: 10, restocked: 5, units_sold: 4 });

        expect(theoreticalStock(l, {})).toBe(11);
        expect(theoreticalStock(l, { 1: 6 })).toBe(5);
    });

    it('ne descend jamais sous zéro, même si les ventes dépassent le stock', () => {
        const l = line({ opening_stock: 3, units_sold: 5 });

        expect(stockLeft(l, {})).toBe(-2);
        expect(theoreticalStock(l, {})).toBe(0);
    });

    it('vaut zéro pour un produit sans stock ni vente', () => {
        expect(theoreticalStock(line({ opening_stock: 0 }), {})).toBe(0);
    });

    it('additionne le stock restant de tous les produits', () => {
        const lines = [
            line({ id: 1, opening_stock: 10, units_sold: 4 }),
            line({ id: 2, opening_stock: 2, units_sold: 6 }),
        ];

        // 6 + 0 (le second, vendu au-delà de son stock, compte pour zéro)
        expect(remainingStock(lines, {})).toBe(6);
        expect(remainingStock(lines, { 1: 2 })).toBe(4);
        expect(remainingStock([], {})).toBe(0);
    });
});

describe('comptage à la clôture', () => {
    const l = line({ opening_stock: 10, units_sold: 4 }); // 6 attendus

    it('retient le stock théorique tant que le champ est vide ou jamais touché', () => {
        expect(countedStock(l, {}, {})).toBe(6);
        expect(countedStock(l, { 1: '' }, {})).toBe(6);
        expect(hasStockGap(l, {}, {})).toBe(false);
        expect(hasStockGap(l, { 1: '' }, {})).toBe(false);
        expect(stockGap(l, {}, {})).toBe(0);
    });

    it('retient le comptage saisi, même égal à zéro', () => {
        expect(countedStock(l, { 1: '0' }, {})).toBe(0);
        expect(hasStockGap(l, { 1: '0' }, {})).toBe(true);
    });

    it('ne voit pas d’écart quand le comptage tombe juste', () => {
        expect(hasStockGap(l, { 1: '6' }, {})).toBe(false);
        expect(stockGap(l, { 1: '6' }, {})).toBe(0);
    });

    it('signale un écart négatif quand il manque des unités', () => {
        expect(hasStockGap(l, { 1: '4' }, {})).toBe(true);
        expect(stockGap(l, { 1: '4' }, {})).toBe(-2);
    });

    it('signale un écart positif quand il reste plus que prévu', () => {
        expect(hasStockGap(l, { 1: '9' }, {})).toBe(true);
        expect(stockGap(l, { 1: '9' }, {})).toBe(3);
    });

    it('tient compte des packs dans le stock attendu', () => {
        // 6 attendus, moins 2 unités parties en packs : 4
        expect(hasStockGap(l, { 1: '4' }, { 1: 2 })).toBe(false);
    });

    it('compare au stock théorique ramené à zéro, pas au stock négatif', () => {
        const oversold = line({ opening_stock: 3, units_sold: 5 });

        expect(hasStockGap(oversold, { 1: '0' }, {})).toBe(false);
    });

    it('exige un motif pour chaque écart, les espaces seuls ne comptent pas', () => {
        const lines = [l, line({ id: 2, opening_stock: 5 })];

        expect(missingGapReason(lines, {}, {}, {})).toBe(false);
        expect(missingGapReason(lines, { 2: '3' }, {}, {})).toBe(true);
        expect(missingGapReason(lines, { 2: '3' }, { 2: '   ' }, {})).toBe(
            true,
        );
        expect(missingGapReason(lines, { 2: '3' }, { 2: 'Casse' }, {})).toBe(
            false,
        );
        // Un motif sur une autre ligne ne couvre pas l'écart
        expect(missingGapReason(lines, { 2: '3' }, { 1: 'Casse' }, {})).toBe(
            true,
        );
    });
});

describe('ajout d’un pack', () => {
    const lines = [
        line({ id: 1, opening_stock: 4 }),
        line({ id: 2, opening_stock: 1 }),
    ];
    const simple: PackLike = {
        id: 9,
        value: 2000,
        items: [
            { line_id: 1, quantity: 2 },
            { line_id: 2, quantity: 1 },
        ],
    };

    it('est possible tant que chaque produit a assez de stock', () => {
        expect(canAddPack(simple, lines, {})).toBe(true);
    });

    it('est refusé dès qu’un des produits manque', () => {
        expect(
            canAddPack(simple, lines, packUnitsByLine([simple], { 9: 1 })),
        ).toBe(false);
        expect(
            canAddPack(
                simple,
                [line({ id: 1, opening_stock: 4, units_sold: 3 }), lines[1]],
                {},
            ),
        ).toBe(false);
    });

    it('compte les livraisons du service dans le stock disponible', () => {
        const restocked = [
            lines[0],
            line({ id: 2, opening_stock: 1, restocked: 2 }),
        ];

        expect(
            canAddPack(simple, restocked, packUnitsByLine([simple], { 9: 1 })),
        ).toBe(true);
    });

    it('est refusé si un produit du pack n’est pas sur le point de vente', () => {
        expect(canAddPack(duo, lines, {})).toBe(false);
    });
});
