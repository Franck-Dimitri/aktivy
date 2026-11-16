import { Head, Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Clock,
    Eye,
    Fuel,
    MapPinOff,
    MoreHorizontal,
    Pencil,
    Pill,
    Plus,
    Search,
    Shirt,
    ShoppingBasket,
    ShoppingCart,
    Store,
    Trash2,
    Users,
    Warehouse,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { TextInput } from '@/components/page/form-fields';
import { useListQuery } from '@/components/page/list-query';
import { Page, Panel } from '@/components/page/page';
import { Pagination, type Paginated } from '@/components/page/pagination';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { MetricStrip } from '@/components/page/surface';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    index as sitesIndex,
    create as siteCreate,
    show as siteShow,
    destroy as siteDestroy,
} from '@/routes/sites';
import type { SiteListItem, SiteTypeOption } from '@/types';
import { CreateSiteModal } from './create-site-modal';

type Props = {
    /** Page de sites déjà filtrée par le serveur (recherche de l'URL). */
    sites: Paginated<SiteListItem>;
    filters: { q: string };
    /** Compteurs du haut de page, sur tous les sites visibles (pas seulement la page affichée). */
    stats: {
        total: number;
        active: number;
        with_hostess: number;
        visited: number;
    };
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

/** Carte compacte : toute la carte ouvre la fiche ; Modifier / Supprimer sont dans le menu « ⋯ ». */
function SiteCard({
    site,
    canEdit,
    canDelete,
    onDelete,
}: {
    site: SiteListItem;
    canEdit: boolean;
    canDelete: boolean;
    onDelete: () => void;
}) {
    const showUrl = siteShow({ site: site.uuid }).url;
    const TypeIcon = typeIcon[site.type] ?? Building2;
    const inactive = site.status !== 'active';
    const hostesses = site.active_affectations_count;

    return (
        <article className="group relative">
            <Link
                href={showUrl}
                className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
            >
                <div className="flex items-center gap-3 p-4 pr-12">
                    <span
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-motriks-deep ring-1 ring-green-600/15 ring-inset',
                            inactive && 'opacity-50 grayscale',
                        )}
                    >
                        <TypeIcon className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                            <h3 className="truncate text-[15px] font-semibold text-ink transition-colors group-hover:text-motriks-deep">
                                {site.name}
                            </h3>
                            {inactive && (
                                <StatusBadge
                                    tone={statusTone[site.status] ?? 'neutral'}
                                >
                                    {site.status_label}
                                </StatusBadge>
                            )}
                        </div>
                        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-slate-500">
                            <span className="shrink-0">{site.type_label}</span>
                            <span aria-hidden className="text-slate-300">
                                ·
                            </span>
                            <span className="truncate">
                                {site.city}
                                {site.region && ` · ${site.region}`}
                            </span>
                            {!site.has_coordinates && (
                                <MapPinOff
                                    className="size-3.5 shrink-0 text-slate-300"
                                    aria-label="Position GPS non renseignée"
                                />
                            )}
                            {site.code && (
                                <span className="ml-auto shrink-0 font-mono text-[11px] text-slate-500">
                                    {site.code}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-xs">
                    <span
                        className={cn(
                            'flex min-w-0 items-center gap-1.5',
                            hostesses > 0
                                ? 'font-medium text-motriks-deep'
                                : 'text-slate-500',
                        )}
                    >
                        <Users className="size-3.5 shrink-0" />
                        <span className="truncate">
                            {hostesses > 0
                                ? `${hostesses} hôtesse${hostesses > 1 ? 's' : ''}`
                                : 'Aucune hôtesse'}
                        </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-slate-500">
                        <Clock className="size-3.5 shrink-0" />
                        {site.last_visit_at
                            ? `Visite ${site.last_visit_at}`
                            : 'Jamais visité'}
                    </span>
                </div>
            </Link>

            {/* Actions : hors du lien (pas de bouton dans un lien) */}
            <div className="absolute top-3 right-3">
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`Actions pour ${site.name}`}
                            className="flex size-11 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none data-[state=open]:bg-slate-100 data-[state=open]:text-ink sm:size-8"
                        >
                            <MoreHorizontal className="size-[18px]" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-44 rounded-xl p-1"
                    >
                        <DropdownMenuItem
                            asChild
                            className="cursor-pointer rounded-lg"
                        >
                            <Link href={showUrl}>
                                <Eye className="size-4" />
                                Voir la fiche
                            </Link>
                        </DropdownMenuItem>
                        {canEdit && (
                            <DropdownMenuItem
                                asChild
                                className="cursor-pointer rounded-lg"
                            >
                                <Link href={`${showUrl}?modifier=1`}>
                                    <Pencil className="size-4" />
                                    Modifier
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={onDelete}
                                    className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600 [&_svg]:text-red-500"
                                >
                                    <Trash2 className="size-4" />
                                    Supprimer
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </article>
    );
}

export default function SitesIndex({ sites, filters, stats, types }: Props) {
    // Le superviseur crée des sites ; seul le gérant les supprime
    const { manageCompany, manageTeam } = usePage().props.auth.can;

    // Fenêtre de création : montée uniquement quand elle est visible (le formulaire repart de zéro à chaque ouverture).
    const [creating, setCreating] = useState(false);
    const closeCreate = useCallback(() => setCreating(false), []);

    // Bouton « nouveau site » : ouvre la fenêtre si les types sont fournis, sinon l'ancienne page.
    const newButton = (label: string) =>
        !manageTeam ? undefined : types ? (
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

    const list = useListQuery(sitesIndex().url, filters);

    const { ask, dialog } = useDeleteDialog<SiteListItem>({
        getUrl: (s) => siteDestroy(s.uuid).url,
        getTitle: (s) => `Supprimer « ${s.name} » ?`,
        getDescription: () =>
            'Ses affectations et visites passées restent consultables.',
        getSuccessMessage: (s) => `« ${s.name} » a été supprimé.`,
        confirmLabel: 'Supprimer',
        icon: Trash2,
    });

    // Compteurs sur tous les sites visibles ; la liste, elle, est la page filtrée par le serveur
    const total = stats.total;
    const active = stats.active;
    const withAff = stats.with_hostess;
    const withVisit = stats.visited;
    const visible = sites.data;

    return (
        <>
            <Head title="Sites" />

            <Page
                title="Sites"
                description="Vos points de vente et leur activité."
                actions={newButton('Nouveau site')}
            >
                {total === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={Store}
                            title="Aucun site pour l'instant"
                            description={
                                manageTeam
                                    ? 'Ajoutez vos premiers points de vente : supermarchés, kiosques, pharmacies…'
                                    : 'Les points de vente de l’entreprise apparaîtront ici dès que le gérant les aura créés.'
                            }
                            action={newButton('Créer le premier site')}
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        <MetricStrip
                            items={[
                                { label: 'Total', value: total },
                                {
                                    label: 'Actifs',
                                    value: active,
                                    sub: `${total - active} inactif${total - active !== 1 ? 's' : ''}`,
                                },
                                {
                                    label: 'Avec hôtesse',
                                    value: withAff,
                                    sub: 'affectations actives',
                                    live: withAff > 0,
                                },
                                {
                                    label: 'Déjà visités',
                                    value: withVisit,
                                    sub: 'au moins 1 visite',
                                },
                            ]}
                        />

                        <div className="flex items-center justify-between gap-4">
                            <div className="w-full max-w-sm">
                                <TextInput
                                    icon={Search}
                                    type="search"
                                    value={list.search}
                                    onChange={(e) =>
                                        list.setSearch(e.target.value)
                                    }
                                    placeholder="Rechercher un site, une ville…"
                                    aria-label="Rechercher un site"
                                />
                            </div>
                            <p className="hidden text-sm text-slate-500 sm:block">
                                {sites.total} site
                                {sites.total > 1 ? 's' : ''}
                            </p>
                        </div>

                        {visible.length === 0 ? (
                            <Panel>
                                <EmptyState
                                    icon={Search}
                                    title="Aucun résultat"
                                    description="Aucun site ne correspond à votre recherche."
                                />
                            </Panel>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {visible.map((site) => (
                                    <SiteCard
                                        key={site.id}
                                        site={site}
                                        canEdit={!!manageTeam}
                                        canDelete={!!manageCompany}
                                        onDelete={() => ask(site)}
                                    />
                                ))}
                            </div>
                        )}

                        {sites.last_page > 1 && (
                            <Pagination page={sites} className="px-0 py-0" />
                        )}
                    </div>
                )}
            </Page>

            {creating && types && (
                <CreateSiteModal types={types} onClose={closeCreate} />
            )}

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
