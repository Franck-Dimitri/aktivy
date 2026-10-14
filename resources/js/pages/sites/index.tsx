import { Head, Link } from '@inertiajs/react';
import {
    CalendarRange,
    Clock,
    MapPin,
    MapPinOff,
    Plus,
    Store,
} from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { index as sitesIndex, create as siteCreate, show as siteShow } from '@/routes/sites';
import { dashboard } from '@/routes';
import type { SiteListItem } from '@/types';

type Props = {
    sites: SiteListItem[];
};

const statusTone: Record<string, StatusTone> = {
    active: 'success',
    inactive: 'neutral',
    suspended: 'warning',
};

const typeIcon: Record<string, string> = {
    supermarche: '🛒',
    hypermarche: '🏪',
    epicerie: '🥦',
    pharmacie: '💊',
    kiosque: '🏠',
    station_service: '⛽',
    boutique: '👗',
    autre: '📍',
};

function StatCard({
    label,
    value,
    sub,
    highlight,
}: {
    label: string;
    value: number;
    sub?: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border p-4 ${
                highlight
                    ? 'border-aktivy/30 bg-aktivy-soft'
                    : 'border-slate-200 bg-white'
            }`}
        >
            <p className="text-2xl font-bold text-ink">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
            {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
    );
}

export default function SitesIndex({ sites }: Props) {
    const active   = sites.filter((s) => s.status === 'active').length;
    const withAff  = sites.filter((s) => s.active_affectations_count > 0).length;
    const withVisit= sites.filter((s) => s.last_visit_at !== null).length;

    return (
        <>
            <Head title="Sites" />

            <Page
                title="Sites"
                description="Vos points de vente et leur activité."
                actions={
                    <Link
                        href={siteCreate().url}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-4 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                    >
                        <Plus className="size-4" />
                        Nouveau site
                    </Link>
                }
            >
                {sites.length === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={Store}
                            title="Aucun site pour l'instant"
                            description="Ajoutez vos premiers points de vente : supermarchés, kiosques, pharmacies…"
                            action={
                                <Link
                                    href={siteCreate().url}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-4 text-sm font-semibold text-ink hover:bg-[#46b52b]"
                                >
                                    <Plus className="size-4" />
                                    Créer le premier site
                                </Link>
                            }
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <StatCard label="Total" value={sites.length} />
                            <StatCard label="Actifs" value={active} sub={`${sites.length - active} inactif${sites.length - active !== 1 ? 's' : ''}`} />
                            <StatCard label="Avec hôtesse" value={withAff} sub="affectations actives" highlight={withAff > 0} />
                            <StatCard label="Déjà visités" value={withVisit} sub="au moins 1 visite" />
                        </div>

                        {/* Grid de cartes */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {sites.map((site) => (
                                <Link
                                    key={site.id}
                                    href={siteShow({ site: site.id }).url}
                                    className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-aktivy/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aktivy"
                                >
                                    {/* Header card */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-aktivy-soft text-2xl">
                                                {typeIcon[site.type] ?? '📍'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-ink group-hover:text-aktivy-deep line-clamp-1">
                                                    {site.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {site.type_label}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusBadge tone={statusTone[site.status] ?? 'neutral'}>
                                            {site.status_label}
                                        </StatusBadge>
                                    </div>

                                    {/* Séparateur */}
                                    <div className="my-3 border-t border-slate-100" />

                                    {/* Infos */}
                                    <div className="flex flex-col gap-1.5 text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            {site.has_coordinates ? (
                                                <MapPin className="size-3.5 shrink-0 text-aktivy" />
                                            ) : (
                                                <MapPinOff className="size-3.5 shrink-0 text-slate-300" />
                                            )}
                                            <span className="truncate">
                                                {site.city}
                                                {site.region && ` · ${site.region}`}
                                            </span>
                                            {site.code && (
                                                <span className="ml-auto shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                                                    {site.code}
                                                </span>
                                            )}
                                        </div>

                                        {site.active_affectations_count > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <CalendarRange className="size-3.5 shrink-0 text-aktivy" />
                                                <span>
                                                    {site.active_affectations_count} hôtesse
                                                    {site.active_affectations_count > 1 ? 's' : ''} affectée
                                                    {site.active_affectations_count > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5">
                                            <Clock className="size-3.5 shrink-0 text-slate-300" />
                                            <span className="text-slate-400">
                                                {site.last_visit_at
                                                    ? `Dernière visite ${site.last_visit_at}`
                                                    : 'Aucune visite enregistrée'}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {/* Carte d'ajout */}
                            <Link
                                href={siteCreate().url}
                                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-5 text-slate-400 transition-colors hover:border-aktivy hover:text-aktivy"
                            >
                                <Plus className="size-6" />
                                <span className="text-sm font-medium">Ajouter un site</span>
                            </Link>
                        </div>
                    </div>
                )}
            </Page>
        </>
    );
}

SitesIndex.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
    ],
};
