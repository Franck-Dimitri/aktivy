/**
 * Calculs du rapport de l'hôtesse (page « Rapport », resources/js/pages/terrain/report.tsx) :
 * unités prises par les packs, ventes, chiffre d'affaires, stock théorique et écarts de comptage.
 *
 * Fonctions pures, sans état : la page les appelle à chaque rendu avec sa saisie du moment.
 */

/** Ligne de produit, réduite à ce qu'il faut pour compter le stock. */
export type StockLine = {
    id: number;
    opening_stock: number;
    /** Unités livrées pendant le service : elles s'ajoutent au stock d'ouverture. */
    restocked: number;
    /** Unités vendues à l'unité ; les packs s'y ajoutent. */
    units_sold: number;
};

export type PricedLine = StockLine & { unit_price: number };

/** Pack de l'événement, réduit à son prix et aux produits qu'il consomme. */
export type PackLike = {
    id: number;
    value: number;
    items: { line_id: number | null; quantity: number }[];
};

/** Nombre de packs vendus, par pack. */
export type PackCounts = Record<number, number>;

/** Unités consommées par les packs, par ligne de produit. */
export type PackUnits = Record<number, number>;

/** Stock compté à la clôture, tel que saisi (texte du champ), par ligne. */
export type CountedStock = Record<number, string>;

/** Unités de chaque produit consommées par les packs saisis. */
export function packUnitsByLine(
    packs: PackLike[],
    packCounts: PackCounts,
): PackUnits {
    const units: PackUnits = {};
    for (const pack of packs) {
        for (const item of pack.items) {
            if (item.line_id !== null) {
                units[item.line_id] =
                    (units[item.line_id] ?? 0) +
                    (packCounts[pack.id] ?? 0) * item.quantity;
            }
        }
    }

    return units;
}

/** Unités vendues d'un produit : à l'unité et en packs. */
export function lineUnitsSold(line: StockLine, packUnits: PackUnits): number {
    return line.units_sold + (packUnits[line.id] ?? 0);
}

/** Total des unités vendues de la journée (boutiques extérieures comprises). */
export function totalUnitsSold(
    lines: StockLine[],
    packUnits: PackUnits,
    externalUnits = 0,
): number {
    return (
        lines.reduce((s, l) => s + lineUnitsSold(l, packUnits), 0) +
        externalUnits
    );
}

/** Chiffre d'affaires : ventes à l'unité, puis packs (à leur prix), puis boutiques extérieures. */
export function totalRevenue(
    lines: PricedLine[],
    packs: PackLike[],
    packCounts: PackCounts,
    externalRevenue = 0,
): number {
    return (
        lines.reduce((s, l) => s + l.units_sold * l.unit_price, 0) +
        packs.reduce((s, p) => s + (packCounts[p.id] ?? 0) * p.value, 0) +
        externalRevenue
    );
}

/** Nombre de produits avec au moins une vente (à l'unité ou en pack). */
export function filledLinesCount(
    lines: StockLine[],
    packUnits: PackUnits,
): number {
    return lines.filter((l) => lineUnitsSold(l, packUnits) > 0).length;
}

/** Stock encore disponible, sans plancher (négatif si les ventes dépassent le stock). */
export function stockLeft(line: StockLine, packUnits: PackUnits): number {
    return (
        line.opening_stock +
        line.restocked -
        line.units_sold -
        (packUnits[line.id] ?? 0)
    );
}

/** Stock théorique en fin de service : jamais en dessous de zéro. */
export function theoreticalStock(
    line: StockLine,
    packUnits: PackUnits,
): number {
    return Math.max(0, stockLeft(line, packUnits));
}

/** Stock retenu à la clôture : le comptage saisi, sinon (champ vide ou jamais touché) le stock théorique. */
export function countedStock(
    line: StockLine,
    counted: CountedStock,
    packUnits: PackUnits,
): number {
    const value = counted[line.id];

    return value === undefined || value === ''
        ? theoreticalStock(line, packUnits)
        : Number(value);
}

/** Écart de comptage : positif s'il reste plus que prévu, négatif s'il manque des unités. */
export function stockGap(
    line: StockLine,
    counted: CountedStock,
    packUnits: PackUnits,
): number {
    return (
        countedStock(line, counted, packUnits) -
        theoreticalStock(line, packUnits)
    );
}

/** Le comptage diffère-t-il du stock théorique ? */
export function hasStockGap(
    line: StockLine,
    counted: CountedStock,
    packUnits: PackUnits,
): boolean {
    return (
        countedStock(line, counted, packUnits) !==
        theoreticalStock(line, packUnits)
    );
}

/** Un écart sans motif (vide ou fait d'espaces) bloque l'envoi du rapport. */
export function missingGapReason(
    lines: StockLine[],
    counted: CountedStock,
    reasons: Record<number, string>,
    packUnits: PackUnits,
): boolean {
    return lines.some(
        (l) => hasStockGap(l, counted, packUnits) && !reasons[l.id]?.trim(),
    );
}

/** Stock théorique restant, tous produits confondus. */
export function remainingStock(
    lines: StockLine[],
    packUnits: PackUnits,
): number {
    return lines.reduce((s, l) => s + theoreticalStock(l, packUnits), 0);
}

/** Un pack de plus est possible si chacun de ses produits a encore assez de stock. */
export function canAddPack(
    pack: PackLike,
    lines: StockLine[],
    packUnits: PackUnits,
): boolean {
    return pack.items.every((item) => {
        const line = lines.find((l) => l.id === item.line_id);

        return (
            line !== undefined && stockLeft(line, packUnits) >= item.quantity
        );
    });
}
