import { Head, Link } from '@inertiajs/react';
import { Calendar, MapPin, Package, Plus, Users, Zap, TrendingUp, Clock } from 'lucide-react';
import { Page } from '@/components/page/page';
import { GlowStyles } from '@/components/page/surface';
import { ActionLink } from '@/components/page/buttons';
import { cn } from '@/lib/utils';
import { index as eventsIndex, create as eventCreate, show as eventShow } from '@/routes/events';

type EventItem = {
    id: number;
    name: string;
    status: 'draft' | 'active' | 'completed' | 'archived';
    status_label: string;
    start_date: string;
    end_date: string;
    location: string | null;
    city: string;
    hostesses_count: number;
    sites_count: number;
    packs_count: number;
};

const STATUS_CONFIG = {
    draft:     { label: 'Brouillon', dot: 'bg-amber-400',    ring: 'ring-amber-200',    bg: 'bg-amber-50',    text: 'text-amber-700',    bar: 'from-amber-500/20 to-transparent' },
    active:    { label: 'En cours',  dot: 'bg-aktivy',       ring: 'ring-green-200',    bg: 'bg-aktivy-soft', text: 'text-aktivy-deep',  bar: 'from-green-500/20 to-transparent' },
    completed: { label: 'Terminé',   dot: 'bg-blue-400',     ring: 'ring-blue-200',     bg: 'bg-blue-50',     text: 'text-blue-700',     bar: 'from-blue-500/20 to-transparent' },
    archived:  { label: 'Archivé',   dot: 'bg-slate-300',    ring: 'ring-slate-200',    bg: 'bg-slate-50',    text: 'text-slate-500',    bar: 'from-slate-400/10 to-transparent' },
};

function StatChip({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
    return (
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon className="size-3.5 shrink-0" />
            <span className="font-medium tabular-nums">{value}</span>
            <span>{label}{value > 1 ? 's' : ''}</span>
        </span>
    );
}

function EventCard({ event }: { event: EventItem }) {
    const cfg = STATUS_CONFIG[event.status];

    return (
        <Link href={eventShow({ event: event.id }).url} className="group block focus-visible:outline-none">
            <article className={cn(
                'relative flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60',
                cfg.ring,
            )}>
                {/* Gradient header stripe */}
                <div className={cn('h-1.5 w-full bg-gradient-to-r', cfg.bar.replace('to-transparent', 'to-slate-100'))} />

                <div className="flex flex-1 flex-col gap-4 p-5">
                    {/* Status + icon row */}
                    <div className="flex items-start justify-between gap-3">
                        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl ring-1', cfg.bg, cfg.ring)}>
                            {event.status === 'active'
                                ? <Zap className={cn('size-5', cfg.text)} />
                                : event.status === 'completed'
                                    ? <TrendingUp className={cn('size-5', cfg.text)} />
                                    : <Clock className={cn('size-5', cfg.text)} />}
                        </div>
                        <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', cfg.bg, cfg.text, cfg.ring)}>
                            <span className={cn('size-1.5 rounded-full', cfg.dot, event.status === 'active' && 'animate-pulse')} />
                            {cfg.label}
                        </span>
                    </div>

                    {/* Name */}
                    <div>
                        <h3 className="text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-aktivy-deep">
                            {event.name}
                        </h3>
                        {(event.location || event.city) && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                <MapPin className="size-3 shrink-0" />
                                {event.location ? `${event.location}, ${event.city}` : event.city}
                            </p>
                        )}
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                        <Calendar className="size-3.5 shrink-0 text-slate-400" />
                        {event.start_date} → {event.end_date}
                    </div>

                    {/* Stats */}
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                        <StatChip icon={Users}   value={event.hostesses_count} label="hôtesse" />
                        <StatChip icon={MapPin}  value={event.sites_count}     label="PDV" />
                        <StatChip icon={Package} value={event.packs_count}     label="pack" />
                    </div>
                </div>
            </article>
        </Link>
    );
}

function FeaturedEvent({ event }: { event: EventItem }) {
    return (
        <Link href={eventShow({ event: event.id }).url} className="group block focus-visible:outline-none">
            <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-aktivy to-green-700 p-px shadow-lg shadow-green-900/20">
                <div className="relative rounded-[15px] bg-gradient-to-br from-aktivy-deep/95 to-green-900 p-6 sm:p-8">
                    {/* Background glow */}
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.15),transparent_60%)]" />

                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="flex size-2 items-center justify-center">
                                    <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-300 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-wider text-green-300">
                                    Événement en cours
                                </span>
                            </div>
                            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                                {event.name}
                            </h2>
                            {(event.location || event.city) && (
                                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-green-200/70">
                                    <MapPin className="size-3.5" />
                                    {event.location ? `${event.location}, ${event.city}` : event.city}
                                </p>
                            )}
                            <p className="mt-2 flex items-center gap-1.5 text-sm text-green-100/60">
                                <Calendar className="size-3.5" />
                                {event.start_date} → {event.end_date}
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-6">
                            {[
                                { icon: Users,   val: event.hostesses_count, label: 'Hôtesses' },
                                { icon: MapPin,  val: event.sites_count,     label: 'PDV' },
                                { icon: Package, val: event.packs_count,     label: 'Packs' },
                            ].map(({ icon: Icon, val, label }) => (
                                <div key={label} className="flex flex-col items-center gap-0.5">
                                    <Icon className="size-4 text-green-300/60" />
                                    <span className="text-2xl font-black tabular-nums text-white">{val}</span>
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-green-300/60">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </article>
        </Link>
    );
}

export default function EventsIndex({ events }: { events: EventItem[] }) {
    const activeEvent   = events.find((e) => e.status === 'active');
    const otherEvents   = events.filter((e) => e.status !== 'active');
    const draftCount    = events.filter((e) => e.status === 'draft').length;
    const doneCount     = events.filter((e) => ['completed', 'archived'].includes(e.status)).length;

    return (
        <>
            <Head title="Événements commerciaux" />
            <GlowStyles />

            <Page
                title="Événements commerciaux"
                description="Salons, foires et opérations promotionnelles"
                actions={
                    <ActionLink href={eventCreate().url} icon={<Plus />}>
                        Nouvel événement
                    </ActionLink>
                }
            >
                {events.length === 0 ? (
                    /* ── Empty state ── */
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
                            <Zap className="size-8 text-amber-400" />
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-slate-800">Aucun événement</h3>
                        <p className="mt-2 max-w-xs text-sm text-slate-400">
                            Créez votre premier événement commercial pour recruter des hôtesses et piloter les ventes.
                        </p>
                        <div className="mt-6">
                            <ActionLink href={eventCreate().url} icon={<Plus />}>
                                Créer un événement
                            </ActionLink>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Résumé chiffré */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Total',      value: events.length,             sub: 'événements' },
                                { label: 'Brouillons', value: draftCount,                sub: 'à lancer' },
                                { label: 'Terminés',   value: doneCount,                 sub: 'archivés' },
                            ].map(({ label, value, sub }) => (
                                <div key={label} className="flex flex-col gap-0.5 rounded-xl bg-white p-4 ring-1 ring-slate-100">
                                    <span className="text-xs font-medium text-slate-400">{label}</span>
                                    <span className="text-2xl font-black tabular-nums text-slate-900">{value}</span>
                                    <span className="text-[11px] text-slate-400">{sub}</span>
                                </div>
                            ))}
                        </div>

                        {/* Événement actif en vedette */}
                        {activeEvent && <FeaturedEvent event={activeEvent} />}

                        {/* Autres événements */}
                        {otherEvents.length > 0 && (
                            <div className="flex flex-col gap-3">
                                {activeEvent && (
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Autres événements
                                    </h2>
                                )}
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {otherEvents.map((e) => (
                                        <EventCard key={e.id} event={e} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Page>
        </>
    );
}

EventsIndex.layout = {
    breadcrumbs: [{ title: 'Événements', href: eventsIndex().url }],
};
