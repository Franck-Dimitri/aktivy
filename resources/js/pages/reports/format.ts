export const number = new Intl.NumberFormat('fr-FR');

export const money = (n: number | string, currency: string) => `${number.format(Math.round(Number(n)))} ${currency}`;

/** Montant court pour les axes : 1,2 M, 350 k. */
export const compactMoney = (n: number) =>
    new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const date = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);

export const day = (iso: string) => date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export const monthName = (iso: string, style: 'long' | 'short' = 'long') => {
    const label = date(iso).toLocaleDateString('fr-FR', { month: style, year: style === 'long' ? 'numeric' : '2-digit' });

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
