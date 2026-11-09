import { toast } from 'sonner';
import { isIOS, isStandalone } from '@/lib/pwa';

/*
 * Téléchargements dans l'application installée (PWA).
 *
 * Dans une fenêtre sans barre d'adresse, suivre un lien vers un fichier ne marche pas bien :
 * sur iPhone, le PDF s'ouvre en plein écran sans bouton pour revenir, ou rien ne se passe ;
 * sur Android, la navigation passe par le service worker et le fichier peut ne jamais arriver.
 * On récupère donc le fichier nous-mêmes, puis :
 *  - iPhone / iPad : feuille de partage (Enregistrer dans Fichiers, WhatsApp, e-mail…) ;
 *  - ailleurs : téléchargement classique (lien `download` vers le fichier en mémoire).
 *
 * Il suffit de mettre l'attribut `download` sur un lien de même origine : setupDownloads() s'occupe
 * du reste. Dans un navigateur ordinaire, le lien garde son comportement natif.
 */

/** Nom du fichier annoncé par le serveur (Content-Disposition), sinon le nom de secours. */
function filenameFrom(response: Response, fallback: string): string {
    const header = response.headers.get('content-disposition') ?? '';
    const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)?.[1];
    if (encoded) {
        try {
            return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ''));
        } catch {
            // Encodage invalide : on essaie le nom simple
        }
    }

    return /filename\s*=\s*"?([^";]+)"?/i.exec(header)?.[1]?.trim() || fallback;
}

/** Enregistre un fichier déjà en mémoire (partage sur iPhone, téléchargement ailleurs). */
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });

    if (isIOS() && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: filename });

            return;
        } catch (error) {
            // Feuille de partage fermée par l'utilisateur : rien à faire
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
            // Partage refusé (geste trop ancien…) : on tente le téléchargement classique
        }
    }

    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

/** Récupère le fichier à cette adresse, puis l'enregistre. */
export async function downloadFile(url: string, fallbackName = 'document'): Promise<void> {
    const pending = toast.loading('Préparation du fichier…');

    try {
        const response = await fetch(url, { credentials: 'same-origin' });

        // Redirection = session expirée (page de connexion) ou fichier refusé
        if (response.redirected || !response.ok) {
            throw new Error(response.status === 404 ? 'Ce fichier est introuvable.' : 'Le fichier n’a pas pu être téléchargé.');
        }

        const type = response.headers.get('content-type') ?? '';
        if (type.includes('text/html')) {
            throw new Error('Votre session a expiré. Rechargez la page pour vous reconnecter.');
        }

        await saveBlob(await response.blob(), filenameFrom(response, fallbackName));
        toast.dismiss(pending);
    } catch (error) {
        toast.error(
            error instanceof TypeError ? 'Connexion impossible. Vérifiez votre réseau, puis réessayez.' : (error as Error).message || 'Le fichier n’a pas pu être téléchargé.',
            { id: pending },
        );
    }
}

/** À appeler une fois au démarrage : prend en charge les liens `download` dans l'application installée. */
export function setupDownloads(): void {
    if (typeof window === 'undefined') {
        return;
    }

    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !isStandalone()) {
            return;
        }

        const link = (event.target as Element | null)?.closest?.('a[download]');
        if (!(link instanceof HTMLAnchorElement) || !link.href || new URL(link.href).origin !== window.location.origin) {
            return;
        }

        event.preventDefault();
        void downloadFile(link.href, link.getAttribute('download') || 'document');
    });
}
