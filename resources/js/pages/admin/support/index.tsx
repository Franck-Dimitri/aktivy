import { Head, Link, router } from '@inertiajs/react';
import { Inbox, LifeBuoy, MessageSquare } from 'lucide-react';
import { QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { Pagination, type Paginated } from '@/components/page/pagination';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { dashboard } from '@/routes/admin';
import {
    index as supportIndex,
    show as supportShow,
} from '@/routes/admin/support';

type Row = {
    id: number;
    source: 'help' | 'contact';
    topic: string;
    name: string;
    company: string | null;
    excerpt: string;
    status: 'new' | 'answered' | 'resolved';
    replies_count: number;
    at: string | null;
};

type Props = {
    requests: Paginated<Row>;
    status: Row['status'] | null;
    counts: { all: number; new: number; answered: number; resolved: number };
};

export const SUPPORT_STATUS: Record<
    Row['status'],
    { label: string; tone: StatusTone }
> = {
    new: { label: 'Nouvelle', tone: 'warning' },
    answered: { label: 'Répondue', tone: 'info' },
    resolved: { label: 'Résolue', tone: 'success' },
};

type Filter = 'all' | Row['status'];

export default function AdminSupport({ requests, status, counts }: Props) {
    const setFilter = (value: Filter) =>
        router.get(
            supportIndex().url,
            value === 'all' ? {} : { statut: value },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    return (
        <>
            <Head title="Support" />

            <Page
                title="Support"
                description="Les messages du centre d’aide et du formulaire de contact. Chaque réponse part par e-mail à la personne."
                className="max-w-5xl"
            >
                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                    <div className="border-b border-slate-100 p-4 dark:border-sidebar-border">
                        <Segmented
                            label="Filtrer les demandes"
                            value={(status ?? 'all') as Filter}
                            onChange={setFilter}
                            options={[
                                {
                                    value: 'all',
                                    label: 'Toutes',
                                    count: counts.all,
                                },
                                {
                                    value: 'new',
                                    label: 'Nouvelles',
                                    count: counts.new,
                                },
                                {
                                    value: 'answered',
                                    label: 'Répondues',
                                    count: counts.answered,
                                },
                                {
                                    value: 'resolved',
                                    label: 'Résolues',
                                    count: counts.resolved,
                                },
                            ]}
                        />
                    </div>

                    {requests.data.length === 0 ? (
                        <QuietEmpty icon={Inbox} title="Aucune demande">
                            Les messages envoyés depuis le centre d’aide et la
                            page Contact arriveront ici.
                        </QuietEmpty>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                            {requests.data.map((r) => (
                                <li key={r.id}>
                                    <Link
                                        href={supportShow(r.id).url}
                                        className="flex gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                                    >
                                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5">
                                            {r.source === 'help' ? (
                                                <LifeBuoy className="size-4" />
                                            ) : (
                                                <MessageSquare className="size-4" />
                                            )}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="truncate text-sm font-semibold text-ink">
                                                    {r.topic}
                                                    <span className="font-normal text-slate-500">
                                                        {' '}
                                                        · {r.name}
                                                        {r.company
                                                            ? ` · ${r.company}`
                                                            : ''}
                                                    </span>
                                                </p>
                                                <StatusBadge
                                                    tone={
                                                        SUPPORT_STATUS[r.status]
                                                            .tone
                                                    }
                                                >
                                                    {
                                                        SUPPORT_STATUS[r.status]
                                                            .label
                                                    }
                                                </StatusBadge>
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                {r.excerpt}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {r.at}
                                                {r.replies_count > 0 &&
                                                    ` · ${r.replies_count} réponse${r.replies_count > 1 ? 's' : ''}`}
                                            </p>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Pagination
                        page={requests}
                        className="border-t border-slate-100 dark:border-sidebar-border"
                    />
                </section>
            </Page>
        </>
    );
}

AdminSupport.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Support', href: supportIndex().url },
    ],
};
