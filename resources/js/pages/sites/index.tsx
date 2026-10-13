import { Head, Link } from '@inertiajs/react';
import {
    CalendarRange,
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

export default function SitesIndex({ sites }: Props) {
    return (
        <>
            <Head title="Sites" />

            <Page
                title="Sites"
                description="Les points de vente où travaillent vos hôtesses."
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
                <Panel>
                    {sites.length === 0 ? (
                        <EmptyState
                            icon={Store}
                            title="Aucun site pour l'instant"
                            description="Ajoutez vos premiers points de vente : supermarchés, kiosques, pharmacies…"
                            action={
                                <Link
                                    href={siteCreate().url}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-4 text-sm font-semibold text-ink hover:bg-[#46b52b] focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                                >
                                    <Plus className="size-4" />
                                    Créer le premier site
                                </Link>
                            }
                        />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {sites.map((site) => (
                                <li key={site.id}>
                                    <Link
                                        href={siteShow({ site: site.id }).url}
                                        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-aktivy"
                                    >
                                        {/* Icone */}
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-aktivy-soft text-aktivy-deep">
                                            <Store className="size-5" />
                                        </div>

                                        {/* Identité */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-sm font-semibold text-ink group-hover:text-aktivy-deep">
                                                    {site.name}
                                                </span>
                                                {site.code && (
                                                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-500">
                                                        {site.code}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    {site.has_coordinates ? (
                                                        <MapPin className="size-3 text-aktivy" />
                                                    ) : (
                                                        <MapPinOff className="size-3 text-slate-400" />
                                                    )}
                                                    {site.city}
                                                    {site.region && ` · ${site.region}`}
                                                </span>
                                                <span className="text-slate-300">·</span>
                                                <span>{site.type_label}</span>
                                            </div>
                                        </div>

                                        {/* Stats + statut */}
                                        <div className="hidden shrink-0 items-center gap-4 sm:flex">
                                            {site.active_affectations_count > 0 && (
                                                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <CalendarRange className="size-3.5" />
                                                    {site.active_affectations_count} affectée
                                                    {site.active_affectations_count > 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {site.last_visit_at && (
                                                <span className="text-xs text-slate-400">
                                                    Dernière visite {site.last_visit_at}
                                                </span>
                                            )}
                                            <StatusBadge tone={statusTone[site.status] ?? 'neutral'}>
                                                {site.status_label}
                                            </StatusBadge>
                                        </div>

                                        {/* Statut seul sur mobile */}
                                        <div className="shrink-0 sm:hidden">
                                            <StatusBadge tone={statusTone[site.status] ?? 'neutral'}>
                                                {site.status_label}
                                            </StatusBadge>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
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
