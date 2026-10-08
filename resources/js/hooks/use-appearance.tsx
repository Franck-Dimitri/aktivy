export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

/**
 * Aktivy is light-only (docs/CARTE_APP.md §4): the dark theme is disabled,
 * whatever the stored preference or the system setting.
 */
const applyLightTheme = (): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    // Drop any old dark / system preference so it never comes back.
    localStorage.removeItem('appearance');
    document.cookie = 'appearance=;path=/;max-age=0;SameSite=Lax';

    applyLightTheme();
}

export function useAppearance(): UseAppearanceReturn {
    return {
        appearance: 'light',
        resolvedAppearance: 'light',
        updateAppearance: applyLightTheme,
    } as const;
}
