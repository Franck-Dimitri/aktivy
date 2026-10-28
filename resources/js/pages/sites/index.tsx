import { Head, Link, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarRange,
    Clock,
    Eye,
    Fuel,
    MapPin,
    MapPinOff,
    Pencil,
    Pill,
    Plus,
    Search,
    Shirt,
    ShoppingBasket,
    ShoppingCart,
    Store,
    Trash2,
    Warehouse,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { TextInput } from '@/components/page/form-fields';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { dashboard } from '@/routes';
import { index as sitesIndex, create as siteCreate, show as siteShow, destroy as siteDestroy } from '@/routes/sites';
import type { SiteListItem, SiteTypeOption } from '@/types';
import { CreateSiteModal } from './create-site-modal';

type Props = {
    sites: SiteListItem[];
    /** Optionnel : fourni par le contrôleur. Sans lui, « Nouveau site » ouvre l'ancienne page. */
    types?: SiteTypeOption[];
};

const statusTone: Record<string, StatusTone> = {
    active: 'success',
    inactive: 'neutral',
    suspended: 'warning',
};

const typeIcon: Record<string, LucideIcon> = {
    supermarche: ShoppingCart,
    hypermarche: Warehouse,
    epicerie: ShoppingBasket,
    pharmacie: Pill,
    kiosque: Store,
    station_service: Fuel,
    boutique: Shirt,
    autre: Building2,
};

const iconBtn =
    'flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none';

export default function SitesIndex({ sites, types }: Props) {
    // Créer ou supprimer un site : réservé au gérant
    const { manageCompany } = usePage().props.auth.can;

    // Fenêtre de création : montée uniquement quand elle est visible (le formulaire repart de zéro à chaque ouverture).
    const [creating, setCreating] = useState(false);
    const closeCreate = useCallback(() => setCreating(false), []);

    // Bouton « nouveau site » : ouvre la fenêtre si les types sont fournis, sinon l'ancienne page.
    const newButton = (label: string) =>
        !manageCompany ? undefined : types ? (
            <ActionButton type="button" onClick={() => setCreating(true)}>
                <span className="inline-flex items-center gap-2">
                    <Plus className="size-4" />
                    {label}
                </span>
            </ActionButton>
        ) : (
            <ActionLink href={siteCreate().url} icon={<Plus />}>
                {label}
            </ActionLink>
        );

    const [query, setQuery] = useState('');

    const { ask, dialog } = useDeleteDialog<SiteListItem>({
        getUrl: (s) => siteDestroy(s.id).url,
        getTitle: (s) => `Supprimer « ${s.name} » ?`,
        getDescription: () => 'Ses affectations et visites passées restent consultables.',
        getSuccessMessage: (s) => `« ${s.name} » a été supprimé.`,
        confirmLabel: 'Supprimer',
        icon: Trash2,
    });

    const active = sites.filter((s) => s.status === 'active').length;
    const withAff = sites.filter((s) => s.active_affectations_count > 0).length;
    const withVisit = sites.filter((s) => s.last_visit_at !== null).length;

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sites;
        return sites.filter((s) => `${s.name} ${s.city} ${s.region ?? ''} ${s.code ?? ''}`.toLowerCase().includes(q));
    }, [sites, query]);

    return (
        <>
            <Head title="Sites" />
            <GlowStyles />

            <Page
                title="Sites"
                description="Vos points de vente et leur activité."
                actions={newButton('Nouveau site')}
            >
                {sites.length === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={Store}
                            title="Aucun site pour l'instant"
                            description="Ajoutez vos premiers points de vente : supermarchés, kiosques, pharmacies…"
                            action={newButton('Créer le premier site')}
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        <MetricStrip
                            items={[
                                { label: 'Total', value: sites.length },
                                { label: 'Actifs', value: active, sub: `${sites.length - active} inactif${sites.length - active !== 1 ? 's' : ''}` },
                                { label: 'Avec hôtesse', value: withAff, sub: 'affectations actives', live: withAff > 0 },
                                { label: 'Déjà visités', value: withVisit, sub: 'au moins 1 visite' },
                            ]}
                        />

                        <div className="flex items-center justify-between gap-4">
                            <div className="w-full max-w-sm">
                                <TextInput
                                    icon={Search}
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Rechercher un site, une ville…"
                                    aria-label="Rechercher un site"
                                />
                            </div>
                            <p className="hidden text-sm text-slate-500 sm:block">
                                {visible.length} site{visible.length > 1 ? 's' : ''}
                            </p>
                        </div>

                        {visible.length === 0 ? (
                            <Panel>
                                <EmptyState icon={Search} title="Aucun résultat" description="Aucun site ne correspond à votre recherche." />
                            </Panel>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {visible.map((site) => {
                                    const showUrl = siteShow({ site: site.id }).url;
                                    const TypeIcon = typeIcon[site.type] ?? Building2;

                                    return (
                                        <GlowCard key={site.id} contentClassName="flex flex-col">
                                            <Link
                                                href={showUrl}
                                                className="flex flex-1 flex-col p-5 pb-3 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none focus-visible:ring-inset"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-green-100 text-motriks-deep ring-1 ring-inset ring-green-600/10 transition duration-300 group-hover:from-green-500 group-hover:to-green-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-green-600/30 group-hover:ring-0">
                                                            <TypeIcon className="size-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="line-clamp-1 font-semibold text-ink transition-colors group-hover:text-motriks-deep">{site.name}</p>
                                                            <p className="text-xs text-slate-500">{site.type_label}</p>
                                                        </div>
                                                    </div>
                                                    <StatusBadge tone={statusTone[site.status] ?? 'neutral'}>{site.status_label}</StatusBadge>
                                                </div>

                                                <div className="my-4 border-t border-slate-100" />

                                                <div className="flex flex-col gap-2 text-xs text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        {site.has_coordinates ? (
                                                            <MapPin className="size-3.5 shrink-0 text-motriks" />
                                                        ) : (
                                                            <MapPinOff className="size-3.5 shrink-0 text-slate-300" />
                                                        )}
                                                        <span className="truncate">
                                                            {site.city}
                                                            {site.region && ` · ${site.region}`}
                                                        </span>
                                                        {site.code && (
                                                            <span className="ml-auto shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                                                                {site.code}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {site.active_affectations_count > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <CalendarRange className="size-3.5 shrink-0 text-motriks" />
                                                            <span>
                                                                {site.active_affectations_count} hôtesse{site.active_affectations_count > 1 ? 's' : ''} affectée
                                                                {site.active_affectations_count > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>

                                            {/* Pied de carte : dernière visite + actions rapides */}
                                            <div className="flex items-center justify-between gap-2 px-5 pb-3">
                                                <span className="flex min-w-0 items-center gap-2 text-xs text-slate-400">
                                                    <Clock className="size-3.5 shrink-0 text-slate-300" />
                                                    <span className="truncate">
                                                        {site.last_visit_at ? `Dernière visite ${site.last_visit_at}` : 'Aucune visite enregistrée'}
                                                    </span>
                                                </span>
                                                <div className="flex shrink-0 items-center">
                                                    <Link
                                                        href={showUrl}
                                                        title="Voir la fiche"
                                                        aria-label={`Voir ${site.name}`}
                                                        className={`${iconBtn} hover:bg-green-50 hover:text-motriks-deep`}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Link>
                                                    <Link
                                                        href={`${showUrl}?modifier=1`}
                                                        title="Modifier"
                                                        aria-label={`Modifier ${site.name}`}
                                                        className={`${iconBtn} hover:bg-green-50 hover:text-motriks-deep`}
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Link>
                                                    {manageCompany && (
                                                        <button
                                                            type="button"
                                                            onClick={() => ask(site)}
                                                            title="Supprimer"
                                                            aria-label={`Supprimer ${site.name}`}
                                                            className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </GlowCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </Page>

            {creating && types && <CreateSiteModal types={types} onClose={closeCreate} />}

            {dialog}
        </>
    );
}

SitesIndex.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
    ],
};