/**
 * Initiales d'un nom, à partir des deux premiers mots : « Awa Mbarga Ngono » → « AM ».
 * Résiste aux espaces multiples et aux lettres accentuées ; « ? » si le nom est vide.
 */
export function initials(name: string | null | undefined, fallback = '?'): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    return (
        words
            .slice(0, 2)
            .map((w) => Array.from(w)[0])
            .join('')
            .toUpperCase() || fallback
    );
}
