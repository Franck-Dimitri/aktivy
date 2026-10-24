import { Head, Link, router, useForm } from '@inertiajs/react';
import { CalendarRange, Clock, FileText, MapPin, Pencil, Plus, Search, StickyNote, Store, Trash2, User, X } from 'lucide-react';
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { Field, SelectInput, TextArea, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    index as affectationsIndex,
    create as affectationCreate,
    edit as affectationEdit,
    store as affectationStore,
    update as affectationUpdate,
    destroy as affectationDestroy,
} from '@/routes/affectations';
import { show as personnelShow } from '@/routes/personnel';
import { show as siteShow } from '@/routes/sites';
import type { AffectationListItem, AffectationSelectOption, AffectationStats } from '@/types';

type StatusOption = { value: string; label: string };

/** `notes` est envoyé par le contrôleur une fois le petit correctif appliqué (voir backend-patch.php). */
type Item = AffectationListItem & { notes?: string | null };

type Props = {
    affectations: Item[];
    stats: AffectationStats;
    /** Optionnels : fournis par le correctif backend. Sans eux, « Modifier » ouvre l'ancienne page. */
    sites?: AffectationSelectOption[];
    staff?: AffectationSelectOption[];
    statuses?: StatusOption[];
};

type FilterStatus = 'all' | 'active' | 'completed' | 'cancelled';

const statusTone: Record<string, StatusTone> = {
    active: 'success',
    completed: 'neutral',
    cancelled: 'danger',
};

const roleShort: Record<string, string> = {
    field_agent: 'Hôtesse',
    supervisor: 'Superviseur',
    accountant: 'Comptable',
};

const avatarTone: Record<string, string> = {
    field_agent:
        'from-green-50 to-green-100 text-motriks-deep ring-green-600/10 group-hover:from-green-500 group-hover:to-green-600 group-hover:shadow-green-600/30',
    supervisor:
        'from-blue-50 to-blue-100 text-blue-700 ring-blue-600/10 group-hover:from-blue-500 group-hover:to-blue-600 group-hover:shadow-blue-600/30',
    accountant:
        'from-slate-100 to-slate-200 text-slate-700 ring-slate-500/10 group-hover:from-slate-600 group-hover:to-slate-700 group-hover:shadow-slate-600/30',
};

const iconBtn =
    'flex size-9 items-center justify-center rounded-xl text-slate-400 transition-colors focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none';

function initials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/** « 14/10/2026 » → « 2026-10-14 » (format attendu par <input type="date">). */
function toIso(date: string | null) {
    if (!date) return '';
    const [d, m, y] = date.split('/');
    return y && m && d ? `${y}-${m}-${d}` : '';
}

/* ───────────────────────── Carte affectation ───────────────────────── */

function AffectationCard({ a, onEdit, onDelete }: { a: Item; onEdit: () => void; onDelete: () => void }) {
    return (
        <GlowCard className="h-full" contentClassName="flex h-full flex-col">
            <div className="flex flex-1 flex-col gap-5 p-5">
                {/* Membre + statut */}
                <div className="flex items-start gap-4">
                    <div
                        className={cn(
                            'flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold shadow-none ring-1 ring-inset transition duration-300 group-hover:text-white group-hover:shadow-lg group-hover:ring-0',
                            avatarTone[a.agent_role] ?? avatarTone.accountant,
                        )}
                    >
                        {initials(a.agent_name)}
                    </div>

                    <div className="min-w-0 flex-1">
                        <Link
                            href={personnelShow({ personnel: a.agent_id }).url}
                            className="block truncate text-base font-semibold text-ink transition-colors hover:text-motriks-deep focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                        >
                            {a.agent_name}
                        </Link>
                        <div className="mt-1.5">
                            <StatusBadge tone="info">{roleShort[a.agent_role] ?? a.agent_role}</StatusBadge>
                        </div>
                    </div>

                    <StatusBadge tone={statusTone[a.status] ?? 'neutral'}>{a.status_label}</StatusBadge>
                </div>

                {/* Site */}
                <Link
                    href={siteShow({ site: a.site_id }).url}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3 transition-colors hover:bg-green-50 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-motriks shadow-sm ring-1 ring-slate-200/70">
                        <Store className="size-4" />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{a.site_name}</span>
                        <span className="block truncate text-xs text-slate-500">{a.site_city}</span>
                    </span>
                </Link>

                {/* Détails */}
                <dl className="flex flex-col gap-2.5 text-sm">
                    <div className="flex items-center gap-3 text-slate-600">
                        <CalendarRange className="size-4 shrink-0 text-slate-400" />
                        <dd className="truncate tabular-nums">
                            {a.starts_on} <span className="text-slate-400">→</span> {a.ends_on ?? 'Permanent'}
                        </dd>
                    </div>

                    <div className={cn('flex items-center gap-3', a.slot_start && a.slot_end ? 'text-slate-600' : 'text-slate-400')}>
                        <Clock className="size-4 shrink-0 text-slate-400" />
                        <dd className="tabular-nums">
                            {a.slot_start && a.slot_end ? `${a.slot_start} – ${a.slot_end}` : 'Pas de créneau défini'}
                        </dd>
                    </div>

                    {a.notes && (
                        <div className="flex items-start gap-3 text-slate-500">
                            <StickyNote className="mt-0.5 size-4 shrink-0 text-slate-400" />
                            <dd className="line-clamp-2 text-xs leading-relaxed">{a.notes}</dd>
                        </div>
                    )}
                </dl>
            </div>

            {/* Pied de carte */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 py-2.5 pr-3 pl-5">
                <span className={cn('flex items-center gap-2 text-xs', a.is_current ? 'font-medium text-motriks-deep' : 'text-slate-400')}>
                    {a.is_current ? (
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
                            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                        </span>
                    ) : (
                        <span className="size-2 rounded-full bg-slate-300" />
                    )}
                    {a.is_current ? 'En poste' : 'Hors poste'}
                </span>

                <div className="flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        onClick={onEdit}
                        title="Modifier"
                        aria-label={`Modifier l'affectation de ${a.agent_name}`}
                        className={cn(iconBtn, 'hover:bg-green-50 hover:text-motriks-deep')}
                    >
                        <Pencil className="size-[18px]" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        title="Supprimer"
                        aria-label={`Supprimer l'affectation de ${a.agent_name}`}
                        className={cn(iconBtn, 'hover:bg-red-50 hover:text-red-600')}
                    >
                        <Trash2 className="size-[18px]" />
                    </button>
                </div>
            </div>
        </GlowCard>
    );
}

/* ───────────────────── Fenêtre de modification ───────────────────── */

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <section className="grid gap-4">
            <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="h-3.5 w-0.5 rounded-full bg-motriks" aria-hidden="true" />
                    {title}
                </h4>
                {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
            </div>
            {children}
        </section>
    );
}

/* ───────────────────── Fenêtre de création ───────────────────── */

type CreateDialogProps = {
    sites: AffectationSelectOption[];
    staff: AffectationSelectOption[];
    onClose: () => void;
};

function CreateAffectationDialog({ sites, staff, onClose }: CreateDialogProps) {
    const { data, setData, post, processing, errors } = useForm({
        site_id: '' as number | '',
        user_id: '' as number | '',
        starts_on: '',
        ends_on: '',
        slot_start: '',
        slot_end: '',
        notes: '',
    });

    const close = useCallback(() => {
        if (!processing) onClose();
    }, [processing, onClose]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(affectationStore().url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Affectation créée', { description: 'Le membre a bien été affecté au site.' });
                onClose();
            },
            onError: toastFormError,
        });
    };

    return (
        <Modal onClose={close} title="Nouvelle affectation" description="Assignez un membre à un point de vente." size="lg" icon={<Plus />}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-8 overflow-y-auto px-6 pt-4 pb-6">
                    <Section title="Qui et où">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Membre" htmlFor="new-user_id" required error={errors.user_id}>
                                <SelectInput
                                    id="new-user_id"
                                    icon={User}
                                    value={data.user_id}
                                    onChange={(e) => setData('user_id', Number(e.target.value) || '')}
                                    error={errors.user_id}
                                    required
                                >
                                    <option value="">Choisir un membre…</option>
                                    {staff.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label} ({s.role_label})</option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field label="Site" htmlFor="new-site_id" required error={errors.site_id}>
                                <SelectInput
                                    id="new-site_id"
                                    icon={MapPin}
                                    value={data.site_id}
                                    onChange={(e) => setData('site_id', Number(e.target.value) || '')}
                                    error={errors.site_id}
                                    required
                                >
                                    <option value="">Choisir un site…</option>
                                    {sites.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </div>
                    </Section>

                    <Section title="Période">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Date de début" htmlFor="new-starts_on" required error={errors.starts_on}>
                                <TextInput
                                    id="new-starts_on"
                                    type="date"
                                    icon={CalendarRange}
                                    value={data.starts_on}
                                    onChange={(e) => setData('starts_on', e.target.value)}
                                    error={errors.starts_on}
                                    required
                                />
                            </Field>
                            <Field label="Date de fin" htmlFor="new-ends_on" hint="(vide = permanent)" error={errors.ends_on}>
                                <TextInput
                                    id="new-ends_on"
                                    type="date"
                                    icon={CalendarRange}
                                    value={data.ends_on}
                                    onChange={(e) => setData('ends_on', e.target.value)}
                                    error={errors.ends_on}
                                />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Créneau horaire" hint="Optionnel. Heures de prise de poste attendues.">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Heure de début" htmlFor="new-slot_start" error={errors.slot_start}>
                                <TextInput
                                    id="new-slot_start"
                                    type="time"
                                    icon={Clock}
                                    value={data.slot_start}
                                    onChange={(e) => setData('slot_start', e.target.value)}
                                    error={errors.slot_start}
                                />
                            </Field>
                            <Field label="Heure de fin" htmlFor="new-slot_end" error={errors.slot_end}>
                                <TextInput
                                    id="new-slot_end"
                                    type="time"
                                    icon={Clock}
                                    value={data.slot_end}
                                    onChange={(e) => setData('slot_end', e.target.value)}
                                    error={errors.slot_end}
                                />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Notes internes">
                        <Field label="Notes" htmlFor="new-notes" hint="(optionnel)" error={errors.notes}>
                            <TextArea
                                id="new-notes"
                                icon={FileText}
                                rows={3}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Instructions particulières, contexte…"
                                error={errors.notes}
                            />
                        </Field>
                    </Section>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-green-100 bg-white px-6 py-4">
                    <ActionButton type="button" variant="secondary" onClick={close} disabled={processing}>
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" loading={processing}>
                        {processing ? 'Enregistrement…' : "Créer l'affectation"}
                    </ActionButton>
                </div>
            </form>
        </Modal>
    );
}

type EditDialogProps = {
    affectation: Item;
    sites: AffectationSelectOption[];
    staff: AffectationSelectOption[];
    statuses: StatusOption[];
    onClose: () => void;
};

function EditAffectationDialog({ affectation, sites, staff, statuses, onClose }: EditDialogProps) {
    const { data, setData, put, processing, errors } = useForm({
        site_id: affectation.site_id as number | '',
        user_id: affectation.agent_id as number | '',
        starts_on: toIso(affectation.starts_on),
        ends_on: toIso(affectation.ends_on),
        slot_start: affectation.slot_start ?? '',
        slot_end: affectation.slot_end ?? '',
        status: affectation.status,
        notes: affectation.notes ?? '',
    });

    // Pas de fermeture accidentelle pendant l'enregistrement.
    const close = useCallback(() => {
        if (!processing) onClose();
    }, [processing, onClose]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(affectationUpdate({ affectation: affectation.id }).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Affectation mise à jour', { description: 'Les modifications sont enregistrées.' });
                onClose();
            },
            onError: toastFormError,
        });
    };

    return (
        <Modal
            onClose={close}
            title="Modifier l'affectation"
            description={`${affectation.agent_name} · ${affectation.site_name}`}
            size="lg"
            icon={<Pencil />}
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-8 overflow-y-auto px-6 pt-4 pb-6">
                    <Section title="Qui et où">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Membre" htmlFor="edit-user_id" required error={errors.user_id}>
                                <SelectInput
                                    id="edit-user_id"
                                    icon={User}
                                    value={data.user_id}
                                    onChange={(e) => setData('user_id', Number(e.target.value) || '')}
                                    error={errors.user_id}
                                    required
                                >
                                    <option value="">Choisir…</option>
                                    {staff.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label} ({s.role_label})</option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field label="Site" htmlFor="edit-site_id" required error={errors.site_id}>
                                <SelectInput
                                    id="edit-site_id"
                                    icon={MapPin}
                                    value={data.site_id}
                                    onChange={(e) => setData('site_id', Number(e.target.value) || '')}
                                    error={errors.site_id}
                                    required
                                >
                                    <option value="">Choisir…</option>
                                    {sites.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field label="Statut" htmlFor="edit-status" required error={errors.status} className="sm:col-span-2">
                                <SelectInput
                                    id="edit-status"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    error={errors.status}
                                    required
                                >
                                    {statuses.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </div>
                    </Section>

                    <Section title="Période">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Date de début" htmlFor="edit-starts_on" required error={errors.starts_on}>
                                <TextInput
                                    id="edit-starts_on"
                                    type="date"
                                    icon={CalendarRange}
                                    value={data.starts_on}
                                    onChange={(e) => setData('starts_on', e.target.value)}
                                    error={errors.starts_on}
                                    required
                                />
                            </Field>
                            <Field label="Date de fin" htmlFor="edit-ends_on" hint="(vide = permanent)" error={errors.ends_on}>
                                <TextInput
                                    id="edit-ends_on"
                                    type="date"
                                    icon={CalendarRange}
                                    value={data.ends_on}
                                    onChange={(e) => setData('ends_on', e.target.value)}
                                    error={errors.ends_on}
                                />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Créneau horaire" hint="Optionnel. Heures de prise de poste attendues.">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Heure de début" htmlFor="edit-slot_start" error={errors.slot_start}>
                                <TextInput
                                    id="edit-slot_start"
                                    type="time"
                                    icon={Clock}
                                    value={data.slot_start}
                                    onChange={(e) => setData('slot_start', e.target.value)}
                                    error={errors.slot_start}
                                />
                            </Field>
                            <Field label="Heure de fin" htmlFor="edit-slot_end" error={errors.slot_end}>
                                <TextInput
                                    id="edit-slot_end"
                                    type="time"
                                    icon={Clock}
                                    value={data.slot_end}
                                    onChange={(e) => setData('slot_end', e.target.value)}
                                    error={errors.slot_end}
                                />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Notes internes">
                        <Field label="Notes" htmlFor="edit-notes" hint="(optionnel)" error={errors.notes}>
                            <TextArea
                                id="edit-notes"
                                icon={FileText}
                                rows={3}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                error={errors.notes}
                            />
                        </Field>
                    </Section>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-green-100 bg-white px-6 py-4">
                    <ActionButton type="button" variant="secondary" onClick={close} disabled={processing}>
                        Annuler
                    </ActionButton>
                    <ActionButton type="submit" loading={processing}>
                        {processing ? 'Enregistrement…' : 'Enregistrer'}
                    </ActionButton>
                </div>
            </form>
        </Modal>
    );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function AffectationsIndex({ affectations, stats, sites, staff, statuses }: Props) {
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [currentOnly, setCurrentOnly] = useState(false);
    const [query, setQuery] = useState('');

    // Fenêtre montée uniquement quand elle est visible (le formulaire repart de zéro à chaque ouverture).
    const [editing, setEditing] = useState<Item | null>(null);
    const closeEdit = useCallback(() => setEditing(null), []);

    // Fenêtre de création (même principe : montée seulement quand elle est visible).
    const [creating, setCreating] = useState(false);
    const closeCreate = useCallback(() => setCreating(false), []);

    // La fenêtre n'est disponible que si le contrôleur envoie les listes (sites, membres, statuts).
    const canEditInModal = Boolean(sites && staff && statuses);

    const openEdit = (a: Item) => {
        if (!canEditInModal) {
            router.visit(affectationEdit({ affectation: a.id }).url);
            return;
        }
        setEditing(a);
    };

    // Bouton « nouvelle affectation » : ouvre la fenêtre si possible, sinon l'ancienne page.
    const newButton = (label: string) =>
        canEditInModal ? (
            <ActionButton type="button" onClick={() => setCreating(true)}>
                <span className="inline-flex items-center gap-2">
                    <Plus className="size-4" />
                    {label}
                </span>
            </ActionButton>
        ) : (
            <ActionLink href={affectationCreate().url} icon={<Plus />}>
                {label}
            </ActionLink>
        );

    const { ask, dialog } = useDeleteDialog<AffectationListItem>({
        getUrl: (a) => affectationDestroy({ affectation: a.id }).url,
        getTitle: () => 'Supprimer cette affectation ?',
        getDescription: (a) => `${a.agent_name} ne sera plus affecté(e) au site « ${a.site_name} ». Cette action est définitive.`,
        getSuccessMessage: (a) => `L'affectation de ${a.agent_name} a été supprimée.`,
    });

    const cancelledCount = affectations.filter((a) => a.status === 'cancelled').length;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        return affectations.filter((a) => {
            if (filter !== 'all' && a.status !== filter) return false;
            if (currentOnly && !a.is_current) return false;
            if (q && !(a.agent_name.toLowerCase().includes(q) || a.site_name.toLowerCase().includes(q) || a.site_city.toLowerCase().includes(q))) {
                return false;
            }
            return true;
        });
    }, [affectations, filter, currentOnly, query]);

    const hasFilters = filter !== 'all' || currentOnly || query.trim() !== '';

    const resetFilters = () => {
        setFilter('all');
        setCurrentOnly(false);
        setQuery('');
    };

    const filters: { value: FilterStatus; label: string; count: number }[] = [
        { value: 'all', label: 'Toutes', count: stats.total },
        { value: 'active', label: 'Actives', count: stats.active },
        { value: 'completed', label: 'Terminées', count: stats.completed },
        ...(cancelledCount > 0 ? [{ value: 'cancelled' as const, label: 'Annulées', count: cancelledCount }] : []),
    ];

    return (
        <>
            <Head title="Affectations" />
            <GlowStyles />

            <Page
                title="Affectations"
                description="Qui travaille où et à quelle période."
                actions={newButton('Nouvelle affectation')}
            >
                {affectations.length === 0 ? (
                    <Panel>
                        <EmptyState
                            icon={CalendarRange}
                            title="Aucune affectation"
                            description="Assignez vos hôtesses et superviseurs à vos sites."
                            action={newButton('Créer la première affectation')}
                        />
                    </Panel>
                ) : (
                    <div className="flex flex-col gap-6">
                        <MetricStrip
                            items={[
                                { label: 'Total', value: stats.total },
                                { label: 'Actives', value: stats.active },
                                { label: 'En cours', value: stats.current, live: stats.current > 0 },
                                { label: 'Terminées', value: stats.completed },
                            ]}
                        />

                        {/* Recherche + filtres */}
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="w-full lg:max-w-sm">
                                <TextInput
                                    icon={Search}
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Rechercher un membre ou un site"
                                    aria-label="Rechercher une affectation"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                                    >
                                        <X className="size-3.5" />
                                        Réinitialiser
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setCurrentOnly((v) => !v)}
                                    aria-pressed={currentOnly}
                                    className={cn(
                                        'inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none',
                                        currentOnly
                                            ? 'border-green-600/30 bg-green-50 text-motriks-deep'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                                    )}
                                >
                                    <span className={cn('size-2 rounded-full', currentOnly ? 'bg-motriks' : 'bg-slate-300')} />
                                    En poste
                                    <span className={cn('tabular-nums', currentOnly ? 'text-motriks-deep/70' : 'text-slate-400')}>{stats.current}</span>
                                </button>

                                <div role="group" aria-label="Filtrer par statut" className="inline-flex rounded-xl bg-slate-100 p-1">
                                    {filters.map((f) => {
                                        const active = filter === f.value;

                                        return (
                                            <button
                                                key={f.value}
                                                type="button"
                                                onClick={() => setFilter(f.value)}
                                                aria-pressed={active}
                                                className={cn(
                                                    'inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none',
                                                    active ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-800',
                                                )}
                                            >
                                                {f.label}
                                                <span className={cn('tabular-nums', active ? 'text-motriks-deep' : 'text-slate-400')}>{f.count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <Panel>
                                <EmptyState
                                    icon={Search}
                                    title="Aucun résultat"
                                    description="Aucune affectation ne correspond à votre recherche ou à ces filtres."
                                    action={
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    }
                                />
                            </Panel>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {filtered.map((a) => (
                                    <AffectationCard key={a.id} a={a} onEdit={() => openEdit(a)} onDelete={() => ask(a)} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Page>

            {editing && sites && staff && statuses && (
                <EditAffectationDialog
                    key={editing.id}
                    affectation={editing}
                    sites={sites}
                    staff={staff}
                    statuses={statuses}
                    onClose={closeEdit}
                />
            )}

            {creating && sites && staff && <CreateAffectationDialog sites={sites} staff={staff} onClose={closeCreate} />}

            {dialog}
        </>
    );
}

AffectationsIndex.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Affectations', href: affectationsIndex() },
    ],
};