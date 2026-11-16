/**
 * Formatage partagé de toute l'application : montants, durées et dates, toujours en français.
 * Une seule source pour que « 125 000 FCFA », « 1,5 M » ou « 2 h 05 » s'écrivent pareil partout.
 */

const frenchNumber = new Intl.NumberFormat('fr-FR');
const frenchCompact = new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

/**
 * Intl sépare les milliers par l'espace fine insécable (U+202F), que toutes les graisses de Montserrat
 * ne dessinent pas : « 42500 » au lieu de « 42 500 ». On la remplace par l'espace insécable (U+00A0),
 * qui garde le nombre d'un seul tenant sans dépendre de la police.
 */
const keepTogether = (text: string) => text.replace(/\u202f/g, '\u00a0');

/** « 42 500 », « 3,5 » : nombre au format français. */
export const formatNumber = (value: number | bigint) =>
    keepTogether(frenchNumber.format(value));

/** Même chose, sous la forme `number.format(…)` d'Intl, pour les écrans qui l'utilisaient déjà. */
export const number = { format: formatNumber };

/** Franc CFA (BEAC « XAF » ou BCEAO « XOF ») : affiché « FCFA », comme sur le terrain. */
export const currencyLabel = (currency: string) =>
    currency === 'XAF' || currency === 'XOF' ? 'FCFA' : currency;

/** « 125 000 » : montant arrondi au franc, sans devise (la devise est souvent stylée à part). */
export const formatAmount = (n: number | string) =>
    formatNumber(Math.round(Number(n)));

/** « 125 000 FCFA » : espace insécable, le montant ne se coupe jamais de sa devise. */
export const money = (n: number | string, currency = 'XAF') =>
    `${formatAmount(n)} ${currencyLabel(currency)}`;

/** Montant court pour les tuiles et les axes : « 999 », « 250 k », « 1,5 M » (virgule française). */
export const compactAmount = (n: number) =>
    keepTogether(frenchCompact.format(n));

/**
 * Durée en minutes : « 42 min », « 2 h », « 2 h 05 ».
 * `empty` est affiché quand il n'y a pas de durée (null), et aussi pour 0 si `zeroIsEmpty`.
 */
export function formatDuration(
    minutes: number | null | undefined,
    {
        empty = '—',
        zeroIsEmpty = false,
    }: { empty?: string; zeroIsEmpty?: boolean } = {},
): string {
    if (
        minutes === null ||
        minutes === undefined ||
        (zeroIsEmpty && minutes === 0)
    ) {
        return empty;
    }

    const total = Math.round(minutes);
    if (total < 60) {
        return `${total} min`;
    }

    const h = Math.floor(total / 60);
    const m = total % 60;

    return m > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/* ─────────────────────── Dates ─────────────────────── */

/** Date du jour (ou de `d`) en AAAA-MM-JJ selon l'heure locale. toISOString donnerait la date UTC :
 *  au Cameroun (UTC+1), entre minuit et 1 h, ce serait encore la veille. */
export function localISODate(d: Date = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** « 2025-06-14 » (ou un horodatage complet) → minuit local de ce jour-là, sans décalage de fuseau. */
export const parseISODate = (iso: string) =>
    new Date(`${iso.slice(0, 10)}T00:00:00`);

/** Jour au format français, options d'Intl au choix (par défaut « 14 juin 2025 »). */
export const formatDate = (
    iso: string,
    options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    },
) => parseISODate(iso).toLocaleDateString('fr-FR', options);

/** « 14 juin » */
export const formatShortDate = (iso: string) =>
    formatDate(iso, { day: 'numeric', month: 'short' });

/** « 14/06/2025 » */
export const formatNumericDate = (iso: string) =>
    formatDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
