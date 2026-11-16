import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { setupFlashToasts } from '@/hooks/use-flash-toast';
import { setupAppFeel } from '@/lib/app-feel';
import { setupBackButton } from '@/lib/back-button';
import { setupConnection } from '@/lib/connection';
import { setupDownloads } from '@/lib/download';
import { setupNetworkErrors } from '@/lib/network-errors';
import { setupLiveRefresh } from '@/lib/live-refresh';
import { setupOffline } from '@/lib/offline';
import { setupInstallCapture, setupLaunchQueue, setupPushSync } from '@/lib/pwa';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

// Nom de la marque, fixe (indépendant du .env)
const appName = 'Motriks';

// Pages publiques affichées sans le layout de l'application
// « error » : page d'erreur de Motriks, affichée seule (la session peut manquer)
const PUBLIC_PAGES = ['welcome', 'landing', 'contact', 'error'];

// Dossiers de pages publiques (ex. legal/conditions, legal/confidentialite)
const PUBLIC_PREFIXES = ['legal/'];

const isPublicPage = (name: string) =>
    PUBLIC_PAGES.includes(name) ||
    PUBLIC_PREFIXES.some((prefix) => name.startsWith(prefix));

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
            if (
                Date.now() - Number(window.sessionStorage.getItem(key) ?? 0) <
                60_000
            ) {
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
// Connexion suivie partout ; page ou envoi impossible faute de réseau : un message clair, pas un clic muet
setupConnection();
setupNetworkErrors();
// Android : le bouton Retour ferme d'abord la fenêtre ou le menu ouvert, comme dans une application
setupBackButton();
// Icône touchée alors que l'application est déjà ouverte : on la retrouve telle quelle (sauf raccourci)
setupLaunchQueue((url) => router.visit(url));
// Notifications push qui ne s'arrêtent pas : abonnement de l'appareil renvoyé au serveur s'il a changé ou disparu
const syncPushFor = setupPushSync();
router.on('navigate', (event) => {
    const props = event.detail.page.props as { auth?: { user?: { id: number } | null }; push?: { publicKey: string | null } };
    syncPushFor({ userId: props.auth?.user?.id ?? null, publicKey: props.push?.publicKey ?? null });
});
// Application installée sur téléphone : pas de menu du navigateur à l'appui long sur un bouton ou une image
setupAppFeel();

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
