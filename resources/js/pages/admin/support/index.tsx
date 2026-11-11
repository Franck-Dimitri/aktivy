import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Inbox, MessagesSquare, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    PersonAvatar,
    StatusPill,
    SupportConversation,
    SupportRequestModal,
    type SupportDetail,
    type SupportPreview,
    type SupportStatus,
} from '@/components/admin/support-request-modal';
import { Page } from '@/components/page/page';
import { Pagination, type Paginated } from '@/components/page/pagination';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import { index as supportIndex } from '@/routes/admin/support';

type Row = {
    id: number;
    uuid: string;
    source: 'help' | 'contact';
    topic: string;
    name: string;
    email: string | null;
    company: string | null;
    excerpt: string;
    status: SupportStatus;
    replies_count: number;
    at: string | null;
    ago: string | null;
};

type Props = {
    requests: Paginated<Row>;
    status: SupportStatus | null;
    search: string;
    counts: { all: number; new: number; answered: number; resolved: number };
    selected: SupportDetail | null;
    insights: { week: number; resolved_month: number; first_response_minutes: number | null; answered_30d: number };
};

type Filter = 'all' | SupportStatus;

const TABS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'new', label: 'À traiter' },
    { value: 'answered', label: 'En attente' },
    { value: 'resolved', label: 'Résolues' },
];

/** « 35 min », « 2 h 10 », « 3 j » : délai lisible. */
function duration(minutes: number | null): string {
    if (minutes === null) {
        return '—';
    }

    if (minutes < 60) {
        return `${minutes} min`;
    }

    if (minutes < 60 * 24) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;

        return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
    }

    return `${Math.round(minutes / (60 * 24))} j`;
}

/** Vrai sur un écran assez large pour lire la conversation à côté de la liste. */
function useWideScreen() {
    const query = '(min-width: 1024px)';
    const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);

    useEffect(() => {
        const media = window.matchMedia(query);
        const update = () => setWide(media.matches);
        media.addEventListener('change', update);

        return () => media.removeEventListener('change', update);
    }, []);

    return wide;
}

/**
 * Boîte de réception du support, comme une messagerie : conversations à gauche, lecture et réponse à droite
 * (sur téléphone, la conversation s'ouvre en plein écran).
 */
export default function AdminSupport({ requests, status, search, counts, selected, insights }: Props) {
    const wide = useWideScreen();
    const [query, setQuery] = useState(search);
    const [openId, setOpenId] = useState<number | null>(selected?.id ?? null);
    const [preview, setPreview] = useState<SupportPreview | null>(null);
    const [shown, setShown] = useState<SupportDetail | null>(selected);

    // Garde la dernière demande chargée (et sa version à jour après une réponse)
    if (selected && selected !== shown) {
        setShown(selected);
    }

    const filters = (extra: Record<string, string | number | undefined> = {}) =>
        Object.fromEntries(
            Object.entries({
                statut: status ?? undefined,
                q: search || undefined,
                page: requests.current_page > 1 ? requests.current_page : undefined,
                ...extra,
            }).filter(([, v]) => v !== undefined && v !== ''),
        );

    const visit = (params: Record<string, string | number | undefined>, only?: string[]) =>
        router.get(supportIndex().url, params, { preserveState: true, preserveScroll: true, replace: true, ...(only ? { only } : {}) });

    const setFilter = (value: Filter) => visit({ statut: value === 'all' ? undefined : value, q: search || undefined });

    // Recherche côté serveur, 300 ms après la dernière frappe
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }

        const timer = setTimeout(() => visit({ statut: status ?? undefined, q: query.trim() || undefined }), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    const open = (r: Row) => {
        if (r.id === openId) {
            return;
        }

        setOpenId(r.id);
        setPreview({ id: r.id, topic: r.topic, name: r.name, status: r.status, source: r.source });
        router.get(supportIndex().url, filters({ demande: r.uuid }), { only: ['selected'], preserveState: true, preserveScroll: true, replace: true });
    };

    const close = () => {
        setOpenId(null);
        visit(filters(), ['selected']);
    };

    // Sur ordinateur, la première conversation s'ouvre d'elle-même : le panneau de lecture n'est jamais vide
    const firstRow = requests.data[0];
    useEffect(() => {
        if (wide && openId === null && firstRow) {
            open(firstRow);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wide, firstRow?.id]);

    const detail = shown && shown.id === openId ? shown : null;
    const head = openId !== null && preview?.id === openId ? preview : detail;
    const current: Filter = status ?? 'all';
    const tabCount = (f: Filter) => (f === 'all' ? counts.all : counts[f]);

    return (
        <>
            <Head title="Support" />

            <Page
                title="Support"
                description="Les messages du centre d’aide et de la page Contact. Vos réponses partent par e-mail."
                actions={
                    <dl className="flex items-center divide-x divide-slate-200 rounded-xl border border-slate-200/80 bg-white text-sm shadow-xs">
                        {[
                            { label: 'À traiter', value: String(counts.new), alert: counts.new > 0 },
                            { label: 'Résolues ce mois', value: String(insights.resolved_month) },
                            {
                                label: '1re réponse',
                                value: duration(insights.first_response_minutes),
                                title: 'Délai médian de première réponse, 30 derniers jours',
                            },
                        ].map((m) => (
                            <div key={m.label} className="px-4 py-2" title={m.title}>
                                <dt className="text-[11px] text-slate-500">{m.label}</dt>
                                <dd className={cn('font-semibold tabular-nums', m.alert ? 'text-amber-600' : 'text-ink')}>{m.value}</dd>
                            </div>
                        ))}
                    </dl>
                }
            >
                <section className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] lg:h-[calc(100dvh-14rem)] lg:min-h-[34rem] lg:grid-cols-[23rem_minmax(0,1fr)]">
                    {/* Conversations */}
                    <div className="flex min-h-0 min-w-0 flex-col lg:border-r lg:border-slate-100">
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-4">
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Rechercher"
                                    aria-label="Rechercher une demande (nom, e-mail, entreprise, sujet)"
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pr-9 pl-9 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                                />
                                {query && (
                                    <button
                                        type="button"
                                        onClick={() => setQuery('')}
                                        aria-label="Effacer la recherche"
                                        className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                            <nav role="tablist" aria-label="Filtrer les demandes" className="-mb-px flex gap-4 overflow-x-auto">
                                {TABS.map((t) => {
                                    const active = t.value === current;
                                    const count = tabCount(t.value);

                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            onClick={() => setFilter(t.value)}
                                            className={cn(
                                                'flex shrink-0 items-center gap-1.5 border-b-2 pt-1 pb-2.5 text-[13px] font-medium transition-colors',
                                                active ? 'border-motriks text-ink' : 'border-transparent text-slate-500 hover:text-ink',
                                            )}
                                        >
                                            {t.label}
                                            {count > 0 && (
                                                <span
                                                    className={cn(
                                                        'rounded-full px-1.5 text-[10px] leading-4 font-semibold tabular-nums',
                                                        t.value === 'new' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500',
                                                    )}
                                                >
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {requests.data.length === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                                <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    {search ? (
                                        <Search className="size-5" />
                                    ) : current === 'new' ? (
                                        <CheckCircle2 className="size-5" />
                                    ) : (
                                        <Inbox className="size-5" />
                                    )}
                                </span>
                                <p className="text-sm font-semibold text-ink">
                                    {search ? 'Aucun résultat' : current === 'new' ? 'Tout est traité' : 'Aucune demande'}
                                </p>
                                <p className="max-w-[16rem] text-xs text-slate-500">
                                    {search
                                        ? 'Essayez un autre nom, une adresse e-mail ou un sujet.'
                                        : 'Les messages du centre d’aide et de la page Contact arrivent ici.'}
                                </p>
                            </div>
                        ) : (
                            <ul className="min-h-0 flex-1 overflow-y-auto">
                                {requests.data.map((r) => {
                                    const unread = r.status === 'new';
                                    const active = openId === r.id;

                                    return (
                                        <li key={r.id} className="border-b border-slate-100 last:border-b-0">
                                            <button
                                                type="button"
                                                onClick={() => open(r)}
                                                aria-current={active ? 'true' : undefined}
                                                className={cn(
                                                    'relative flex w-full gap-3 px-4 py-3.5 text-left transition-colors focus-visible:outline-none',
                                                    active ? 'bg-green-50/70' : 'hover:bg-slate-50 focus-visible:bg-slate-50',
                                                )}
                                            >
                                                {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-motriks" aria-hidden />}
                                                <span className="relative">
                                                    <PersonAvatar name={r.name} className="size-9 text-xs" />
                                                    {unread && (
                                                        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-white">
                                                            <span className="sr-only">Nouvelle</span>
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-baseline gap-2">
                                                        <span
                                                            className={cn(
                                                                'min-w-0 flex-1 truncate text-sm',
                                                                unread ? 'font-semibold text-ink' : 'font-medium text-slate-700',
                                                            )}
                                                        >
                                                            {r.name}
                                                            {r.company && <span className="font-normal text-slate-400"> · {r.company}</span>}
                                                        </span>
                                                        <time
                                                            title={r.at ?? undefined}
                                                            className={cn(
                                                                'shrink-0 text-[11px]',
                                                                unread ? 'font-semibold text-ink' : 'text-slate-400',
                                                            )}
                                                        >
                                                            {r.ago}
                                                        </time>
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'mt-0.5 block truncate text-[13px]',
                                                            unread ? 'font-semibold text-ink' : 'text-slate-700',
                                                        )}
                                                    >
                                                        {r.topic}
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-xs text-slate-500">{r.excerpt}</span>
                                                    <span className="mt-2 flex items-center gap-2">
                                                        <StatusPill status={r.status} className="text-[10px]" />
                                                        {r.replies_count > 0 && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                                                <MessagesSquare className="size-3" />
                                                                {r.replies_count}
                                                            </span>
                                                        )}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {requests.last_page > 1 && <Pagination page={requests} className="border-t border-slate-100" />}
                    </div>

                    {/* Lecture et réponse (ordinateur) */}
                    <div className="hidden min-h-0 lg:block">
                        {openId !== null && head ? (
                            <SupportConversation detail={detail} preview={head as SupportPreview} onClose={close} />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50/40 px-8 text-center">
                                <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-xs ring-1 ring-slate-900/5">
                                    <MessagesSquare className="size-6" />
                                </span>
                                <p className="text-sm font-semibold text-ink">Choisissez une conversation</p>
                                <p className="max-w-xs text-sm text-slate-500">Le message, les coordonnées et votre réponse s’affichent ici.</p>
                            </div>
                        )}
                    </div>
                </section>
            </Page>

            {/* Téléphone et tablette : la conversation en plein écran */}
            {!wide && <SupportRequestModal open={openId !== null} detail={detail} preview={head as SupportPreview | null} onClose={close} />}
        </>
    );
}

AdminSupport.layout = {
    breadcrumbs: [
        { title: 'Administration', href: dashboard() },
        { title: 'Support', href: supportIndex().url },
    ],
};
