import { Head, Link, router, usePage } from '@inertiajs/react';
import { BellRing, CheckCheck, ChevronRight, Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { PushDeviceCard } from '@/components/push-device-card';
import { kindStyle, NOTIFICATION_KINDS, type NotificationItem, type NotificationKind } from '@/lib/notification-kinds';
import { cn } from '@/lib/utils';
import { index as notificationsIndex, open as notificationOpen, readAll } from '@/routes/notifications';

type Kind = NotificationKind;
const KINDS = NOTIFICATION_KINDS;

/** Ce que chaque rôle reçoit, pour expliquer la cloche quand elle est vide. */
const KINDS_BY_ROLE: Record<string, Kind[]> = {
    super_admin: ['signup', 'module'],
    field_agent: ['assignment', 'reminder', 'target', 'ticket', 'stock', 'event'],
};
const MANAGER_KINDS: Kind[] = ['presence', 'report', 'incident', 'stock', 'attendance', 'ticket', 'photo', 'target'];

/** Libellé du jour : Aujourd'hui, Hier, nom du jour cette semaine, sinon la date. */
function dayLabel(d: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);

    if (diff === 0) return 'Aujourd’hui';
    if (diff === 1) return 'Hier';
    if (diff < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' });
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: day.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function NotificationRow({ n }: { n: NotificationItem }) {
    const style = kindStyle(n.kind);
    const Icon = style.icon;
    const time = new Date(n.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return (
        <li>
            <Link
                href={notificationOpen({ notification: n.id }).url}
                className={cn(
                    'group relative flex gap-3.5 px-4 py-3.5 transition-colors focus-visible:outline-none sm:px-5',
                    n.read ? 'hover:bg-slate-50/80 focus-visible:bg-slate-50 dark:hover:bg-white/[0.02]' : 'bg-motriks-soft/30 hover:bg-motriks-soft/50 focus-visible:bg-motriks-soft/50 dark:bg-motriks/[0.06]',
                )}
            >
                {!n.read && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-motriks" />}

                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', style.tile, n.read && 'opacity-70')}>
                    <Icon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                        <p className={cn('truncate text-sm', n.read ? 'font-medium text-slate-600 dark:text-slate-300' : 'font-semibold text-ink')}>{n.title}</p>
                        <time dateTime={n.at} title={n.date} className="shrink-0 text-[11px] text-slate-400 tabular-nums">
                            {time}
                        </time>
                    </div>
                    <p className={cn('mt-0.5 line-clamp-2 text-sm leading-relaxed', n.read ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300')}>{n.body}</p>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between self-stretch py-0.5">
                    {!n.read ? <span className="size-2 rounded-full bg-motriks ring-4 ring-motriks/15" aria-label="Non lue" /> : <span />}
                    <ChevronRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </div>
            </Link>
        </li>
    );
}

export default function NotificationsIndex({ notifications }: { notifications: NotificationItem[] }) {
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [kind, setKind] = useState<Kind | null>(null);
    const [marking, setMarking] = useState(false);

    const { auth } = usePage().props;
    const expected = KINDS_BY_ROLE[auth.user?.role ?? ''] ?? MANAGER_KINDS;
    const unread = notifications.filter((n) => !n.read).length;
    const kindsPresent = (Object.keys(KINDS) as Kind[]).filter((k) => notifications.some((n) => n.kind === k));

    const groups = useMemo(() => {
        const list = notifications.filter((n) => (filter === 'all' || !n.read) && (!kind || n.kind === kind));
        const map = new Map<string, NotificationItem[]>();
        for (const n of list) {
            const label = dayLabel(new Date(n.at));
            map.set(label, [...(map.get(label) ?? []), n]);
        }
        return [...map.entries()];
    }, [notifications, filter, kind]);

    const markAll = () =>
        router.post(readAll().url, {}, {
            preserveScroll: true,
            onStart: () => setMarking(true),
            onSuccess: () => toast.success('Tout est marqué comme lu'),
            onFinish: () => setMarking(false),
        });

    return (
        <>
            <Head title={unread ? `(${unread}) Notifications` : 'Notifications'} />

            <Page
                title="Notifications"
                description="Incidents, stocks critiques, demandes et absences qui vous concernent."
                className="max-w-4xl"
                actions={
                    unread > 0 && (
                        <ActionButton variant="secondary" icon={<CheckCheck />} loading={marking} onClick={markAll}>
                            Tout marquer comme lu
                        </ActionButton>
                    )
                }
            >
                <PushDeviceCard />

                {notifications.length === 0 ? (
                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                        <div className="flex flex-col items-center px-6 pt-12 pb-8 text-center">
                            <span className="relative flex size-14 items-center justify-center">
                                <span className="absolute inset-0 rounded-2xl bg-motriks-soft ring-8 ring-motriks-soft/40" />
                                <BellRing className="relative size-6 text-motriks-deep" />
                            </span>
                            <h2 className="mt-5 text-[15px] font-semibold text-ink">Vous êtes à jour</h2>
                            <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">Rien ne demande votre attention pour le moment. Voici ce qui vous sera signalé ici :</p>
                        </div>
                        <ul className="grid border-t border-slate-100 sm:grid-cols-2 dark:border-sidebar-border">
                            {expected.map((k, i) => {
                                const { icon: Icon, label, tile, explain } = KINDS[k];
                                return (
                                    <li key={k} className={cn('flex items-start gap-3 px-5 py-4', i > 0 && 'border-t border-slate-100 dark:border-sidebar-border', i === 1 && 'sm:border-t-0', i % 2 === 1 && 'sm:border-l')}>
                                        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', tile)}>
                                            <Icon className="size-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-ink">{label}</p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{explain}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 dark:border-sidebar-border dark:bg-white/[0.02]">
                            <Mail className="size-3.5 shrink-0 text-slate-400" />
                            Si votre compte a une adresse e-mail, vous les recevez aussi par e-mail.
                        </p>
                    </section>
                ) : (
                    <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Segmented
                                label="Filtrer les notifications"
                                value={filter}
                                onChange={setFilter}
                                options={[
                                    { value: 'all', label: 'Toutes', count: notifications.length },
                                    { value: 'unread', label: 'Non lues', count: unread },
                                ]}
                            />
                            {kindsPresent.length > 1 && (
                                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par type">
                                    {kindsPresent.map((k) => {
                                        const { icon: Icon, label } = KINDS[k];
                                        const active = kind === k;
                                        return (
                                            <button
                                                key={k}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => setKind(active ? null : k)}
                                                className={cn(
                                                    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1 transition-colors',
                                                    active ? 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white' : 'text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-ink dark:text-slate-300 dark:ring-sidebar-border dark:hover:bg-white/5',
                                                )}
                                            >
                                                <Icon className="size-3.5" />
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                            {groups.length === 0 ? (
                                <QuietEmpty icon={CheckCheck} title={filter === 'unread' ? 'Tout est lu' : 'Aucune notification de ce type'}>
                                    {filter === 'unread' ? 'Vous avez pris connaissance de toutes vos notifications.' : 'Choisissez un autre type ou affichez toutes les notifications.'}
                                </QuietEmpty>
                            ) : (
                                groups.map(([label, items], gi) => (
                                    <div key={label}>
                                        <h2 className={cn('sticky top-0 z-[1] flex items-center justify-between bg-white/90 px-5 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase backdrop-blur dark:bg-card/90', gi > 0 && 'border-t border-slate-100 dark:border-sidebar-border')}>
                                            <span className="first-letter:uppercase">{label}</span>
                                            <span className="font-medium tabular-nums">{items.length}</span>
                                        </h2>
                                        <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-sidebar-border dark:border-sidebar-border">
                                            {items.map((n) => (
                                                <NotificationRow key={n.id} n={n} />
                                            ))}
                                        </ul>
                                    </div>
                                ))
                            )}
                        </section>

                        {notifications.length >= 50 && <p className="text-center text-xs text-slate-400">Les 50 notifications les plus récentes sont affichées.</p>}
                    </>
                )}
            </Page>
        </>
    );
}

NotificationsIndex.layout = {
    breadcrumbs: [{ title: 'Notifications', href: notificationsIndex().url }],
};
