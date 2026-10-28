import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Building2,
    CalendarRange,
    Clock,
    Fuel,
    ImagePlus,
    MapPin,
    Package,
    PackagePlus,
    Pencil,
    Phone,
    Pill,
    Plus,
    Shirt,
    ShoppingBasket,
    ShoppingCart,
    Store,
    Timer,
    Trash2,
    User,
    Users,
    Warehouse,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { ActionButton, Spinner } from '@/components/page/buttons';
import { useDeleteDialog } from '@/components/page/confirm-dialog';
import { EmptyState } from '@/components/page/empty-state';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { Page } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import { MetricStrip } from '@/components/page/surface';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { store as affectationStore, destroy as affectationDestroy, permuter as affectationPermuter } from '@/routes/affectations';
import { show as personnelShow } from '@/routes/personnel';
import { index as sitesIndex, destroy as siteDestroy } from '@/routes/sites';
import { store as inventoryStore, update as inventoryUpdate, destroy as inventoryDestroy, restock as inventoryRestock } from '@/routes/sites/inventory';
import { show as dailyReportShow } from '@/routes/daily-reports';
import type { SiteAffectation, SiteDetail, SiteStatusOption, SiteTypeOption, SiteVisit } from '@/types';
import { EditSiteModal } from './edit-site-modal';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ChartPoint = { label: string; count: number };
type ChartData = { week: ChartPoint[]; month: ChartPoint[]; year: ChartPoint[] };

type SiteStats = {
    total_visits: number;
    visits_this_month: number;
    avg_duration: number;
    completed_visits: number;
    revenue_all_time: number;
    revenue_this_month: number;
    units_sold_this_month: number;
    reports_submitted: number;
};

type HostessRecord = {
    agent_id: number;
    agent_name: string;
    agent_phone: string | null;
    role_label: string;
    visit_count: number;
    first_date: string;
    last_date: string;
    is_current: boolean;
};

type StaffOption = { value: number; label: string; role_label: string };

type InventoryItem = {
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string | null;
    product_unit: string;
    product_price: string | null;
    product_image_url: string | null;
    current_stock: number;
    alert_threshold: number;
    critical_threshold: number;
    stock_status: 'normal' | 'warning' | 'critical';
    updated_at: string;
};

type ProductOption = { value: number; label: string; unit: string };

type StockMovementItem = {
    id: number;
    date: string;
    product_name: string | null;
    type: 'initial' | 'restock' | 'sale' | 'adjustment' | 'correction';
    type_label: string;
    quantity: number;
    stock_after: number;
    author: string | null;
    notes: string | null;
    daily_report_id: number | null;
};

type Props = {
    site: SiteDetail & {
        photos: string[];
        photos_count: number;
    };
    stats: SiteStats;
    chart: ChartData;
    affectations: SiteAffectation[];
    recent_visits: SiteVisit[];
    hostess_history: HostessRecord[];
    available_staff: StaffOption[];
    inventory: InventoryItem[];
    stock_movements: StockMovementItem[];
    available_products: ProductOption[];
    types: SiteTypeOption[];
    statuses: SiteStatusOption[];
};

type AssignState =
    | { open: false }
    | { open: true; mode: 'assign' }
    | { open: true; mode: 'permuter'; replacingId: number; replacingName: string };

type TabKey = 'apercu' | 'equipe' | 'inventaire' | 'visites' | 'photos';
type Period = 'week' | 'month' | 'year';

/* -------------------------------------------------------------------------- */
/*  Constantes et utilitaires                                                 */
/* -------------------------------------------------------------------------- */

const TAB_KEYS: TabKey[] = ['apercu', 'equipe', 'inventaire', 'visites', 'photos'];

const PERIOD_LABELS: Record<Period, string> = {
    week: '7 jours',
    month: '30 jours',
    year: '12 mois',
};

const statusTone: Record<string, StatusTone> = {
    in_progress: 'info',
    completed: 'success',
    incomplete: 'warning',
    flagged: 'danger',
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

const stockStyle: Record<InventoryItem['stock_status'], { chip: string; bar: string; label: string }> = {
    normal: { chip: 'bg-green-50 text-green-700 ring-green-600/15', bar: 'bg-green-500', label: 'Normal' },
    warning: { chip: 'bg-amber-50 text-amber-700 ring-amber-600/20', bar: 'bg-amber-400', label: 'Alerte' },
    critical: { chip: 'bg-red-50 text-red-700 ring-red-600/15', bar: 'bg-red-500', label: 'Critique' },
};

function formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} K`;
    return amount.toFixed(0);
}

function formatDuration(minutes: number | null): string {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function initialsOf(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function tabFromHash(): TabKey {
    if (typeof window === 'undefined') return 'apercu';
    const hash = window.location.hash.replace('#', '') as TabKey;
    return TAB_KEYS.includes(hash) ? hash : 'apercu';
}

/* -------------------------------------------------------------------------- */
/*  Briques d'interface                                                       */
/* -------------------------------------------------------------------------- */

function Section({
    title,
    description,
    actions,
    children,
}: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
                <div>
                    <h2 className="text-sm font-semibold text-ink">{title}</h2>
                    {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
                </div>
                {actions}
            </header>
            <div className="border-t border-slate-100">{children}</div>
        </section>
    );
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-green-100 font-semibold text-motriks-deep ring-1 ring-inset ring-green-600/10',
                size === 'sm' ? 'size-9 text-xs' : 'size-10 text-sm',
            )}
        >
            {initialsOf(name)}
        </div>
    );
}

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</p>
                <div className="mt-0.5 text-sm font-medium text-ink">{children}</div>
            </div>
        </div>
    );
}

const muted = <span className="font-normal text-slate-400">Non renseigné</span>;

function Tabs({
    tabs,
    active,
    onChange,
}: {
    tabs: { key: TabKey; label: string; badge?: React.ReactNode }[];
    active: TabKey;
    onChange: (key: TabKey) => void;
}) {
    return (
        <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200/80 px-1">
            {tabs.map((t) => {
                const selected = t.key === active;
                return (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => onChange(t.key)}
                        className={cn(
                            '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none',
                            selected ? 'border-motriks text-ink' : 'border-transparent text-slate-500 hover:text-ink',
                        )}
                    >
                        {t.label}
                        {t.badge !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                                    selected ? 'bg-motriks-soft text-motriks-deep' : 'bg-slate-100 text-slate-500',
                                )}
                            >
                                {t.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Modals (formulaires)                                                      */
/* -------------------------------------------------------------------------- */

function ModalFooter({ onCancel, saving, submitLabel, savingLabel, disabled }: { onCancel: () => void; saving: boolean; submitLabel: string; savingLabel: string; disabled?: boolean }) {
    return (
        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <ActionButton type="button" variant="secondary" onClick={onCancel} disabled={saving}>
                Annuler
            </ActionButton>
            <ActionButton type="submit" loading={saving} disabled={disabled}>
                {saving ? savingLabel : submitLabel}
            </ActionButton>
        </footer>
    );
}

function InventoryAddModal({ siteId, products, onClose }: { siteId: number; products: ProductOption[]; onClose: () => void }) {
    const [productId, setProductId] = useState('');
    const [currentStock, setCurrentStock] = useState('0');
    const [alertThreshold, setAlertThreshold] = useState('10');
    const [criticalThreshold, setCriticalThreshold] = useState('5');
    const [saving, setSaving] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            inventoryStore({ site: siteId }).url,
            {
                product_id: Number(productId),
                current_stock: Number(currentStock),
                alert_threshold: Number(alertThreshold),
                critical_threshold: Number(criticalThreshold),
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => {
                    toast.success("Produit ajouté à l'inventaire");
                    onClose();
                },
                onError: toastFormError,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Modal onClose={() => !saving && onClose()} title="Ajouter un produit" description="Suivez le stock et recevez des alertes.">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <Field label="Produit" htmlFor="inv_product" required>
                        <SelectInput id="inv_product" value={productId} onChange={(e) => setProductId(e.target.value)} required>
                            <option value="">Choisir un produit…</option>
                            {products.map((p) => (
                                <option key={p.value} value={p.value}>{p.label} · {p.unit}</option>
                            ))}
                        </SelectInput>
                    </Field>

                    <Field label="Stock actuel" htmlFor="inv_stock">
                        <TextInput id="inv_stock" type="number" min="0" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} required />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Seuil d'alerte" htmlFor="inv_alert" hint="en dessous : orange">
                            <TextInput id="inv_alert" type="number" min="0" value={alertThreshold} onChange={(e) => setAlertThreshold(e.target.value)} required />
                        </Field>
                        <Field label="Seuil critique" htmlFor="inv_critical" hint="en dessous : rouge">
                            <TextInput id="inv_critical" type="number" min="0" value={criticalThreshold} onChange={(e) => setCriticalThreshold(e.target.value)} required />
                        </Field>
                    </div>
                </div>
                <ModalFooter onCancel={onClose} saving={saving} submitLabel="Ajouter" savingLabel="Ajout…" disabled={!productId} />
            </form>
        </Modal>
    );
}

function StockModal({ siteId, item, onClose }: { siteId: number; item: InventoryItem; onClose: () => void }) {
    const [current, setCurrent] = useState(String(item.current_stock));
    const [alert, setAlert] = useState(String(item.alert_threshold));
    const [critical, setCritical] = useState(String(item.critical_threshold));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.put(
            inventoryUpdate({ site: siteId, inventory: item.id }).url,
            {
                current_stock: Number(current),
                alert_threshold: Number(alert),
                critical_threshold: Number(critical),
                notes: notes || null,
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => {
                    toast.success('Stock mis à jour', { description: item.product_name });
                    onClose();
                },
                onError: toastFormError,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Modal onClose={() => !saving && onClose()} title="Inventaire et seuils" description={`${item.product_name} · pour une livraison, utilisez plutôt « Réassort ».`}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <Field label={`Stock compté (${item.product_unit})`} htmlFor="stk_current" hint="l'écart avec le stock actuel est inscrit dans le journal">
                        <TextInput id="stk_current" type="number" min="0" value={current} onChange={(e) => setCurrent(e.target.value)} required autoFocus />
                    </Field>
                    {Number(current) !== item.current_stock && (
                        <Field label="Motif de l'écart" htmlFor="stk_notes">
                            <TextInput id="stk_notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Ex. inventaire mensuel, casse, vol…" />
                        </Field>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Seuil d'alerte" htmlFor="stk_alert" hint="en dessous : orange">
                            <TextInput id="stk_alert" type="number" min="0" value={alert} onChange={(e) => setAlert(e.target.value)} required />
                        </Field>
                        <Field label="Seuil critique" htmlFor="stk_critical" hint="en dessous : rouge">
                            <TextInput id="stk_critical" type="number" min="0" value={critical} onChange={(e) => setCritical(e.target.value)} required />
                        </Field>
                    </div>
                </div>
                <ModalFooter onCancel={onClose} saving={saving} submitLabel="Enregistrer" savingLabel="Enregistrement…" />
            </form>
        </Modal>
    );
}

function RestockModal({ siteId, item, onClose }: { siteId: number; item: InventoryItem; onClose: () => void }) {
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            inventoryRestock({ site: siteId, inventory: item.id }).url,
            { quantity: Number(quantity), notes: notes || null },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => {
                    toast.success('Réassort enregistré', { description: `${item.product_name} : +${quantity}` });
                    onClose();
                },
                onError: toastFormError,
                onFinish: () => setSaving(false),
            },
        );
    };

    const after = item.current_stock + (Number(quantity) || 0);

    return (
        <Modal onClose={() => !saving && onClose()} title="Réassort" description={`${item.product_name} · stock actuel ${item.current_stock} ${item.product_unit}`}>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <Field label={`Quantité livrée (${item.product_unit})`} htmlFor="rst_qty" hint={quantity ? `nouveau stock : ${after}` : undefined}>
                        <TextInput id="rst_qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required autoFocus />
                    </Field>
                    <Field label="Note" htmlFor="rst_notes">
                        <TextInput id="rst_notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Ex. bon de livraison n° 1245" />
                    </Field>
                </div>
                <ModalFooter onCancel={onClose} saving={saving} submitLabel="Ajouter au stock" savingLabel="Enregistrement…" disabled={!(Number(quantity) > 0)} />
            </form>
        </Modal>
    );
}

/** Journal des mouvements de stock du site. */
function StockMovements({ movements }: { movements: StockMovementItem[] }) {
    if (movements.length === 0) {
        return null;
    }

    return (
        <Section title="Mouvements de stock" description="Les 50 derniers changements du stock de ce site, du plus récent au plus ancien.">
            <ul className="divide-y divide-slate-100">
                {movements.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-ink">
                                {m.product_name ?? 'Produit retiré'} <span className="font-normal text-slate-500">· {m.type_label}</span>
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {m.date}
                                {m.author && <> · {m.author}</>}
                                {m.notes && <> · {m.notes}</>}
                                {m.daily_report_id && (
                                    <>
                                        {' · '}
                                        <Link href={dailyReportShow({ dailyReport: m.daily_report_id }).url} className="font-semibold text-motriks-deep hover:underline">
                                            voir le rapport
                                        </Link>
                                    </>
                                )}
                            </p>
                        </div>
                        <span className={cn('w-16 text-right font-semibold tabular-nums', m.quantity > 0 ? 'text-motriks-deep' : m.quantity < 0 ? 'text-red-600' : 'text-slate-400')}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                        <span className="w-20 text-right text-xs text-slate-500 tabular-nums">stock {m.stock_after}</span>
                    </li>
                ))}
            </ul>
        </Section>
    );
}

function AssignModal({
    modal,
    siteId,
    staff,
    onClose,
}: {
    modal: AssignState & { open: true };
    siteId: number;
    staff: StaffOption[];
    onClose: () => void;
}) {
    const today = new Date().toISOString().split('T')[0];
    const [userId, setUserId] = useState('');
    const [startsOn, setStartsOn] = useState(today);
    const [endsOn, setEndsOn] = useState('');
    const [slotStart, setSlotStart] = useState('');
    const [slotEnd, setSlotEnd] = useState('');
    const [saving, setSaving] = useState(false);

    const isSwap = modal.mode === 'permuter';

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !startsOn) return;

        const data = {
            user_id: Number(userId),
            starts_on: startsOn,
            ends_on: endsOn || undefined,
            slot_start: slotStart || undefined,
            slot_end: slotEnd || undefined,
        };

        const options = {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onSuccess: () => {
                toast.success(isSwap ? 'Permutation effectuée' : 'Affectation créée');
                onClose();
            },
            onError: toastFormError,
            onFinish: () => setSaving(false),
        };

        if (modal.mode === 'permuter') {
            router.post(affectationPermuter({ affectation: modal.replacingId }).url, data, options);
        } else {
            router.post(affectationStore().url, { ...data, site_id: siteId }, options);
        }
    };

    return (
        <Modal
            onClose={() => !saving && onClose()}
            title={isSwap ? "Permuter l'hôtesse" : 'Affecter un membre'}
            description={isSwap ? `Remplace ${modal.replacingName}` : 'Choisissez un membre et sa période.'}
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <Field label="Hôtesse / Superviseur" htmlFor="as_user" required>
                        <SelectInput id="as_user" icon={User} value={userId} onChange={(e) => setUserId(e.target.value)} required>
                            <option value="">Choisir un membre…</option>
                            {staff.map((s) => (
                                <option key={s.value} value={s.value}>{s.label} · {s.role_label}</option>
                            ))}
                        </SelectInput>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Début" htmlFor="as_start" required>
                            <TextInput id="as_start" type="date" icon={CalendarRange} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />
                        </Field>
                        <Field label="Fin" htmlFor="as_end" hint="(optionnel)">
                            <TextInput id="as_end" type="date" icon={CalendarRange} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Heure de début" htmlFor="as_slot_start">
                            <TextInput id="as_slot_start" type="time" icon={Clock} value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
                        </Field>
                        <Field label="Heure de fin" htmlFor="as_slot_end">
                            <TextInput id="as_slot_end" type="time" icon={Clock} value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
                        </Field>
                    </div>
                </div>
                <ModalFooter
                    onCancel={onClose}
                    saving={saving}
                    submitLabel={isSwap ? 'Permuter' : 'Affecter'}
                    savingLabel="Enregistrement…"
                    disabled={!userId || !startsOn}
                />
            </form>
        </Modal>
    );
}

/* -------------------------------------------------------------------------- */
/*  Photos                                                                    */
/* -------------------------------------------------------------------------- */

function PhotoGallery({ photos, siteId, canAdd }: { photos: string[]; siteId: number; canAdd: boolean }) {
    const [lightbox, setLightbox] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const { ask, dialog } = useDeleteDialog<number>({
        getUrl: (index) => `/sites/${siteId}/photos/${index}`,
        getTitle: () => 'Supprimer cette photo ?',
        getDescription: () => 'La photo sera retirée de la fiche du site.',
        getSuccessMessage: () => 'Photo supprimée.',
    });

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            toast.error('Image trop lourde', { description: 'La taille maximale est de 3 Mo.' });
            e.target.value = '';
            return;
        }
        const form = new FormData();
        form.append('photo', file);
        router.post(`/sites/${siteId}/photos`, form, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setUploading(true),
            onSuccess: () => toast.success('Photo ajoutée'),
            onError: toastFormError,
            onFinish: () => setUploading(false),
        });
        e.target.value = '';
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
                {photos.map((url, i) => (
                    <div key={url + i} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50">
                        <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="size-full cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-105"
                            onClick={() => setLightbox(url)}
                        />
                        <button
                            type="button"
                            onClick={() => ask(i)}
                            aria-label={`Supprimer la photo ${i + 1}`}
                            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 focus-visible:opacity-100"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                ))}

                {canAdd && (
                    <label
                        className={cn(
                            'flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-motriks hover:bg-motriks-soft/40 hover:text-motriks-deep',
                            uploading && 'pointer-events-none opacity-70',
                        )}
                    >
                        {uploading ? <Spinner className="size-5" /> : <ImagePlus className="size-5" />}
                        <span className="text-xs font-medium">{uploading ? 'Envoi…' : 'Ajouter une photo'}</span>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={handleFile}
                            disabled={uploading}
                        />
                    </label>
                )}
            </div>

            {lightbox && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setLightbox(null)}>
                    <img
                        src={lightbox}
                        alt="Aperçu"
                        className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        type="button"
                        aria-label="Fermer"
                        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
                        onClick={() => setLightbox(null)}
                    >
                        <X className="size-5" />
                    </button>
                </div>
            )}
            {dialog}
        </>
    );
}

/* -------------------------------------------------------------------------- */
/*  Graphique d'activité                                                      */
/* -------------------------------------------------------------------------- */

function VisitsChart({ chart }: { chart: ChartData }) {
    const [period, setPeriod] = useState<Period>('month');
    const data = chart[period];

    return (
        <Section
            title="Activité"
            description="Nombre de visites sur la période"
            actions={
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            className={cn(
                                'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                                period === p ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink',
                            )}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>
            }
        >
            <div className="px-2 pt-4 pb-4">
                {data.every((d) => d.count === 0) ? (
                    <div className="flex h-48 items-center justify-center text-sm text-slate-400">Aucune visite sur cette période</div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={period === 'month' ? 4 : 0} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 24px rgb(15 23 42 / 0.08)' }}
                                formatter={(v) => [`${v} visite${Number(v) > 1 ? 's' : ''}`, '']}
                                labelStyle={{ color: '#334155', fontWeight: 600 }}
                                cursor={{ fill: '#ecfdf3' }}
                            />
                            <Bar dataKey="count" fill="#039855" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </Section>
    );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function SiteShow({
    site,
    stats,
    chart,
    affectations,
    recent_visits,
    hostess_history,
    available_staff,
    inventory,
    stock_movements,
    available_products,
    types = [],
    statuses = [],
}: Props) {
    // Supprimer un site : réservé au gérant
    const { manageCompany } = usePage().props.auth.can;
    const [tab, setTabState] = useState<TabKey>(tabFromHash);
    const [assign, setAssign] = useState<AssignState>({ open: false });
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
    const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
    // Ouvre directement le modal quand on arrive depuis l'icône « Modifier » de la liste (?modifier=1)
    const [editingSite, setEditingSite] = useState(
        () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('modifier'),
    );

    const setTab = (key: TabKey) => {
        setTabState(key);
        if (typeof window !== 'undefined') {
            window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${key}`);
        }
    };

    const closeEditSite = () => {
        setEditingSite(false);
        if (typeof window !== 'undefined' && window.location.search.includes('modifier')) {
            window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.hash}`);
        }
    };

    const deleteSite = useDeleteDialog<typeof site>({
        getUrl: (s) => siteDestroy(s.id).url,
        getTitle: (s) => `Supprimer « ${s.name} » ?`,
        getDescription: () => 'Les affectations et visites passées restent consultables.',
        getSuccessMessage: (s) => `« ${s.name} » a été supprimé.`,
        confirmLabel: 'Supprimer',
        icon: Trash2,
    });

    const removeInventory = useDeleteDialog<InventoryItem>({
        getUrl: (i) => inventoryDestroy({ site: site.id, inventory: i.id }).url,
        getTitle: (i) => `Retirer « ${i.product_name} » ?`,
        getDescription: () => "Le produit ne sera plus suivi dans l'inventaire de ce site.",
        getSuccessMessage: (i) => `« ${i.product_name} » retiré de l'inventaire.`,
        confirmLabel: 'Retirer',
    });

    const removeAffectation = useDeleteDialog<SiteAffectation>({
        getUrl: (a) => affectationDestroy({ affectation: a.id }).url,
        getTitle: (a) => `Retirer ${a.agent_name} ?`,
        getDescription: () => 'Cette personne ne sera plus affectée à ce site.',
        getSuccessMessage: (a) => `${a.agent_name} a été retiré(e) du site.`,
        confirmLabel: 'Retirer',
    });

    const completionRate = stats.total_visits > 0 ? Math.round((stats.completed_visits / stats.total_visits) * 100) : 0;
    const stockAlerts = inventory.filter((i) => i.stock_status !== 'normal');
    const TypeIcon = typeIcon[site.type] ?? Building2;
    const hasCoordinates = site.latitude != null && site.longitude != null;
    const canAddPhoto = site.photos_count < 3;

    const openAssign = () => setAssign({ open: true, mode: 'assign' });

    const assignButton = (
        <ActionButton size="sm" icon={<Plus />} onClick={openAssign}>
            Affecter
        </ActionButton>
    );

    const addProductButton =
        available_products.length > 0 ? (
            <ActionButton size="sm" icon={<Plus />} onClick={() => setShowInventoryModal(true)}>
                Ajouter
            </ActionButton>
        ) : undefined;

    return (
        <>
            <Head title={site.name} />

            <Page
                title={site.name}
                description={[site.type_label, site.city, site.region].filter(Boolean).join(' · ')}
                actions={
                    <>
                        <ActionButton variant="secondary" icon={<Pencil />} onClick={() => setEditingSite(true)}>
                            Modifier
                        </ActionButton>
                        {manageCompany && (
                            <ActionButton
                                variant="secondary"
                                icon={<Trash2 />}
                                onClick={() => deleteSite.ask(site)}
                                className="border-transparent bg-transparent text-red-600 shadow-none hover:bg-red-50"
                            >
                                Supprimer
                            </ActionButton>
                        )}
                    </>
                }
            >
                <div className="flex flex-col gap-6">
                    {/* ───────────── Identité du site ───────────── */}
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-green-100 text-motriks-deep ring-1 ring-inset ring-green-600/10">
                                <TypeIcon className="size-6" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge tone={statusTone[site.status] ?? 'neutral'}>{site.status_label}</StatusBadge>
                                    <span className="text-sm text-slate-500">{site.type_label}</span>
                                    {site.code && (
                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">{site.code}</span>
                                    )}
                                </div>

                                <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                                    <Fact icon={Building2} label="Adresse">
                                        {site.address ? (
                                            <>
                                                <span className="block">{site.address}</span>
                                                <span className="block text-xs font-normal text-slate-500">
                                                    {[site.city, site.region].filter(Boolean).join(' · ')}
                                                </span>
                                            </>
                                        ) : (
                                            [site.city, site.region].filter(Boolean).join(' · ')
                                        )}
                                    </Fact>

                                    <Fact icon={User} label="Contact sur place">
                                        {site.contact_name || site.contact_phone ? (
                                            <>
                                                {site.contact_name && <span className="block">{site.contact_name}</span>}
                                                {site.contact_phone && (
                                                    <a
                                                        href={`tel:${site.contact_phone}`}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-motriks-deep hover:underline"
                                                    >
                                                        <Phone className="size-3" />
                                                        {site.contact_phone}
                                                    </a>
                                                )}
                                            </>
                                        ) : (
                                            muted
                                        )}
                                    </Fact>

                                    <Fact icon={Clock} label="Horaires">
                                        {site.opening_time || site.closing_time
                                            ? [site.opening_time, site.closing_time].filter(Boolean).join(' – ')
                                            : muted}
                                    </Fact>

                                    <Fact icon={MapPin} label="Localisation GPS">
                                        {hasCoordinates ? (
                                            <>
                                                <span className="block font-mono text-xs font-normal text-slate-600">
                                                    {Number(site.latitude).toFixed(5)}, {Number(site.longitude).toFixed(5)}
                                                </span>
                                                <a
                                                    href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-medium text-motriks-deep hover:underline"
                                                >
                                                    Voir sur la carte
                                                </a>
                                            </>
                                        ) : (
                                            muted
                                        )}
                                    </Fact>

                                    <Fact icon={Timer} label="Dernière visite">
                                        {site.last_visit_at ?? <span className="font-normal text-slate-400">Jamais</span>}
                                    </Fact>
                                </div>

                                {site.notes && (
                                    <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
                                        {site.notes}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ───────────── Chiffres clés du mois ───────────── */}
                    <MetricStrip
                        items={[
                            { label: 'Visites ce mois-ci', value: stats.visits_this_month, sub: 'depuis le 1er' },
                            { label: "Chiffre d'affaires", value: `${formatCurrency(stats.revenue_this_month)} FCFA`, sub: `${formatCurrency(stats.revenue_all_time)} FCFA au total` },
                            { label: 'Unités vendues', value: stats.units_sold_this_month, sub: 'ce mois-ci' },
                            {
                                label: 'Taux de complétion',
                                value: <span className={completionRate >= 80 ? 'text-motriks-deep' : undefined}>{completionRate}%</span>,
                                sub: `${stats.completed_visits} visites complètes`,
                            },
                        ]}
                    />

                    {/* ───────────── Onglets ───────────── */}
                    <Tabs
                        active={tab}
                        onChange={setTab}
                        tabs={[
                            { key: 'apercu', label: 'Aperçu' },
                            { key: 'equipe', label: 'Équipe', badge: affectations.length },
                            { key: 'inventaire', label: 'Inventaire', badge: inventory.length },
                            { key: 'visites', label: 'Visites' },
                            { key: 'photos', label: 'Photos', badge: `${site.photos_count}/3` },
                        ]}
                    />

                    {/* ───────────── Aperçu ───────────── */}
                    {tab === 'apercu' && (
                        <div className="flex flex-col gap-6">
                            <VisitsChart chart={chart} />

                            <MetricStrip
                                items={[
                                    { label: 'Visites totales', value: stats.total_visits },
                                    { label: 'Durée moyenne', value: formatDuration(stats.avg_duration), sub: 'par visite' },
                                    { label: "CA total", value: `${formatCurrency(stats.revenue_all_time)} FCFA` },
                                    { label: 'Rapports soumis', value: stats.reports_submitted },
                                ]}
                            />

                            <div className="grid gap-6 lg:grid-cols-2">
                                <Section
                                    title="Équipe en poste"
                                    actions={
                                        affectations.length > 0 && (
                                            <button type="button" onClick={() => setTab('equipe')} className="text-xs font-semibold text-motriks-deep hover:underline">
                                                Gérer
                                            </button>
                                        )
                                    }
                                >
                                    {affectations.length === 0 ? (
                                        <EmptyState icon={CalendarRange} title="Aucune affectation" description="Personne n'est encore affecté à ce site." action={assignButton} />
                                    ) : (
                                        <ul className="divide-y divide-slate-100">
                                            {affectations.slice(0, 4).map((a) => (
                                                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                                                    <Avatar name={a.agent_name} size="sm" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-ink">{a.agent_name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {a.slot_start && a.slot_end ? `${a.slot_start} – ${a.slot_end}` : `Depuis le ${a.starts_on}`}
                                                        </p>
                                                    </div>
                                                    {a.is_current && <StatusBadge tone="success">En poste</StatusBadge>}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Section>

                                <Section
                                    title="Stock à surveiller"
                                    actions={
                                        inventory.length > 0 && (
                                            <button type="button" onClick={() => setTab('inventaire')} className="text-xs font-semibold text-motriks-deep hover:underline">
                                                Voir l'inventaire
                                            </button>
                                        )
                                    }
                                >
                                    {inventory.length === 0 ? (
                                        <EmptyState icon={Package} title="Aucun produit suivi" description="Ajoutez des produits à l'inventaire de ce site." action={addProductButton} />
                                    ) : stockAlerts.length === 0 ? (
                                        <p className="px-5 py-8 text-center text-sm text-slate-500">Tous les stocks sont au niveau normal.</p>
                                    ) : (
                                        <ul className="divide-y divide-slate-100">
                                            {stockAlerts.slice(0, 4).map((item) => (
                                                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-ink">{item.product_name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {item.current_stock} {item.product_unit} restant{item.current_stock > 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', stockStyle[item.stock_status].chip)}>
                                                        {stockStyle[item.stock_status].label}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Section>
                            </div>
                        </div>
                    )}

                    {/* ───────────── Équipe ───────────── */}
                    {tab === 'equipe' && (
                        <div className="flex flex-col gap-6">
                            <Section title="Affectées actuellement" description="Les membres en poste sur ce site." actions={assignButton}>
                                {affectations.length === 0 ? (
                                    <EmptyState icon={CalendarRange} title="Aucune affectation" description="Personne n'est encore affecté à ce site." action={assignButton} />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {affectations.map((a) => (
                                            <li key={a.id} className="flex items-center gap-4 px-5 py-4">
                                                <Avatar name={a.agent_name} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Link href={personnelShow({ personnel: a.agent_id }).url} className="text-sm font-semibold text-ink hover:text-motriks-deep">
                                                            {a.agent_name}
                                                        </Link>
                                                        {a.is_current && <StatusBadge tone="success">En poste</StatusBadge>}
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        {a.agent_phone && `${a.agent_phone} · `}
                                                        Depuis le {a.starts_on}
                                                        {a.ends_on && ` · jusqu'au ${a.ends_on}`}
                                                    </p>
                                                    {a.slot_start && a.slot_end && (
                                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                                            <Clock className="size-3" />
                                                            {a.slot_start} – {a.slot_end}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex shrink-0 gap-1">
                                                    <ActionButton
                                                        variant="secondary"
                                                        size="icon"
                                                        icon={<ArrowLeftRight />}
                                                        title="Permuter"
                                                        aria-label="Permuter"
                                                        className="hover:border-green-200 hover:bg-green-50 hover:text-motriks-deep"
                                                        onClick={() => setAssign({ open: true, mode: 'permuter', replacingId: a.id, replacingName: a.agent_name })}
                                                    />
                                                    <ActionButton variant="icon-danger" size="icon" icon={<X />} title="Retirer" aria-label="Retirer" onClick={() => removeAffectation.ask(a)} />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Section>

                            <Section
                                title="Historique de l'équipe"
                                description="Toutes les personnes ayant travaillé sur ce site."
                                actions={<span className="text-xs font-semibold text-slate-400 tabular-nums">{hostess_history.length}</span>}
                            >
                                {hostess_history.length === 0 ? (
                                    <EmptyState icon={Users} title="Aucun historique" description="Les membres affectés à ce site apparaîtront ici." />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {hostess_history.map((h) => (
                                            <li key={h.agent_id}>
                                                <Link href={personnelShow({ personnel: h.agent_id }).url} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-green-50/40">
                                                    <Avatar name={h.agent_name} />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-semibold text-ink group-hover:text-motriks-deep">{h.agent_name}</span>
                                                            {h.is_current && <StatusBadge tone="success">Actif</StatusBadge>}
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            {h.role_label}
                                                            {h.agent_phone && ` · ${h.agent_phone}`}
                                                        </p>
                                                        <p className="text-xs text-slate-400">{h.first_date} → {h.last_date}</p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="text-sm font-semibold text-ink tabular-nums">{h.visit_count}</p>
                                                        <p className="text-xs text-slate-400">visite{h.visit_count !== 1 ? 's' : ''}</p>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Section>
                        </div>
                    )}

                    {/* ───────────── Inventaire ───────────── */}
                    {tab === 'inventaire' && (
                        <Section title="Inventaire" description="Le stock suivi sur ce site." actions={addProductButton}>
                            {inventory.length === 0 ? (
                                <EmptyState icon={Package} title="Aucun produit" description="Ajoutez des produits à suivre sur ce site." action={addProductButton} />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {inventory.map((item) => {
                                        const style = stockStyle[item.stock_status];
                                        const percent = Math.min(100, item.alert_threshold > 0 ? (item.current_stock / item.alert_threshold) * 100 : 100);

                                        return (
                                            <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                                                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                                                    {item.product_image_url ? (
                                                        <img src={item.product_image_url} alt={item.product_name} className="size-full object-cover" />
                                                    ) : (
                                                        <Package className="size-5 text-slate-300" />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="truncate text-sm font-semibold text-ink">{item.product_name}</p>
                                                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', style.chip)}>{style.label}</span>
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                        {item.product_sku && <span className="font-mono">{item.product_sku} · </span>}
                                                        Alerte {item.alert_threshold} · Critique {item.critical_threshold} · mis à jour {item.updated_at}
                                                    </p>
                                                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                                                        <div className={cn('h-1.5 rounded-full transition-all', style.bar)} style={{ width: `${percent}%` }} />
                                                    </div>
                                                </div>

                                                <div className="shrink-0 text-right">
                                                    <p className="text-lg font-semibold text-ink tabular-nums">{item.current_stock}</p>
                                                    <p className="text-xs text-slate-400">{item.product_unit}</p>
                                                </div>

                                                <div className="flex shrink-0 gap-1">
                                                    <ActionButton
                                                        variant="secondary"
                                                        size="icon"
                                                        icon={<PackagePlus />}
                                                        title="Réassort"
                                                        aria-label="Réassort"
                                                        className="hover:border-green-200 hover:bg-green-50 hover:text-motriks-deep"
                                                        onClick={() => setRestockItem(item)}
                                                    />
                                                    <ActionButton
                                                        variant="secondary"
                                                        size="icon"
                                                        icon={<Pencil />}
                                                        title="Modifier le stock"
                                                        aria-label="Modifier le stock"
                                                        className="hover:border-green-200 hover:bg-green-50 hover:text-motriks-deep"
                                                        onClick={() => setStockItem(item)}
                                                    />
                                                    <ActionButton variant="icon-danger" size="icon" icon={<Trash2 />} title="Retirer" aria-label="Retirer" onClick={() => removeInventory.ask(item)} />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Section>
                    )}
                    {tab === 'inventaire' && <StockMovements movements={stock_movements} />}

                    {/* ───────────── Visites ───────────── */}
                    {tab === 'visites' && (
                        <Section title="Visites récentes" description="Les 10 dernières prises de poste sur ce site.">
                            {recent_visits.length === 0 ? (
                                <EmptyState icon={Timer} title="Aucune visite enregistrée" description="Les pointages de vos hôtesses apparaîtront ici." />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {recent_visits.map((visit) => (
                                        <li key={visit.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                                            <Avatar name={visit.agent_name ?? '?'} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-ink">{visit.agent_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {visit.checked_in_at}
                                                    {visit.checked_out_at && ` → ${visit.checked_out_at}`}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-3">
                                                {visit.duration_minutes != null && (
                                                    <span className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                                                        <Clock className="size-3" />
                                                        {formatDuration(visit.duration_minutes)}
                                                    </span>
                                                )}
                                                <StatusBadge tone={statusTone[visit.status] ?? 'neutral'}>{visit.status_label}</StatusBadge>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}

                    {/* ───────────── Photos ───────────── */}
                    {tab === 'photos' && (
                        <Section
                            title="Photos du site"
                            description="Jusqu'à 3 photos pour reconnaître le point de vente."
                            actions={<span className="text-xs font-semibold text-slate-400 tabular-nums">{site.photos_count}/3</span>}
                        >
                            <PhotoGallery photos={site.photos ?? []} siteId={site.id} canAdd={canAddPhoto} />
                        </Section>
                    )}
                </div>
            </Page>

            {editingSite && <EditSiteModal site={site} types={types} statuses={statuses} onClose={closeEditSite} />}
            {showInventoryModal && <InventoryAddModal siteId={site.id} products={available_products} onClose={() => setShowInventoryModal(false)} />}
            {stockItem && <StockModal siteId={site.id} item={stockItem} onClose={() => setStockItem(null)} />}
            {restockItem && <RestockModal siteId={site.id} item={restockItem} onClose={() => setRestockItem(null)} />}
            {assign.open && <AssignModal modal={assign} siteId={site.id} staff={available_staff} onClose={() => setAssign({ open: false })} />}

            {deleteSite.dialog}
            {removeInventory.dialog}
            {removeAffectation.dialog}
        </>
    );
}

SiteShow.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
    ],
};