import { useEffect, useState } from 'react';
import { type ExternalShop } from '@/components/terrain/external-sales-editor';

/* ─── Saisie gardée sur le téléphone ─── */

/** Saisie en cours, gardée sur le téléphone tant qu'elle n'est pas enregistrée sur le serveur. */
export type LocalDraft = {
    lines: { id: number; units_sold: number; notes: string | null }[];
    packs: Record<number, number>;
    notes: string;
    incident: string;
    counted?: Record<number, string>;
    reasons?: Record<number, string>;
    external?: ExternalShop[];
};

/** Par visite (identifiant public) : la même saisie, que le rapport soit ouvert avec ou sans réseau. */
const draftKey = (key: string | number) => `motriks:rapport:${key}`;

// Le stockage peut être indisponible (navigation privée, mémoire pleine) : la page fonctionne sans
export function readDraft(key: string | number): LocalDraft | null {
    try {
        const raw = window.localStorage.getItem(draftKey(key));

        return raw ? (JSON.parse(raw) as LocalDraft) : null;
    } catch {
        return null;
    }
}

export function writeDraft(key: string | number, draft: LocalDraft) {
    try {
        window.localStorage.setItem(draftKey(key), JSON.stringify(draft));
    } catch {
        // stockage indisponible : la saisie reste seulement à l'écran
    }
}

export function clearDraft(key: string | number) {
    try {
        window.localStorage.removeItem(draftKey(key));
    } catch {
        // rien à effacer
    }
}

/** En ligne ou non, d'après le navigateur. */
export function useOnline(): boolean {
    const [online, setOnline] = useState(() =>
        typeof navigator === 'undefined' ? true : navigator.onLine,
    );

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);

        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    return online;
}
