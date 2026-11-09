import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { setupFlashToasts } from '@/hooks/use-flash-toast';
import { setupDownloads } from '@/lib/download';
import { setupLiveRefresh } from '@/lib/live-refresh';
import { setupOffline } from '@/lib/offline';
import { setupInstallCapture } from '@/lib/pwa';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

// Nom de la marque, fixe (indépendant du .env)
const appName = 'Motriks';

// Pages publiques affichées sans le layout de l'application
const PUBLIC_PAGES = ['welcome', 'landing', 'contact'];

// Dossiers de pages publiques (ex. legal/conditions, legal/confidentialite)
const PUBLIC_PREFIXES = ['legal/'];

const isPublicPage = (name: string) => PUBLIC_PAGES.includes(name) || PUBLIC_PREFIXES.some((prefix) => name.startsWith(prefix));

/*
 * Nouvelle version déployée pendant que la page était ouverte : les fichiers de l'ancienne version
 * n'existent plus, et un écran chargé à la demande (aperçu PDF…) échouerait. On recharge en silence
 * pour passer sur la nouvelle version ; une seule fois par minute, pour ne jamais boucler.
 */
// Navigateur seulement : ce fichier est aussi chargé par le rendu serveur (SSR), où window n'existe pas
if (typeof window !== 'undefined') {
    window.addEventListener('vite:preloadError', (event) => {
        const key = 'motriks:rechargement-version';
        try {
            if (Date.now() - Number(window.sessionStorage.getItem(key) ?? 0) < 60_000) {
                return; // Déjà rechargé à l'instant : l'erreur vient d'ailleurs, on la laisse remonter
            }
            window.sessionStorage.setItem(key, String(Date.now()));
        } catch {
            // Stockage indisponible : on recharge quand même, une boucle reste impossible sans erreur répétée
        }
        event.preventDefault();
        window.location.reload();
    });
}

// Avant Inertia : le toast du premier chargement (connexion, lien d'e-mail…) ne doit pas être manqué
setupFlashToasts();
// Android : l'invitation à installer n'est envoyée qu'une fois, elle est mise de côté dès le démarrage
setupInstallCapture();
// Application installée : factures, exports et PDF téléchargés sans quitter l'application
setupDownloads();
// Écran à jour tout seul : nouvelle notification ou changement qui concerne l'utilisateur
setupLiveRefresh();

void createInertiaApp({
    title: (title) => (title ? title : appName),
    layout: (name) => {
        switch (true) {
            case isPublicPage(name):
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('terrain/'):
                return AppLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#039855',
    },
});

// Espace hôtesse disponible sans réseau
setupOffline();

// This will set light / dark mode on load...
initializeTheme();