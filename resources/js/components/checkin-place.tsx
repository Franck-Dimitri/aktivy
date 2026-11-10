import { ExternalLink, MapPin, MapPinCheck, MapPinOff, MapPinX } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Lieu de la prise de service, tel que décrit par App\Support\CheckinPlace::describe(). */
export type CheckinPlace = {
    state: 'on_site' | 'other_site' | 'off_site' | 'unchecked' | 'unknown';
    label: string;
    short: string;
    distance_m: number | null;
    accuracy_m: number | null;
    other_site: string | null;
    map_url: string | null;
};

const TONE: Record<CheckinPlace['state'], { icon: typeof MapPin; text: string }> = {
    on_site: { icon: MapPinCheck, text: 'text-motriks-deep dark:text-green-400' },
    other_site: { icon: MapPinX, text: 'text-amber-700 dark:text-amber-400' },
    off_site: { icon: MapPinX, text: 'text-amber-700 dark:text-amber-400' },
    unchecked: { icon: MapPin, text: 'text-slate-500' },
    unknown: { icon: MapPinOff, text: 'text-slate-500' },
};

/** Le pointage n'a pas été fait sur son point de vente : à vérifier par le responsable. */
export const isElsewhere = (place: CheckinPlace | null | undefined) => place?.state === 'off_site' || place?.state === 'other_site';

/** « précision 12 m » : en dessous de 50 m inutile de le dire, au-delà le responsable doit le savoir. */
function accuracyText(accuracy: number | null): string | null {
    if (accuracy === null || accuracy <= 50) return null;

    return accuracy >= 1000 ? `GPS précis à ${(accuracy / 1000).toFixed(1).replace('.', ',')} km près` : `GPS précis à ${accuracy} m près`;
}

/**
 * Une ligne : où elle a pointé, avec la précision du GPS si elle est faible, et un lien
 * vers la position exacte sur la carte.
 */
export function CheckinPlaceLine({ place, className }: { place: CheckinPlace; className?: string }) {
    const { icon: Icon, text } = TONE[place.state];
    const accuracy = accuracyText(place.accuracy_m);

    return (
        <span className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-0.5', className)}>
            <span className={cn('inline-flex items-center gap-1 font-medium', text)}>
                <Icon className="size-3.5 shrink-0" />
                {place.label}
            </span>
            {accuracy && <span className="text-slate-400">· {accuracy}</span>}
            {place.map_url && (
                <a
                    href={place.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-slate-600 underline-offset-2 hover:text-ink hover:underline dark:text-slate-300"
                >
                    Voir sur la carte
                    <ExternalLink className="size-3" />
                </a>
            )}
        </span>
    );
}
