/** Dates d'un événement (« AAAA-MM-JJ ») : affichage court, durée et repère dans le temps. */

const DAY = 86_400_000;

export const parseDay = (iso: string) => new Date(`${iso}T00:00:00`);

function today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

/** « 5 – 30 nov. 2026 », « 28 nov. – 3 déc. 2026 », « 5 nov. 2026 » */
export function dateRange(startIso: string, endIso: string): string {
    const a = parseDay(startIso);
    const b = parseDay(endIso);
    const full = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

    if (a.getTime() === b.getTime()) return full(a);
    if (a.getFullYear() !== b.getFullYear()) return `${full(a)} – ${full(b)}`;
    const left = a.getMonth() === b.getMonth() ? String(a.getDate()) : a.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    return `${left} – ${full(b)}`;
}

export function totalDays(startIso: string, endIso: string): number {
    return Math.max(1, Math.round((parseDay(endIso).getTime() - parseDay(startIso).getTime()) / DAY) + 1);
}

/** « Commence dans 3 jours », « Jour 4 sur 26 », « Terminé il y a 2 jours » */
export function timingLabel(startIso: string, endIso: string): string {
    const now = today().getTime();
    const untilStart = Math.round((parseDay(startIso).getTime() - now) / DAY);
    const sinceEnd = Math.round((now - parseDay(endIso).getTime()) / DAY);

    if (untilStart > 1) return `Commence dans ${untilStart} jours`;
    if (untilStart === 1) return 'Commence demain';
    if (untilStart === 0) return 'Commence aujourd’hui';
    if (sinceEnd < 0) return `Jour ${Math.round((now - parseDay(startIso).getTime()) / DAY) + 1} sur ${totalDays(startIso, endIso)}`;
    if (sinceEnd === 0) return 'Dernier jour';
    return sinceEnd === 1 ? 'Terminé hier' : `Terminé il y a ${sinceEnd} jours`;
}
