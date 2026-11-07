import { cn } from '@/lib/utils';

/**
 * Icône Motriks : le symbole (vague + point) sur une tuile blanche arrondie.
 * Décorative : le nom « Motriks » est toujours affiché à côté, ou dans une étiquette accessible.
 * La taille se règle avec className (ex. « size-8 ») ; l'arrondi peut être remplacé (ex. « rounded-full »).
 */
export default function MotriksMark({ className }: { className?: string }) {
    return (
        <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[24%] bg-white shadow-xs ring-1 ring-slate-900/5', className)}>
            <img src="/images/logos/motriks-mark.svg" alt="" draggable={false} className="w-[72%] select-none" />
        </span>
    );
}
