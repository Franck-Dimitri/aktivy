import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, MapPin, Package, Store, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/page/status-badge';
import { cn } from '@/lib/utils';
import { index as eventsIndex } from '@/routes/events';
import { dateRange, parseDay, timingLabel, totalDays } from './event-dates';
import { EventActionBar } from './event-action-bar';
import { EventTabs } from './event-tabs';
import { TabApercu } from './tab-apercu';
import { TabHostesses } from './tab-hostesses';
import { TabPacks } from './tab-packs';
import { TabPdv } from './tab-pdv';
import { TabVentes } from './tab-ventes';
import { STATUS_TONE, type ShowProps, type TabId } from './types';

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

const TILE: Record<string, string> = { draft: 'bg-amber-500', active: 'bg-motriks', completed: 'bg-sky-500', archived: 'bg-slate-400' };

export default function EventShow({ event, companySites, companyProducts, availableHostesses, eventSales }: ShowProps) {
    const [tab, setTab] = useState<TabId>('apercu');
    const start = parseDay(event.start_date);
    const days = totalDays(event.start_date, event.end_date);
    const place = [event.location, event.city].filter(Boolean).join(', ');

    const stats: { id: TabId; label: string; value: string; icon: typeof Store }[] = [
        { id: 'pdv', label: 'Points de vente', value: String(event.sites.length), icon: Store },
        { id: 'packs', label: 'Packs', value: String(event.packs.length), icon: Package },
        { id: 'hotesses', label: 'Hôtesses', value: String(event.hostesses.length), icon: Users },
        { id: 'ventes', label: 'Ventes', value: `${nf.format(eventSales.revenue)} FCFA`, icon: TrendingUp },
    ];

    return (
        <>
            <Head title={event.name} />

            <div className="mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* En-tête */}
                <header className="flex flex-col gap-5">
                    <Link href={eventsIndex().url} className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-ink">
                        <ArrowLeft className="size-3.5" />
                        Événements
                    </Link>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex w-14 shrink-0 flex-col overflow-hidden rounded-xl bg-white text-center ring-1 ring-slate-200 dark:bg-card dark:ring-sidebar-border">
                                <span className={cn('py-0.5 text-[10px] font-bold tracking-wider text-white uppercase', TILE[event.status] ?? TILE.archived)}>
                                    {start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                                </span>
                                <span className="py-1.5 text-xl leading-none font-bold text-ink tabular-nums">{start.getDate()}</span>
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <h1 className="text-2xl font-bold tracking-tight break-words text-ink sm:text-[1.65rem]">{event.name}</h1>
                                    <StatusBadge tone={STATUS_TONE[event.status]}>{event.status_label}</StatusBadge>
                                </div>
                                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarDays className="size-4 text-slate-400" />
                                        {dateRange(event.start_date, event.end_date)}
                                        <span className="text-slate-400">
                                            · {days} jour{days > 1 ? 's' : ''}
                                        </span>
                                    </span>
                                    {place && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin className="size-4 text-slate-400" />
                                            {place}
                                        </span>
                                    )}
                                </p>
                                <p className={cn('mt-1 text-xs font-medium', event.status === 'active' ? 'text-motriks-deep' : 'text-slate-400')}>
                                    {timingLabel(event.start_date, event.end_date)}
                                    {event.activated_at && ` · lancé le ${event.activated_at}`}
                                </p>
                            </div>
                        </div>

                        <EventActionBar event={event} />
                    </div>
                </header>

                {/* Chiffres : un clic ouvre l'onglet correspondant */}
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm shadow-slate-900/[0.03] lg:grid-cols-4 dark:border-sidebar-border dark:bg-sidebar-border">
                    {stats.map(({ id, label, value, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className="group flex items-center gap-3 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5 dark:bg-card dark:hover:bg-white/[0.02]"
                        >
                            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors', tab === id ? 'bg-motriks-soft text-motriks-deep' : 'bg-slate-100 text-slate-500 dark:bg-white/5')}>
                                <Icon className="size-[18px]" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-xs leading-tight font-medium text-slate-500">{label}</span>
                                <span className="block truncate text-lg font-semibold tracking-tight text-ink tabular-nums">{value}</span>
                            </span>
                        </button>
                    ))}
                </div>

                <EventTabs
                    active={tab}
                    onChange={setTab}
                    counts={{ pdv: event.sites.length, packs: event.packs.length, hotesses: event.hostesses.length, ventes: eventSales.reports_count }}
                />

                {tab === 'apercu' && <TabApercu event={event} sales={eventSales} onGoTo={setTab} />}
                {tab === 'pdv' && <TabPdv event={event} companySites={companySites} />}
                {tab === 'packs' && <TabPacks event={event} companyProducts={companyProducts} />}
                {tab === 'hotesses' && <TabHostesses event={event} availableHostesses={availableHostesses} />}
                {tab === 'ventes' && <TabVentes sales={eventSales} />}
            </div>
        </>
    );
}

EventShow.layout = {
    breadcrumbs: [{ title: 'Événements', href: eventsIndex().url }, { title: 'Détail événement' }],
};
