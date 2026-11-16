import { compactAmount, parseISODate } from '@/lib/format';

// Nombres et montants : formatage commun à toute l'application (lib/format.ts)
export { currencyLabel, money, number } from '@/lib/format';

/** Montant court pour les axes : 1,2 M, 350 k. */
export const compactMoney = compactAmount;

export const day = (iso: string) =>
    parseISODate(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
    });

export const monthName = (iso: string, style: 'long' | 'short' = 'long') => {
    const label = parseISODate(iso).toLocaleDateString('fr-FR', {
        month: style,
        year: style === 'long' ? 'numeric' : '2-digit',
    });

    return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Libellé d'un point de courbe selon son pas. */
export const bucketLabel = (iso: string, granularity: string) => {
    if (granularity === 'month') return monthName(iso, 'short');
    if (granularity === 'week') return `Sem. du ${day(iso)}`;

    return day(iso);
};

/** Variation en %, ou null si la base est nulle (pas de comparaison possible). */
export const variation = (current: number, previous: number): number | null =>
    previous > 0 ? ((current - previous) / previous) * 100 : null;

export const signedPercent = (v: number) =>
    `${v > 0 ? '+' : ''}${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v)} %`;
