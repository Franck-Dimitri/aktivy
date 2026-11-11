import { Head, Link } from '@inertiajs/react';
import { CalendarCheck2, CalendarClock, CalendarPlus, ChevronRight, MapPin, Package, Plus, Search, Store, Users, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { MetricRow, QuietEmpty, Segmented } from '@/components/page/list-kit';
import { TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { cn } from '@/lib/utils';
import { index as eventsIndex, show as eventShow } from '@/routes/events';
import { CreateEventModal } from './create-event-modal';

type EventItem = {
    id: number;
    uuid: string;
    name: string;
    status: 'draft' | 'active' | 'completed' | 'archived';
    status_label: string;
    start_date: string;
    end_date: string;
    location: string | null;
    city: string | null;
    hostesses_count: number;
    sites_count: number;
    packs_count: number;
};

type Filter = 'all' | EventItem['status'];

const STATUS: Record<EventItem['status'], { tone: StatusTone; label: string }> = {
    draft: { tone: 'warning', label: 'Brouillon' },
    active: { tone: 'success', label: 'En cours' },
    completed: { tone: 'info', label: 'Terminé' },
    archived: { tone: 'neutral', label: 'Archivé' },
};

const DAY = 86_400_000;

/** « 25/10/2026 » → Date locale à minuit. */
function parse(date: string): Date {
    const [d, m, y] = date.split('/').map(Number);
    return new Date(y, m - 1, d);
}

function midnight(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Repères temporels d'un événement : durée, jour en cours, échéance. */
function timing(e: EventItem) {
    const start = parse(e.start_date);
    const end = parse(e.end_date);
    const now = midnight().getTime();
    const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY) + 1);
    const dayIndex = Math.min(total, Math.max(0, Math.round((now - start.getTime()) / DAY) + 1));
    const untilStart = Math.round((start.getTime() - now) / DAY);
    const sinceEnd = Math.round((now - end.getTime()) / DAY);

    let hint: string;
    if (untilStart > 1) hint = `Commence dans ${untilStart} jours`;
    else if (untilStart === 1) hint = 'Commence demain';
    else if (untilStart === 0) hint = 'Commence aujourd’hui';
    else if (sinceEnd < 0) hint = `Jour ${dayIndex} sur ${total}`;
    else if (sinceEnd === 0) hint = 'Dernier jour';
    else hint = `Terminé il y a ${sinceEnd} j`;

    return { start, end, total, dayIndex, hint, progress: dayIndex / total };
}

const month = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
const range = (a: Date, b: Date) =>
    a.getTime() === b.getTime()
        ? a.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        : `${a.toLocaleDateString('fr-FR', { day: 'numeric', month: a.getMonth() === b.getMonth() ? undefined : 'short' })} – ${b.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
const place = (e: EventItem) => [e.location, e.city].filter(Boolean).join(', ');

/* ───────────────────────── Événement en cours ───────────────────────── */

function LiveEvent({ event }: { event: EventItem }) {
    const t = timing(event);

    return (
        <Link href={eventShow({ event: event.uuid }).url} className="group block rounded-2xl focus-visible:ring-4 focus-visible:ring-motriks/25 focus-visible:outline-none">
            <article className="relative overflow-hidden rounded-2xl bg-[#04281a] p-6 text-white shadow-xl shadow-green-950/20 sm:p-7">
                <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-motriks/40 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:28px_100%]" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-green-300 uppercase">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-70 motion-reduce:animate-none" />
                                <span className="relative inline-flex size-2 rounded-full bg-green-400" />
                            </span>
                            En cours · {t.hint}
                        </p>
                        <h2 className="mt-2.5 truncate text-2xl font-bold tracking-tight sm:text-[1.75rem]">{event.name}</h2>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-green-100/70">
                            <span className="capitalize">{range(t.start, t.end)}</span>
                            {place(event) && (
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="size-3.5" />
                                    {place(event)}
                                </span>
                            )}
                        </p>
                    </div>

                    <dl className="flex shrink-0 gap-2">
                        {[
                            { icon: Users, value: event.hostesses_count, label: 'Hôtesses' },
                            { icon: Store, value: event.sites_count, label: 'Points de vente' },
                            { icon: Package, value: event.packs_count, label: 'Packs' },
                        ].map(({ icon: Icon, value, label }) => (
                            <div key={label} className="min-w-[88px] rounded-xl bg-white/[0.06] px-3.5 py-2.5 ring-1 ring-white/10 backdrop-blur-sm">
                                <dt className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-green-200/70 uppercase">
                                    <Icon className="size-3" />
                                    {label}
                                </dt>
                                <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="relative mt-6 flex items-center gap-4">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-300 transition-[width] duration-700" style={{ width: `${Math.max(4, t.progress * 100)}%` }} />
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-200 transition-transform group-hover:translate-x-0.5">
                        Piloter
                        <ChevronRight className="size-3.5" />
                    </span>
                </div>
            </article>
        </Link>
    );
}

/* ───────────────────────── Carte d'événement ───────────────────────── */

function EventCard({ event }: { event: EventItem }) {
    const t = timing(event);
    const s = STATUS[event.status];
    const faded = event.status === 'archived';

    return (
        <Link href={eventShow({ event: event.uuid }).url} className="group block rounded-2xl focus-visible:ring-4 focus-visible:ring-motriks/20 focus-visible:outline-none">
            <article
                className={cn(
                    'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-lg group-hover:shadow-slate-900/[0.06] dark:border-sidebar-border dark:bg-card',
                    faded && 'opacity-75',
                )}
            >
                <div className="flex items-start gap-4">
                    <div className="flex w-12 shrink-0 flex-col overflow-hidden rounded-xl text-center ring-1 ring-slate-200 dark:ring-sidebar-border">
                        <span className={cn('py-0.5 text-[10px] font-bold tracking-wider text-white uppercase', event.status === 'draft' ? 'bg-amber-500' : event.status === 'active' ? 'bg-motriks' : event.status === 'completed' ? 'bg-blue-500' : 'bg-slate-400')}>
                            {month(t.start)}
                        </span>
                        <span className="py-1 text-lg leading-tight font-bold text-ink tabular-nums">{t.start.getDate()}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold text-ink transition-colors group-hover:text-motriks-deep">{event.name}</h3>
                            <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                        </div>
                        {place(event) && (
                            <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                                <MapPin className="size-3 shrink-0" />
                                {place(event)}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-slate-600 capitalize">{range(t.start, t.end)}</span>
                    <span className="shrink-0 font-medium text-slate-400">
                        {t.total} jour{t.total > 1 ? 's' : ''}
                    </span>
                </div>
                <p className={cn('mt-1 text-xs font-medium', event.status === 'draft' ? 'text-amber-600' : 'text-slate-400')}>{t.hint}</p>

                <div aria-hidden className="min-h-5 flex-1" />
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-sidebar-border">
                    {[
                        { icon: Users, value: event.hostesses_count, label: 'hôtesse' },
                        { icon: Store, value: event.sites_count, label: 'PDV' },
                        { icon: Package, value: event.packs_count, label: 'pack' },
                    ].map(({ icon: Icon, value, label }) => (
                        <span key={label} className={cn('flex items-center gap-1.5 text-xs', value ? 'text-slate-600' : 'text-slate-300')}>
                            <Icon className="size-3.5 shrink-0" />
                            <span className="font-semibold tabular-nums">{value}</span>
                            <span className="truncate">
                                {label}
                                {value > 1 && label !== 'PDV' ? 's' : ''}
                            </span>
                        </span>
                    ))}
                </div>
            </article>
        </Link>
    );
}

/* ───────────────────────── Premier événement ───────────────────────── */

function FirstEvent({ onCreate }: { onCreate: () => void }) {
    const steps = [
        { icon: CalendarPlus, title: 'Créez l’événement', text: 'Nom, dates et lieu : une minute suffit.' },
        { icon: Store, title: 'Préparez le terrain', text: 'Points de vente et packs produits.' },
        { icon: Users, title: 'Mobilisez les hôtesses', text: 'Recrutez, affectez, puis lancez.' },
    ];

    return (
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,var(--color-motriks-soft),transparent_70%)]" />
            <div className="relative flex flex-col items-center px-6 pt-14 pb-10 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-motriks shadow-lg ring-1 shadow-green-900/10 ring-slate-200/80 dark:bg-card dark:ring-sidebar-border">
                    <Zap className="size-6" />
                </span>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink">Lancez votre premier événement</h2>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">Salons, foires, dégustations : regroupez points de vente, packs et hôtesses, puis suivez les ventes au jour le jour.</p>
                <ActionButton icon={<Plus />} onClick={onCreate} className="mt-6">
                    Créer un événement
                </ActionButton>
            </div>

            <ol className="relative grid border-t border-slate-100 sm:grid-cols-3 dark:border-sidebar-border">
                {steps.map(({ icon: Icon, title, text }, i) => (
                    <li key={title} className={cn('flex items-start gap-3 px-6 py-5', i > 0 && 'border-t border-slate-100 sm:border-t-0 sm:border-l dark:border-sidebar-border')}>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-sidebar-border">
                            <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">
                                <span className="mr-1.5 text-slate-300 tabular-nums">{i + 1}.</span>
                                {title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">{text}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

/* ───────────────────────── Page ───────────────────────── */

export default function EventsIndex({ events }: { events: EventItem[] }) {
    const [creating, setCreating] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');

    // /events/create (ancien lien) et /events?nouveau ouvrent directement le formulaire
    useEffect(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.has('nouveau')) {
            setCreating(true);
            url.searchParams.delete('nouveau');
            window.history.replaceState(window.history.state, '', url.pathname + url.search);
        }
    }, []);

    const live = events.filter((e) => e.status === 'active');
    const count = (s: EventItem['status']) => events.filter((e) => e.status === s).length;
    const mobilised = live.reduce((n, e) => n + e.hostesses_count, 0);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return events.filter(
            (e) =>
                (filter === 'all' ? e.status !== 'active' : e.status === filter) &&
                (!q || `${e.name} ${e.location ?? ''} ${e.city ?? ''}`.toLowerCase().includes(q)),
        );
    }, [events, filter, query]);

    const showLive = filter === 'all' && !query.trim();

    return (
        <>
            <Head title="Événements commerciaux" />

            <Page
                title="Événements commerciaux"
                description="Salons, foires et opérations promotionnelles."
               
                actions={
                    events.length > 0 && (
                        <ActionButton icon={<Plus />} onClick={() => setCreating(true)}>
                            Nouvel événement
                        </ActionButton>
                    )
                }
            >
                {events.length === 0 ? (
                    <FirstEvent onCreate={() => setCreating(true)} />
                ) : (
                    <>
                        <MetricRow
                            items={[
                                { label: 'En cours', value: live.length, hint: live.length ? 'Ventes remontées chaque jour' : 'Aucun événement lancé', icon: Zap, tone: live.length ? 'green' : 'default' },
                                { label: 'Brouillons', value: count('draft'), hint: 'À préparer puis lancer', icon: CalendarClock, tone: count('draft') ? 'amber' : 'default' },
                                { label: 'Terminés', value: count('completed') + count('archived'), hint: 'Bilans disponibles', icon: CalendarCheck2, tone: 'blue' },
                                { label: 'Hôtesses mobilisées', value: mobilised, hint: 'Sur les événements en cours', icon: Users },
                            ]}
                        />

                        {showLive && live.map((e) => <LiveEvent key={e.id} event={e} />)}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Segmented
                                label="Filtrer par statut"
                                value={filter}
                                onChange={setFilter}
                                options={[
                                    { value: 'all', label: live.length ? 'Autres' : 'Tous', count: events.length - live.length },
                                    { value: 'active', label: 'En cours', count: live.length },
                                    { value: 'draft', label: 'Brouillons', count: count('draft') },
                                    { value: 'completed', label: 'Terminés', count: count('completed') },
                                    ...(count('archived') ? [{ value: 'archived' as const, label: 'Archivés', count: count('archived') }] : []),
                                ]}
                            />
                            <div className="sm:w-72">
                                <TextInput icon={Search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, lieu ou ville" aria-label="Rechercher un événement" className="h-9" />
                            </div>
                        </div>

                        {shown.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-sidebar-border dark:bg-card">
                                {query.trim() || filter !== 'all' ? (
                                    <QuietEmpty icon={Search} title="Aucun événement ne correspond">
                                        Modifiez la recherche ou le filtre.
                                    </QuietEmpty>
                                ) : (
                                    <QuietEmpty
                                        icon={CalendarPlus}
                                        title="Rien d’autre au programme"
                                        action={
                                            <ActionButton variant="secondary" size="sm" icon={<Plus />} onClick={() => setCreating(true)}>
                                                Préparer le prochain
                                            </ActionButton>
                                        }
                                    >
                                        Préparez dès maintenant votre prochain événement.
                                    </QuietEmpty>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {shown.map((e) => (
                                    <EventCard key={e.id} event={e} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </Page>

            {creating && <CreateEventModal onClose={() => setCreating(false)} />}
        </>
    );
}

EventsIndex.layout = {
    breadcrumbs: [{ title: 'Événements', href: eventsIndex().url }],
};
