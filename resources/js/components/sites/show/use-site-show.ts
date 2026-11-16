import { useState } from 'react';
import { type TabKey } from '@/components/sites/show/types';
import { tabFromHash } from '@/components/sites/show/constants';

/** Onglet actif : repris de l’adresse (#equipe…) et gardé dans l’adresse, sans nouvelle entrée d’historique. */
export function useSiteTab() {
    const [tab, setTabState] = useState<TabKey>(tabFromHash);

    const setTab = (key: TabKey) => {
        setTabState(key);
        if (typeof window !== 'undefined') {
            window.history.replaceState(
                window.history.state,
                '',
                `${window.location.pathname}${window.location.search}#${key}`,
            );
        }
    };

    return [tab, setTab] as const;
}

/** Fenêtre « Modifier le site » et son paramètre d’adresse ?modifier. */
export function useEditSiteModal(readOnly: boolean) {
    // Ouvre directement le modal quand on arrive depuis l'icône « Modifier » de la liste (?modifier=1)
    const [editingSite, setEditingSite] = useState(
        () =>
            !readOnly &&
            typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).has('modifier'),
    );

    const closeEditSite = () => {
        setEditingSite(false);
        if (
            typeof window !== 'undefined' &&
            window.location.search.includes('modifier')
        ) {
            window.history.replaceState(
                window.history.state,
                '',
                `${window.location.pathname}${window.location.hash}`,
            );
        }
    };

    return { editingSite, setEditingSite, closeEditSite };
}
