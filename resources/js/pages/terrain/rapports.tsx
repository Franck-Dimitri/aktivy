import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    BadgeDollarSign,
    ChevronRight,
    ClipboardCheck,
    ClipboardList,
    Package,
    Search,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { cn } from '@/lib/utils';
import { index as terrainReports } from '@/routes/terrain/reports';
import { show as reportShow } from '@/routes/terrain/report';

type Report = {
    id: number;
    visit_id: number;
    site_name: string;
    report_date: string;
    report_date_iso: string;
    status: 'draft' | 'submitted';
    total_revenue: number;
    total_units_sold: number;
    submitted_at: string | null;
    has_incident: boolean;
};

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function monthKey(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function groupByMonth(reports: Report[]): [string, Report[]][] {
    const map: Record<string, Report[]> = {};
    for (const r of reports) {
        const k = monthKey(r.report_date_iso);
        if (!map[k]) map[k] = [];
        map[k].push(r);
    }
    return Object.entries(map);
}

function ReportRow({ report, maxRevenue }: { report: Report; maxRevenue: number }) {
    const pct = maxRevenue > 0 ? Math.round((report.total_revenue / maxRevenue) * 100) : 0;
    const date = new Date(report.report_date_iso + 'T00:00:00');
    const day = date.getDate().toString().padStart(2, '0');
    const weekday = date.toLocaleDateString('fr-FR', { weekday: 'short' });

    return (
        <li className="relative overflow-hidden">
            {/* Barre de proportion revenue en arrière-plan */}
            {report.status === 'submitted' && report.total_revenue > 0 && (
                <div
                    className="pointer-events-none absolute inset-y-0 left-0 bg-motriks/5 transition-[width] duration-700"
                    style={{ width: `${pct}%` }}
                />
            )}

            <Link
                href={reportShow({ visit: report.visit_id }).url}
                className="group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-green-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-motriks focus-visible:ring-inset"
            >
                {/* Badge date */}
                <div className={cn(
                    'flex size-11 shrink-0 flex-col items-center justify-center rounded-xl text-center ring-1 ring-inset transition-all duration-200',
                    report.status === 'submitted'
                        ? 'bg-motriks-soft ring-green-600/10 group-hover:bg-motriks group-hover:ring-0'
                        : 'bg-amber-50 ring-amber-200/60 group-hover:bg-amber-100',
                )}>
                    <p className={cn(
                        'text-sm font-bold leading-none transition-colors',
                        report.status === 'submitted' ? 'text-motriks-deep group-hover:text-white' : 'text-amber-700',
                    )}>
                        {day}
                    </p>
                    <p className={cn(
                        'mt-0.5 text-[10px] capitalize transition-colors',
                        report.status === 'submitted' ? 'text-slate-500 group-hover:text-green-100' : 'text-amber-600',
                    )}>
                        {weekday}
                    </p>
                </div>

                {/* Contenu */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-motriks-deep">
                            {new Date(report.report_date_iso + 'T00:00:00').toLocaleDateString('fr-FR', {
                                weekday: 'short', day: 'numeric', month: 'long',
                            })} · {report.site_name}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                            {report.has_incident && (
                                <AlertTriangle className="size-3.5 text-amber-500" />
                            )}
                            <StatusBadge tone={report.status === 'submitted' ? 'success' : 'warning'}>
                                {report.status === 'submitted' ? 'Soumis' : 'Brouillon'}
                            </StatusBadge>
                        </div>
                    </div>

                    {report.status === 'submitted' ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className={cn(
                                'flex items-center gap-1',
                                report.total_revenue > 0 ? 'font-semibold text-motriks-deep' : 'text-slate-400',
                            )}>
                                <BadgeDollarSign className="size-3.5" />
                                {formatMoney(report.total_revenue)} FCFA
                            </span>
                            <span className="text-slate-200">·</span>
                            <span className="flex items-center gap-1 text-slate-500">
                                <Package className="size-3.5" />
                                {report.total_units_sold} unité{report.total_units_sold > 1 ? 's' : ''}
                            </span>
                            {report.submitted_at && (
                                <>
                                    <span className="text-slate-200">·</span>
                                    <span className="flex items-center gap-1 text-slate-400">
                                        <ClipboardCheck className="size-3.5" />
                                        {report.submitted_at}
                                    </span>
                                </>
                            )}
                        </div>
                    ) : (
                        <p className="mt-1 text-xs text-amber-600">Rapport non soumis — à compléter</p>
                    )}
                </div>

                <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-motriks" />
            </Link>
        </li>
    );
}

export default function TerrainRapports({ reports }: { reports: Report[] }) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return reports;
        return reports.filter(
            (r) => r.site_name.toLowerCase().includes(q) || r.report_date.toLowerCase().includes(q),
        );
    }, [reports, search]);

    const grouped = groupByMonth(filtered);
    const submitted = reports.filter((r) => r.status === 'submitted');
    const totalRevenue = submitted.reduce((s, r) => s + r.total_revenue, 0);
    const totalUnits = submitted.reduce((s, r) => s + r.total_units_sold, 0);
    const avgRevenue = submitted.length > 0 ? Math.round(totalRevenue / submitted.length) : 0;

    return (
        <>
            <Head title="Mes rapports" />
            <GlowStyles />

            <Page
                title="Mes rapports"
                description={`${reports.length} rapport${reports.length > 1 ? 's' : ''} dans l'historique`}
            >
                {reports.length === 0 ? (
                    <GlowCard contentClassName="p-10">
                        <EmptyState
                            icon={ClipboardList}
                            title="Aucun rapport"
                            description="Vos rapports journaliers apparaîtront ici une fois soumis."
                        />
                    </GlowCard>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* KPIs */}
                        <MetricStrip
                            items={[
                                {
                                    label: 'Rapports soumis',
                                    value: submitted.length,
                                    sub: `${reports.length - submitted.length} brouillon${reports.length - submitted.length > 1 ? 's' : ''}`,
                                },
                                {
                                    label: 'CA total',
                                    value: (
                                        <>
                                            {formatMoney(totalRevenue)}
                                            <span className="text-sm font-medium text-slate-400">FCFA</span>
                                        </>
                                    ),
                                    sub: 'tous rapports soumis',
                                },
                                {
                                    label: 'Unités vendues',
                                    value: totalUnits,
                                    sub: 'tous rapports soumis',
                                },
                                {
                                    label: 'CA moyen / rapport',
                                    value: (
                                        <>
                                            {formatMoney(avgRevenue)}
                                            <span className="text-sm font-medium text-slate-400">FCFA</span>
                                        </>
                                    ),
                                    sub: 'sur les rapports soumis',
                                },
                            ]}
                        />

                        {/* Barre de recherche */}
                        <div className="relative max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <TextInput
                                placeholder="Rechercher un site ou une date…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-10 pl-9"
                            />
                        </div>

                        {filtered.length === 0 && (
                            <GlowCard contentClassName="p-10">
                                <EmptyState
                                    icon={Search}
                                    title="Aucun résultat"
                                    description="Essayez un autre terme de recherche."
                                />
                            </GlowCard>
                        )}

                        {/* Liste par mois */}
                        {grouped.map(([month, monthReports]) => {
                            const monthSubmitted = monthReports.filter((r) => r.status === 'submitted');
                            const monthRevenue = monthSubmitted.reduce((s, r) => s + r.total_revenue, 0);
                            const monthUnits = monthSubmitted.reduce((s, r) => s + r.total_units_sold, 0);
                            const maxRevenue = Math.max(...monthSubmitted.map((r) => r.total_revenue), 1);

                            return (
                                <div key={month} className="flex flex-col gap-2">
                                    {/* En-tête mois */}
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-sm font-bold capitalize text-ink">
                                            {month}
                                        </p>
                                        {monthRevenue > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-motriks-soft px-3 py-1 text-xs font-semibold text-motriks-deep ring-1 ring-green-200/60">
                                                    <TrendingUp className="size-3" />
                                                    {formatMoney(monthRevenue)} FCFA
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/60">
                                                    <Package className="size-3" />
                                                    {monthUnits} unité{monthUnits > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">
                                                {monthReports.length} rapport{monthReports.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>

                                    <GlowCard contentClassName="p-0">
                                        <ul className="divide-y divide-slate-100/80">
                                            {monthReports.map((r) => (
                                                <ReportRow
                                                    key={r.id}
                                                    report={r}
                                                    maxRevenue={maxRevenue}
                                                />
                                            ))}
                                        </ul>
                                    </GlowCard>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Page>
        </>
    );
}

TerrainRapports.layout = {
    breadcrumbs: [{ title: 'Mes rapports', href: terrainReports().url }],
};
