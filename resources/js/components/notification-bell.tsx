import { Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Bell, BellRing, CheckCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { kindStyle, type NotificationItem } from '@/lib/notification-kinds';
import { cn } from '@/lib/utils';
import { index as notificationsIndex, open as notificationOpen, readAll, recent } from '@/routes/notifications';

const OPEN_DELAY = 120;
const CLOSE_DELAY = 220;
const STALE_MS = 30_000;

/**
 * Cloche de l'en-tête : au survol (ou au clic sur mobile), un panneau flottant montre
 * les dernières notifications, chargées à la demande. « Tout voir » mène à la page complète.
 */
export function NotificationBell() {
    const { auth } = usePage().props;
    const unreadProp = auth.unreadNotifications;

    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[] | null>(null);
    const [unread, setUnread] = useState(unreadProp);
    const [loading, setLoading] = useState(false);

    const root = useRef<HTMLDivElement>(null);
    const timer = useRef<number | undefined>(undefined);
    const loadedAt = useRef(0);
    const pointer = useRef<string>('mouse');

    useEffect(() => setUnread(unreadProp), [unreadProp]);

    // Les données en cache ne valent plus si le nombre de non lues a changé (autre page, ou mise à jour
    // en arrière-plan) : panneau ouvert, la nouvelle notification y apparaît tout de suite
    useEffect(() => {
        loadedAt.current = 0;
        if (open) void load();
    }, [unreadProp]);

    const load = useCallback(async () => {
        if (Date.now() - loadedAt.current < STALE_MS) return;
        setLoading(true);
        try {
            const res = await fetch(recent().url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
            if (!res.ok) throw new Error(String(res.status));
            const json = (await res.json()) as { unread: number; notifications: NotificationItem[] };
            setItems(json.notifications);
            setUnread(json.unread);
            loadedAt.current = Date.now();
        } catch {
            // Hors ligne ou session expirée : on garde l'aperçu précédent
            setItems((prev) => prev ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    const show = useCallback(() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            setOpen(true);
            void load();
        }, OPEN_DELAY);
    }, [load]);

    const hide = useCallback(() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
    }, []);

    // Fermeture : Échap, clic à l'extérieur, changement de page
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
        const off = router.on('start', () => setOpen(false));
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown);
            off();
        };
    }, [open]);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const markAll = () =>
        router.post(readAll().url, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
                setUnread(0);
            },
        });

    const badge = unread > 9 ? '9+' : String(unread);

    return (
        <div
            ref={root}
            className="relative"
            // Survol seulement à la souris : au doigt, le panneau s'ouvre et se ferme au toucher
            onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
            onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
        >
            <button
                type="button"
                onPointerDown={(e) => (pointer.current = e.pointerType)}
                onClick={() => {
                    window.clearTimeout(timer.current);
                    // À la souris, le survol a déjà ouvert l'aperçu : le clic mène à la page complète
                    if (open && pointer.current === 'mouse') {
                        router.visit(notificationsIndex().url);
                        return;
                    }
                    setOpen((o) => !o);
                    void load();
                }}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={unread > 0 ? `Notifications (${unread} non lues)` : 'Notifications'}
                className={cn(
                    'relative flex size-9 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-motriks/40 focus-visible:outline-none',
                    open ? 'bg-motriks-soft text-motriks-deep' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5',
                )}
            >
                {unread > 0 ? <BellRing className="size-[18px]" /> : <Bell className="size-[18px]" />}
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-white dark:ring-background">
                        {badge}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Dernières notifications"
                    className="fixed inset-x-3 top-[68px] z-50 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2.5 sm:w-[380px]"
                >
                    {/* Flèche */}
                    <span aria-hidden className="absolute -top-1.5 right-3 hidden size-3 rotate-45 rounded-[2px] border-t border-l border-slate-200/80 bg-white sm:block dark:border-sidebar-border dark:bg-card" />

                    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] animate-in fade-in slide-in-from-top-1 duration-150 dark:border-sidebar-border dark:bg-card">
                        <div aria-hidden className="h-0.5 bg-gradient-to-r from-motriks via-green-400 to-transparent" />

                        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-ink">Notifications</p>
                                {unread > 0 && <span className="rounded-full bg-motriks-soft px-2 py-0.5 text-[11px] font-semibold text-motriks-deep tabular-nums">{unread} non lue{unread > 1 ? 's' : ''}</span>}
                            </div>
                            {unread > 0 && (
                                <button type="button" onClick={markAll} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink dark:hover:bg-white/5">
                                    <CheckCheck className="size-3.5" />
                                    Tout lire
                                </button>
                            )}
                        </header>

                        <div className="max-h-[min(420px,60vh)] overflow-y-auto border-t border-slate-100 dark:border-sidebar-border">
                            {items === null && loading ? (
                                <ul aria-busy className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                    {[0, 1, 2].map((i) => (
                                        <li key={i} className="flex gap-3 px-4 py-3.5">
                                            <span className="size-8 shrink-0 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
                                            <div className="flex-1 space-y-2 pt-1">
                                                <span className="block h-2.5 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                                                <span className="block h-2 w-full animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : !items || items.length === 0 ? (
                                <div className="flex flex-col items-center px-6 py-10 text-center">
                                    <span className="flex size-11 items-center justify-center rounded-2xl bg-motriks-soft text-motriks-deep ring-8 ring-motriks-soft/40">
                                        <BellRing className="size-5" />
                                    </span>
                                    <p className="mt-4 text-sm font-semibold text-ink">Vous êtes à jour</p>
                                    <p className="mt-0.5 text-xs text-slate-500">Rien ne demande votre attention.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                    {items.map((n) => {
                                        const { icon: Icon, tile } = kindStyle(n.kind);
                                        return (
                                            <li key={n.id}>
                                                <Link
                                                    href={notificationOpen({ notification: n.id }).url}
                                                    className={cn(
                                                        'relative flex gap-3 px-4 py-3 transition-colors focus-visible:outline-none',
                                                        n.read ? 'hover:bg-slate-50 focus-visible:bg-slate-50 dark:hover:bg-white/[0.03]' : 'bg-motriks-soft/30 hover:bg-motriks-soft/60 focus-visible:bg-motriks-soft/60 dark:bg-motriks/[0.06]',
                                                    )}
                                                >
                                                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', tile, n.read && 'opacity-60')}>
                                                        <Icon className="size-4" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-baseline justify-between gap-2">
                                                            <p className={cn('truncate text-[13px]', n.read ? 'font-medium text-slate-600 dark:text-slate-300' : 'font-semibold text-ink')}>{n.title}</p>
                                                            <span className="shrink-0 text-[10px] text-slate-400">{n.date}</span>
                                                        </div>
                                                        <p className={cn('mt-0.5 line-clamp-2 text-xs leading-relaxed', n.read ? 'text-slate-400' : 'text-slate-500 dark:text-slate-300')}>{n.body}</p>
                                                    </div>
                                                    {!n.read && <span aria-label="Non lue" className="mt-1.5 size-2 shrink-0 rounded-full bg-motriks ring-4 ring-motriks/15" />}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <Link
                            href={notificationsIndex().url}
                            className="group flex items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-semibold text-motriks-deep transition-colors hover:bg-motriks-soft/60 dark:border-sidebar-border dark:bg-white/[0.02]"
                        >
                            Voir toutes les notifications
                            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
