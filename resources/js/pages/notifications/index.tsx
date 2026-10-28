import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    CheckCheck,
    ClipboardList,
    MessageSquarePlus,
    PackageX,
    UserX,
    type LucideIcon,
} from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { cn } from '@/lib/utils';
import {
    index as notificationsIndex,
    open as notificationOpen,
    readAll,
} from '@/routes/notifications';

type NotificationItem = {
    id: string;
    kind: 'incident' | 'stock' | 'ticket' | 'attendance' | 'reminder' | null;
    title: string;
    body: string;
    read: boolean;
    date: string;
};

const kindStyle: Record<string, { icon: LucideIcon; className: string }> = {
    incident: { icon: AlertTriangle, className: 'bg-red-50 text-red-600' },
    stock: { icon: PackageX, className: 'bg-amber-50 text-amber-700' },
    ticket: { icon: MessageSquarePlus, className: 'bg-sky-50 text-sky-700' },
    attendance: { icon: UserX, className: 'bg-amber-50 text-amber-700' },
    reminder: {
        icon: ClipboardList,
        className: 'bg-motriks-soft text-motriks-deep',
    },
};

export default function NotificationsIndex({
    notifications,
}: {
    notifications: NotificationItem[];
}) {
    const unread = notifications.filter((n) => !n.read).length;

    return (
        <>
            <Head title="Notifications" />

            <Page
                title="Notifications"
                description="Incidents, stocks critiques, demandes et absences qui vous concernent."
                actions={
                    unread > 0 ? (
                        <ActionButton
                            variant="secondary"
                            icon={<CheckCheck />}
                            onClick={() =>
                                router.post(
                                    readAll().url,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            Tout marquer comme lu
                        </ActionButton>
                    ) : undefined
                }
            >
                <Panel>
                    {notifications.length === 0 ? (
                        <div className="p-10">
                            <EmptyState
                                icon={Bell}
                                title="Aucune notification"
                                description="Vous serez prévenu ici dès qu’un événement demande votre attention."
                            />
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {notifications.map((n) => {
                                const style = kindStyle[n.kind ?? ''] ?? {
                                    icon: Bell,
                                    className: 'bg-slate-100 text-slate-500',
                                };
                                const Icon = style.icon;

                                return (
                                    <li key={n.id}>
                                        <Link
                                            href={
                                                notificationOpen({
                                                    notification: n.id,
                                                }).url
                                            }
                                            className={cn(
                                                'flex gap-3 px-5 py-4 transition-colors hover:bg-green-50/40',
                                                !n.read && 'bg-sky-50/40',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-9 shrink-0 items-center justify-center rounded-xl',
                                                    style.className,
                                                )}
                                            >
                                                <Icon className="size-4" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <p
                                                        className={cn(
                                                            'text-sm text-ink',
                                                            !n.read &&
                                                                'font-semibold',
                                                        )}
                                                    >
                                                        {n.title}
                                                    </p>
                                                    <span className="shrink-0 text-xs text-slate-400">
                                                        {n.date}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-sm text-slate-600">
                                                    {n.body}
                                                </p>
                                            </div>
                                            {!n.read && (
                                                <span
                                                    className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-500"
                                                    aria-label="Non lue"
                                                />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Panel>
            </Page>
        </>
    );
}

NotificationsIndex.layout = {
    breadcrumbs: [{ title: 'Notifications', href: notificationsIndex().url }],
};
