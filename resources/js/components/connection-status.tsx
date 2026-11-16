import { usePage } from '@inertiajs/react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkConnection, useConnection } from '@/lib/connection';
import { outboxAvailable } from '@/lib/outbox';
import { cn } from '@/lib/utils';

/** Combien de temps reste affiché « Connexion rétablie ». */
const RESTORED_MS = 3500;

/** « 14:32 », ou « 12 nov. à 14:32 » si les données datent d'un autre jour. */
function dataTime(timestamp: number): string {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    });
    if (date.toDateString() === new Date().toDateString()) return time;

    return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${time}`;
}

/**
 * Pastille de l'en-tête, toujours visible (même en bas d'une longue page) tant que la connexion manque.
 * Tous les rôles : l'hôtesse aussi voit d'un coup d'œil qu'elle travaille hors ligne.
 */
export function ConnectionPill() {
    const { status } = useConnection();
    if (status === 'online') return null;

    const offline = status === 'offline';

    return (
        <span
            role="status"
            className={cn(
                'inline-flex animate-in items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 duration-200 zoom-in-95 fade-in',
                offline
                    ? 'bg-slate-100 text-slate-700 ring-slate-200'
                    : 'bg-amber-50 text-amber-800 ring-amber-200',
            )}
        >
            <WifiOff className="size-3.5" />
            {offline ? 'Hors ligne' : 'Réseau faible'}
        </span>
    );
}

/**
 * Bannière de connexion des responsables (gérant, superviseur, comptable, administrateur).
 *
 * Leurs écrans ne sont jamais gardés sur le téléphone : les données d'une équipe entière n'ont pas
 * à y rester. Sans réseau, la page affichée reste lisible et la bannière dit clairement que la personne
 * n'est pas connectée, et de quand datent les chiffres. Au retour du réseau, la page se met à jour
 * toute seule et « Connexion rétablie » s'affiche un instant.
 * L'hôtesse a sa propre bannière (offline-sync.tsx), avec son travail hors ligne.
 */
export function ConnectionStatus() {
    const { auth } = usePage().props;
    const { status, updatedAt, restoredAt } = useConnection();
    const [checking, setChecking] = useState(false);
    const [showRestored, setShowRestored] = useState(false);
    const isAgent = auth.user?.role === 'field_agent' && outboxAvailable();

    useEffect(() => {
        if (!restoredAt || Date.now() - restoredAt > RESTORED_MS) return;
        setShowRestored(true);
        const timer = window.setTimeout(
            () => setShowRestored(false),
            RESTORED_MS,
        );

        return () => window.clearTimeout(timer);
    }, [restoredAt]);

    if (isAgent) return null;

    if (status === 'online') {
        if (!showRestored) return null;

        return (
            <div
                role="status"
                aria-live="polite"
                className="mx-4 mt-4 flex animate-in items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 duration-300 fade-in slide-in-from-top-2 md:mx-6"
            >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-green-700 shadow-sm">
                    <Wifi className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">Connexion rétablie</p>
                    <p className="text-xs opacity-80">La page est à jour.</p>
                </div>
            </div>
        );
    }

    const offline = status === 'offline';

    const retry = async () => {
        setChecking(true);
        try {
            await checkConnection();
        } finally {
            setChecking(false);
        }
    };

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'mx-4 mt-4 flex animate-in items-center gap-3 rounded-2xl border px-4 py-3 text-sm duration-300 fade-in slide-in-from-top-2 md:mx-6',
                offline
                    ? 'border-slate-200 bg-slate-50 text-slate-800'
                    : 'border-amber-200 bg-amber-50 text-amber-900',
            )}
        >
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                <WifiOff className="size-4" />
                {/* Point qui pulse : l'application guette le retour du réseau */}
                <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 flex size-2.5"
                >
                    <span
                        className={cn(
                            'absolute inline-flex size-full animate-ping rounded-full opacity-60',
                            offline ? 'bg-slate-400' : 'bg-amber-400',
                        )}
                    />
                    <span
                        className={cn(
                            'relative inline-flex size-2.5 rounded-full ring-2 ring-white',
                            offline ? 'bg-slate-500' : 'bg-amber-500',
                        )}
                    />
                </span>
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-semibold">
                    {offline
                        ? 'Vous n’êtes pas connecté'
                        : 'Connexion trop faible'}
                </p>
                <p className="text-xs opacity-80">
                    Données de {dataTime(updatedAt)} · mises à jour au retour du
                    réseau.
                </p>
            </div>
            <button
                type="button"
                onClick={() => void retry()}
                disabled={checking}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-current/20 bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/70 disabled:opacity-60"
            >
                <RefreshCw
                    className={cn('size-3.5', checking && 'animate-spin')}
                />
                <span className="max-sm:sr-only">Réessayer</span>
            </button>
        </div>
    );
}
