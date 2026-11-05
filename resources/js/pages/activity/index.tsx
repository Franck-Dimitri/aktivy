import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock, FileCheck2, FilePen, FileX2, MapPin, MapPinOff, PackageX, Phone, RefreshCw, Search, Store, UserX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { buttonClass } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { QuietEmpty, Segmented } from '@/components/page/list-kit';
import { Page } from '@/components/page/page';
import { cn } from '@/lib/utils';
import { index as activityIndex } from '@/routes/activity';
import { show as dailyReportShow } from '@/routes/daily-reports';
import { index as stockAlertsIndex } from '@/routes/stock-alerts';
import { money, number } from '../reports/format';

type State = 'expected' | 'on_site' | 'done' | 'missing';

type Hostess = {
    user_id: number;
    name: string | null;
    phone: string | null;
    slot_start: string | null;
    slot_end: string | null;
    state: State;
    checked_in_at: string | null;
    checked_out_at: string | null;
    off_site: boolean;
    report_id: number | null;
    report_status: 'draft' | 'submitted' | null;
    revenue: number;
    units_sold: number;
    has_incident: boolean;
};

type SiteActivity = { id: number; name: string; city: string | null; stock_alerts: number; hostesses: Hostess[] };

type Props = {
    updated_at: string;
    currency: string;
    has_scope: boolean;
    totals: { expected: number; on_site: number; done: number; missing: number; revenue: number };
    sites: SiteActivity[];
};

type Filter = 'all' | State;

/** Rafraîchissement automatique de la page. */
const REFRESH_MS = 60_000;

/** Ordre d'affichage : ce qui demande une action d'abord. */
const PRIORITY: Record<State, number> = { missing: 0, on_site: 1, expected: 2, done: 3 };

const STATE: Record<State, { label: string; dot: string; bar: string; text: string; ring: string }> = {
    missing: { label: 'Pas pointé', dot: 'bg-red-500', bar: 'bg-red-500', text: 'text-red-700 dark:text-red-400', ring: 'ring-red-200 dark:ring-red-500/30' },
    on_site: { label: 'En poste', dot: 'bg-green-500', bar: 'bg-motriks', text: 'text-motriks-deep dark:text-green-400', ring: 'ring-green-200 dark:ring-green-500/30' },
    expected: { label: 'Attendue', dot: 'bg-slate-300', bar: 'bg-slate-300 dark:bg-slate-600', text: 'text-slate-500', ring: 'ring-slate-200 dark:ring-sidebar-border' },
    done: { label: 'Terminé', dot: 'bg-sky-500', bar: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-400', ring: 'ring-sky-200 dark:ring-sky-500/30' },
};

const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

/** « 5 h 11 », « 42 min » */
function duration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
}

/** « +237694990992 » → « +237 694 99 09 92 » */
function formatPhone(phone: string): string {
    const m = /^\+?237(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(phone.replace(/\s/g, ''));
    return m ? `+237 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

function initials(name: string | null) {
    return (name ?? '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

/** Ce que fait l'hôtesse en ce moment, en une ligne. */
function statusLine(h: Hostess, now: string): string {
    switch (h.state) {
        case 'missing': {
            if (!h.slot_start) return 'Pas de prise de service';
            const late = toMinutes(now) - toMinutes(h.slot_start);
            return late > 0 ? `En retard de ${duration(late)} · attendue à ${h.slot_start}` : `Attendue à ${h.slot_start}`;
        }
        case 'on_site': {
            const since = h.checked_in_at ? toMinutes(now) - toMinutes(h.checked_in_at) : 0;
            return h.checked_in_at ? `Depuis ${h.checked_in_at} · ${duration(Math.max(0, since))}` : 'En poste';
        }
        case 'done':
            return `${h.checked_in_at ?? '—'} → ${h.checked_out_at ?? '—'}`;
        default:
            return h.slot_start ? `Attendue à ${h.slot_start}` : 'Attendue aujourd’hui';
    }
}

function ReportChip({ status }: { status: Hostess['report_status'] }) {
    const map = {
        submitted: { icon: FileCheck2, label: 'Rapport envoyé', cls: 'text-motriks-deep' },
        draft: { icon: FilePen, label: 'Rapport en cours', cls: 'text-amber-600' },
        none: { icon: FileX2, label: 'Pas de rapport', cls: 'text-slate-400' },
    } as const;
    const { icon: Icon, label, cls } = map[status ?? 'none'];

    return (
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', cls)}>
            <Icon className="size-3.5" />
            {label}
        </span>
    );
}

function HostessRow({ h, now, currency }: { h: Hostess; now: string; currency: string }) {
    const s = STATE[h.state];

    return (
        <li className={cn('relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 px-4 py-3.5 sm:px-5', h.state === 'missing' && 'bg-red-50/40 dark:bg-red-500/[0.04]')}>
            {h.state === 'missing' && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-red-500" />}

            <span className={cn('relative flex size-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ring-2 dark:bg-white/5 dark:text-slate-300', s.ring)}>
                {initials(h.name)}
                <span className={cn('absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white dark:ring-card', s.dot)}>
                    {h.state === 'on_site' && <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />}
                </span>
            </span>

            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-semibold text-ink">{h.name ?? 'Compte supprimé'}</p>
                    <span className={cn('text-xs font-semibold', s.text)}>{s.label}</span>
                    {h.off_site && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                            <MapPin className="size-3" />
                            Hors site
                        </span>
                    )}
                    {h.has_incident && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-200 ring-inset dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20">
                            <AlertTriangle className="size-3" />
                            Incident
                        </span>
                    )}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="size-3.5 shrink-0 text-slate-400" />
                        {statusLine(h, now)}
                    </span>
                    {h.state !== 'expected' && h.state !== 'missing' && <ReportChip status={h.report_status} />}
                </p>
            </div>

            <div className="flex items-center gap-2">
                {h.report_id && (h.revenue > 0 || h.report_status) ? (
                    <Link href={dailyReportShow({ dailyReport: h.report_id }).url} className="group hidden text-right sm:block" title="Ouvrir le rapport">
                        <span className="flex items-center justify-end gap-1 text-sm font-semibold whitespace-nowrap text-ink tabular-nums group-hover:text-motriks-deep">
                            {money(h.revenue, currency)}
                            <ArrowUpRight className="size-3.5 text-slate-300 group-hover:text-motriks" />
                        </span>
                        <span className="block text-[11px] text-slate-400 tabular-nums">{number.format(h.units_sold)} unités</span>
                    </Link>
                ) : null}
                {h.phone && (
                    <a
                        href={`tel:${h.phone}`}
                        title={`Appeler ${formatPhone(h.phone)}`}
                        aria-label={`Appeler ${h.name ?? ''} au ${formatPhone(h.phone)}`}
                        className={cn(buttonClass(h.state === 'missing' ? 'primary' : 'secondary', 'icon'), 'size-9 rounded-xl sm:size-9')}
                    >
                        <Phone />
                    </a>
                )}
            </div>

            {/* Ventes sous le nom sur mobile */}
            {h.report_id && (h.revenue > 0 || h.report_status) ? (
                <Link href={dailyReportShow({ dailyReport: h.report_id }).url} className="col-start-2 text-xs font-semibold text-ink tabular-nums sm:hidden">
                    {money(h.revenue, currency)} · {number.format(h.units_sold)} unités
                </Link>
            ) : null}
        </li>
    );
}

export default function ActivityIndex({ updated_at, currency, has_scope, totals, sites }: Props) {
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const refresh = () =>
        router.reload({
            only: ['updated_at', 'totals', 'sites'],
            onStart: () => setRefreshing(true),
            onFinish: () => setRefreshing(false),
        });

    // Le tableau se met à jour tout seul, sans recharger la page
    useEffect(() => {
        const timer = setInterval(refresh, REFRESH_MS);
        return () => clearInterval(timer);
    }, []);

    const expected = totals.expected - totals.on_site - totals.done - totals.missing;
    const reportsSent = sites.reduce((n, s) => n + s.hostesses.filter((h) => h.report_status === 'submitted').length, 0);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return sites
            .map((site) => ({
                ...site,
                hostesses: site.hostesses
                    .filter((h) => (filter === 'all' || h.state === filter) && (!q || `${h.name ?? ''} ${site.name} ${site.city ?? ''}`.toLowerCase().includes(q)))
                    .sort((a, b) => PRIORITY[a.state] - PRIORITY[b.state] || (a.name ?? '').localeCompare(b.name ?? '')),
            }))
            .filter((site) => site.hostesses.length > 0)
            // Les sites où quelqu'un manque passent en premier
            .sort((a, b) => Number(b.hostesses.some((h) => h.state === 'missing')) - Number(a.hostesses.some((h) => h.state === 'missing')) || a.name.localeCompare(b.name));
    }, [sites, filter, query]);

    const segments: { state: State; value: number }[] = [
        { state: 'on_site', value: totals.on_site },
        { state: 'done', value: totals.done },
        { state: 'expected', value: Math.max(0, expected) },
        { state: 'missing', value: totals.missing },
    ];

    return (
        <>
            <Head title="Activité du jour" />

            <Page
                title="Activité du jour"
                className="max-w-6xl"
                description={
                    <span className="inline-flex items-center gap-2">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
                            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                        </span>
                        En direct · mis à jour à <span className="font-medium text-slate-700 tabular-nums dark:text-slate-300">{updated_at}</span>
                    </span>
                }
                actions={
                    has_scope && (
                        <button type="button" onClick={refresh} disabled={refreshing} className={buttonClass('secondary', 'md')}>
                            <RefreshCw className={cn(refreshing && 'animate-spin')} />
                            Actualiser
                        </button>
                    )
                }
            >
                {!has_scope ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-sidebar-border dark:bg-card">
                        <QuietEmpty icon={MapPinOff} title="Vous ne supervisez aucun point de vente">
                            L’activité de vos hôtesses apparaîtra ici dès que votre gérant vous aura affecté à un point de vente.
                        </QuietEmpty>
                    </div>
                ) : totals.expected === 0 ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-sidebar-border dark:bg-card">
                        <QuietEmpty icon={Store} title="Personne n’est attendu aujourd’hui">
                            Aucune hôtesse n’a d’affectation en cours ce jour.
                        </QuietEmpty>
                    </div>
                ) : (
                    <>
                        {/* Synthèse */}
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6 dark:border-sidebar-border dark:bg-card">
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-slate-500">Présence</p>
                                        <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">
                                            {totals.on_site + totals.done}
                                            <span className="text-lg font-medium text-slate-400"> / {totals.expected}</span>
                                        </p>
                                        <p className="text-xs text-slate-500">hôtesses ont pris leur service</p>
                                    </div>
                                    {totals.missing > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setFilter('missing')}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 ring-inset transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20"
                                        >
                                            <UserX className="size-3.5" />
                                            {totals.missing} pas pointé{totals.missing > 1 ? 'es' : 'e'}
                                        </button>
                                    )}
                                </div>

                                <div className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5" role="img" aria-label={segments.map((g) => `${STATE[g.state].label} : ${g.value}`).join(', ')}>
                                    {segments.map((g) =>
                                        g.value > 0 ? <span key={g.state} className={cn('h-full transition-[flex-grow] duration-500', STATE[g.state].bar)} style={{ flexGrow: g.value }} /> : null,
                                    )}
                                </div>

                                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                                    {segments.map((g) => (
                                        <div key={g.state} className="flex items-center gap-2">
                                            <span className={cn('size-2 shrink-0 rounded-full', STATE[g.state].dot)} />
                                            <dt className="text-xs text-slate-500">{STATE[g.state].label}</dt>
                                            <dd className="ml-auto text-sm font-semibold text-ink tabular-nums sm:ml-0">{g.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            <section className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6 dark:border-sidebar-border dark:bg-card">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Ventes du jour</p>
                                    <p className="mt-1 text-3xl font-semibold tracking-tight whitespace-nowrap text-ink tabular-nums">{money(totals.revenue, currency)}</p>
                                    <p className="text-xs text-slate-500">déclarées, brouillons compris</p>
                                </div>
                                <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-sidebar-border">
                                    <CheckCircle2 className="size-3.5 text-motriks" />
                                    <span className="font-semibold text-ink tabular-nums">{reportsSent}</span> rapport{reportsSent > 1 ? 's' : ''} envoyé{reportsSent > 1 ? 's' : ''} sur {totals.expected}
                                </p>
                            </section>
                        </div>

                        {/* Filtres */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Segmented
                                label="Filtrer par statut"
                                value={filter}
                                onChange={setFilter}
                                options={[
                                    { value: 'all', label: 'Toutes', count: totals.expected },
                                    { value: 'missing', label: 'Pas pointé', count: totals.missing },
                                    { value: 'on_site', label: 'En poste', count: totals.on_site },
                                    { value: 'expected', label: 'Attendues', count: Math.max(0, expected) },
                                    { value: 'done', label: 'Terminé', count: totals.done },
                                ]}
                            />
                            <div className="sm:w-64">
                                <TextInput icon={Search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hôtesse ou point de vente" aria-label="Rechercher" className="h-9" />
                            </div>
                        </div>

                        {/* Points de vente */}
                        {shown.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-sidebar-border dark:bg-card">
                                <QuietEmpty icon={filter === 'missing' ? CheckCircle2 : Search} title={filter === 'missing' && !query ? 'Tout le monde a pointé' : 'Aucune hôtesse ne correspond'}>
                                    {filter === 'missing' && !query ? 'Aucune hôtesse n’est en retard pour le moment.' : 'Modifiez le filtre ou la recherche.'}
                                </QuietEmpty>
                            </div>
                        ) : (
                            <div className="grid gap-4 xl:grid-cols-2">
                                {shown.map((site) => {
                                    const all = sites.find((s) => s.id === site.id)?.hostesses ?? site.hostesses;
                                    const present = all.filter((h) => h.state === 'on_site').length;
                                    const missing = all.filter((h) => h.state === 'missing').length;

                                    return (
                                        <section key={site.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                                            <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-4 py-3.5 sm:px-5 dark:border-sidebar-border">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5">
                                                    <Store className="size-[18px]" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <h2 className="truncate text-sm font-semibold text-ink">{site.name}</h2>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {site.city ? `${site.city} · ` : ''}
                                                        <span className="tabular-nums">
                                                            {present}/{all.length} en poste
                                                        </span>
                                                        {missing > 0 && <span className="font-semibold text-red-600 tabular-nums"> · {missing} absente{missing > 1 ? 's' : ''}</span>}
                                                    </p>
                                                </div>
                                                {site.stock_alerts > 0 && (
                                                    <Link
                                                        href={stockAlertsIndex().url}
                                                        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                                                    >
                                                        <PackageX className="size-3.5" />
                                                        {site.stock_alerts} alerte{site.stock_alerts > 1 ? 's' : ''} stock
                                                    </Link>
                                                )}
                                            </header>
                                            <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                                {site.hostesses.map((h) => (
                                                    <HostessRow key={h.user_id} h={h} now={updated_at} currency={currency} />
                                                ))}
                                            </ul>
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </Page>
        </>
    );
}

ActivityIndex.layout = {
    breadcrumbs: [{ title: 'Activité du jour', href: activityIndex().url }],
};
