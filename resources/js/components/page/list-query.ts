import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

type QueryValue = string | number | boolean | null | undefined;

/** Changement de filtres : `null` remet un filtre à sa valeur par défaut (retiré de l'URL). */
type Patch<F> = { [K in keyof F]?: F[K] | null } & { q?: string | null };

/**
 * Filtres d'une liste paginée côté serveur, gardés dans l'URL : un lien partagé, un retour
 * arrière ou un rechargement rouvrent la même vue. Changer un filtre repart de la page 1
 * (le numéro de page n'est pas repris) ; la recherche part 300 ms après la dernière frappe.
 *
 * Les valeurs nulles, vides ou `false` sont retirées de l'URL : la page passe `null`
 * pour la valeur par défaut d'un filtre.
 */
export function useListQuery<F extends Record<string, QueryValue>>(
    url: string,
    filters: F & { q?: string },
) {
    const [search, setSearch] = useState(filters.q ?? '');
    // Dernière recherche envoyée : évite une seconde visite quand la saisie est vidée par « Réinitialiser »
    const sent = useRef((filters.q ?? '').trim());

    const apply = (next: Patch<F>) => {
        const merged: Record<string, QueryValue> = {
            ...filters,
            q: search.trim(),
            ...next,
        };
        sent.current = String(merged.q ?? '').trim();

        router.get(
            url,
            Object.fromEntries(
                Object.entries(merged)
                    .filter(([, v]) => v !== null && v !== undefined)
                    .filter(([, v]) => v !== '' && v !== false)
                    .map(([k, v]) => [k, v === true ? 1 : v]),
            ) as Record<string, string | number>,
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    useEffect(() => {
        const term = search.trim();
        if (term === sent.current) return;

        const timer = setTimeout(() => apply({ q: term } as Patch<F>), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    /** Remet tous les filtres à leur valeur par défaut, recherche comprise. */
    const reset = (defaults: Patch<F>) => {
        setSearch('');
        apply({ ...defaults, q: '' });
    };

    return { search, setSearch, apply, reset };
}
