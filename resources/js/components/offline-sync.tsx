import { Link, router, usePage } from '@inertiajs/react';
import { CloudOff, CloudUpload, Loader2, LogIn, RefreshCw, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { login } from '@/routes';
import { outboxAvailable, type OutboxOperation } from '@/lib/outbox';
import { flush, KIND_LABEL, refreshPending, retryNow, setOnline, syncState, useSyncState } from '@/lib/sync';
import { adoptLegacyQueue } from '@/lib/terrain-offline';
import { cn } from '@/lib/utils';

/** « Prise de service, 2 photos, rapport » : ce qui attend, en clair. */
function summary(pending: OutboxOperation[]): string {
    const counts = new Map<string, number>();
    pending.forEach((op) => counts.set(op.kind, (counts.get(op.kind) ?? 0) + 1));

    return [...counts.entries()]
        .map(([kind, n], i) => {
            const label = KIND_LABEL[kind as OutboxOperation['kind']];
            const text = kind === 'photo' ? `${n} photo${n > 1 ? 's' : ''}` : label;

            return i === 0 ? text : text.toLowerCase();
        })
        .join(', ');
}

/**
 * Mode hors ligne de l'hôtesse : envoie la file d'attente dès que possible (au démarrage, au retour
 * du réseau, au retour dans l'application, puis régulièrement tant qu'il reste quelque chose), et
 * affiche où elle en est. Rien à faire de sa part, sauf se reconnecter si sa session a expiré.
 */
export function OfflineSync() {
    const { auth } = usePage().props;
    const userId = auth.user?.id;
    const isAgent = auth.user?.role === 'field_agent' && outboxAvailable();
    const sync = useSyncState();
    const debounce = useRef<number | null>(null);

    const run = useCallback(async () => {
        if (!userId || !navigator.onLine) return;

        const result = await flush(userId);
        if (!result) return;

        result.rejected.forEach((r) =>
            toast.error(`${KIND_LABEL[r.kind]} ${r.kind === 'submit' ? 'refusé' : 'refusée'}`, {
                description: `${r.siteName} : ${r.message}`,
                duration: 12_000,
            }),
        );

        if (result.sent.length > 0 && result.remaining === 0) {
            const n = result.sent.length;
            toast.success('Tout est envoyé', {
                description: `${n} action${n > 1 ? 's' : ''} faite${n > 1 ? 's' : ''} hors ligne ${n > 1 ? 'sont' : 'est'} bien arrivée${n > 1 ? 's' : ''}.`,
            });
            // L'écran passe sur les données du serveur (la saisie en cours reste à l'écran)
            if (window.location.pathname.startsWith('/terrain')) {
                router.reload({ preserveScroll: true } as never);
            }
        }
    }, [userId]);

    useEffect(() => {
        if (!isAgent || !userId) return;

        const soon = () => {
            if (debounce.current) window.clearTimeout(debounce.current);
            debounce.current = window.setTimeout(() => {
                void refreshPending(userId).then(() => run());
            }, 400);
        };
        const online = () => {
            setOnline(true);
            retryNow();
            soon();
        };
        const offline = () => setOnline(false);
        const visible = () => document.visibilityState === 'visible' && soon();

        setOnline(navigator.onLine);
        void adoptLegacyQueue(userId).then(soon);

        window.addEventListener('online', online);
        window.addEventListener('offline', offline);
        window.addEventListener('motriks:outbox', soon);
        document.addEventListener('visibilitychange', visible);
        // Réseau présent mais trop faible : nouvel essai régulier (espacé après chaque échec, cf. sync.ts)
        const timer = window.setInterval(() => {
            if (syncState().pending.length > 0 && !syncState().syncing) void run();
        }, 10_000);

        return () => {
            window.removeEventListener('online', online);
            window.removeEventListener('offline', offline);
            window.removeEventListener('motriks:outbox', soon);
            document.removeEventListener('visibilitychange', visible);
            window.clearInterval(timer);
            if (debounce.current) window.clearTimeout(debounce.current);
        };
    }, [isAgent, userId, run]);

    if (!isAgent) return null;

    const waiting = sync.pending.length;
    if (sync.online && waiting === 0) return null;

    const tone = !sync.online
        ? 'border-slate-200 bg-slate-50 text-slate-700'
        : sync.blocked
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-sky-200 bg-sky-50 text-sky-900';

    let icon = <CloudUpload className="size-4" />;
    let title: string;
    let detail = waiting > 0 ? `En attente : ${summary(sync.pending)}.` : 'Vos actions sont gardées sur ce téléphone.';
    let action: ReactNode = null;

    if (!sync.online) {
        icon = <WifiOff className="size-4" />;
        title = 'Hors ligne';
        detail = waiting > 0 ? `${summary(sync.pending)} : envoi automatique au retour du réseau.` : 'Vous pouvez travailler : tout sera envoyé au retour du réseau.';
    } else if (sync.blocked === 'auth') {
        icon = <LogIn className="size-4" />;
        title = 'Reconnectez-vous pour terminer l’envoi';
        action = (
            <Link href={login()} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                Se connecter
            </Link>
        );
    } else if (sync.syncing) {
        icon = <Loader2 className="size-4 animate-spin" />;
        title = `Envoi en cours · ${waiting} restant${waiting > 1 ? 's' : ''}`;
    } else {
        icon = sync.blocked ? <CloudOff className="size-4" /> : <CloudUpload className="size-4" />;
        title = sync.blocked ? 'Envoi interrompu' : 'Réseau trop faible · nouvel essai automatique';
        action = (
            <button
                type="button"
                onClick={() => {
                    retryNow();
                    void run();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-white/70"
            >
                <RefreshCw className="size-3.5" />
                Réessayer
            </button>
        );
    }

    return (
        <div role="status" aria-live="polite" className={cn('mx-4 mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm md:mx-6', tone)}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">{icon}</span>
            <div className="min-w-0 flex-1">
                <p className="font-semibold">{title}</p>
                <p className="text-xs opacity-80">{detail}</p>
            </div>
            {action}
        </div>
    );
}
