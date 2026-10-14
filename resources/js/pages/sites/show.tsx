import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftRight,
    BarChart2,
    CalendarRange,
    Clock,
    ImagePlus,
    MapPin,
    Package,
    Pencil,
    Phone,
    Plus,
    Store,
    Timer,
    Trash2,
    TrendingUp,
    User,
    Users,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge, type StatusTone } from '@/components/page/status-badge';
import {
    index as sitesIndex,
    edit as siteEdit,
    destroy as siteDestroy,
} from '@/routes/sites';
import {
    store as affectationStore,
    destroy as affectationDestroy,
    permuter as affectationPermuter,
} from '@/routes/affectations';
import {
    store as inventoryStore,
    update as inventoryUpdate,
    destroy as inventoryDestroy,
} from '@/routes/sites/inventory';
import { show as personnelShow } from '@/routes/personnel';
import { dashboard } from '@/routes';
import type { SiteAffectation, SiteDetail, SiteVisit } from '@/types';

type ChartPoint = { label: string; count: number };
type ChartData = { week: ChartPoint[]; month: ChartPoint[]; year: ChartPoint[] };

type SiteStats = {
    total_visits: number;
    visits_this_month: number;
    avg_duration: number;
    completed_visits: number;
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
    available_products: ProductOption[];
};

type ModalState =
    | { open: false }
    | { open: true; mode: 'assign' }
    | { open: true; mode: 'permuter'; replacingId: number; replacingName: string };

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
    week: '7 jours',
    month: '30 jours',
    year: '12 mois',
};

const visitStatusTone: Record<string, StatusTone> = {
    in_progress: 'info',
    completed: 'success',
    incomplete: 'warning',
    flagged: 'danger',
    active: 'success',
    inactive: 'neutral',
    suspended: 'warning',
};

function formatDuration(minutes: number): string {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-aktivy-soft text-aktivy-deep">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xl font-bold text-ink">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
                {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
            </div>
        </div>
    );
}

// ── Photo gallery ─────────────────────────────────────────────────────────────
function PhotoGallery({
    photos,
    siteId,
    canAdd,
}: {
    photos: string[];
    siteId: number;
    canAdd: boolean;
}) {
    const [lightbox, setLightbox] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const form = new FormData();
        form.append('photo', file);
        router.post(`/sites/${siteId}/photos`, form, {
            forceFormData: true,
            onFinish: () => setUploading(false),
        });
        if (fileRef.current) fileRef.current.value = '';
    };

    const deletePhoto = (index: number) => {
        if (!confirm('Supprimer cette photo ?')) return;
        router.delete(`/sites/${siteId}/photos/${index}`);
    };

    return (
        <>
            <div className="flex flex-wrap gap-3 p-5">
                {photos.map((url, i) => (
                    <div key={i} className="group relative size-28 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                        <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="size-full cursor-zoom-in object-cover transition-transform group-hover:scale-105"
                            onClick={() => setLightbox(url)}
                        />
                        <button
                            onClick={() => deletePhoto(i)}
                            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                        >
                            <X className="size-3" />
                        </button>
                    </div>
                ))}

                {canAdd && (
                    <label className="flex size-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-aktivy hover:text-aktivy">
                        <ImagePlus className="size-5" />
                        <span className="text-xs font-medium">Ajouter</span>
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

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setLightbox(null)}
                >
                    <img
                        src={lightbox}
                        alt="Aperçu"
                        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
                        onClick={() => setLightbox(null)}
                    >
                        <X className="size-5" />
                    </button>
                </div>
            )}
        </>
    );
}

// ── Chart section ─────────────────────────────────────────────────────────────
function VisitsChart({ chart }: { chart: ChartData }) {
    const [period, setPeriod] = useState<Period>('month');
    const data = chart[period];

    return (
        <Panel
            title="Activité"
            description="Nombre de visites sur la période"
            actions={
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                                period === p
                                    ? 'bg-white text-ink shadow-sm'
                                    : 'text-slate-500 hover:text-ink'
                            }`}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>
            }
        >
            <div className="px-2 pt-2 pb-4">
                {data.every((d) => d.count === 0) ? (
                    <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                        Aucune visite sur cette période
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                interval={period === 'month' ? 4 : 0}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    border: '1px solid #e2e8f0',
                                    fontSize: 12,
                                }}
                                formatter={(v: number) => [`${v} visite${v > 1 ? 's' : ''}`, '']}
                                labelStyle={{ color: '#334155', fontWeight: 600 }}
                                cursor={{ fill: '#f1f5f9' }}
                            />
                            <Bar
                                dataKey="count"
                                fill="#52c41a"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </Panel>
    );
}

// ── Stock status colors ────────────────────────────────────────────────────────
const stockColors: Record<string, { bg: string; text: string; bar: string; label: string }> = {
    normal:   { bg: 'bg-green-50',  text: 'text-green-700',  bar: 'bg-green-500',  label: 'Normal' },
    warning:  { bg: 'bg-amber-50',  text: 'text-amber-700',  bar: 'bg-amber-400',  label: 'Alerte' },
    critical: { bg: 'bg-red-50',    text: 'text-red-700',    bar: 'bg-red-500',    label: 'Critique' },
};

// ── Inventory add modal ────────────────────────────────────────────────────────
const numFieldClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition-[border-color,background-color] hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15';

function InventoryAddModal({
    siteId,
    products,
    onClose,
}: {
    siteId: number;
    products: ProductOption[];
    onClose: () => void;
}) {
    const [productId, setProductId] = useState('');
    const [currentStock, setCurrentStock] = useState('0');
    const [alertThreshold, setAlertThreshold] = useState('10');
    const [criticalThreshold, setCriticalThreshold] = useState('5');
    const [saving, setSaving] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.post(
            inventoryStore({ site: siteId }).url,
            {
                product_id:          Number(productId),
                current_stock:       Number(currentStock),
                alert_threshold:     Number(alertThreshold),
                critical_threshold:  Number(criticalThreshold),
            },
            { onFinish: () => { setSaving(false); onClose(); } },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <p className="text-base font-bold text-ink">Ajouter un produit à l'inventaire</p>
                    <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
                </div>
                <form onSubmit={submit} className="p-6 flex flex-col gap-4">
                    <div>
                        <label className={labelClass}>Produit <span className="text-red-500">*</span></label>
                        <select value={productId} onChange={(e) => setProductId(e.target.value)} className={fieldClass} required>
                            <option value="">Choisir un produit…</option>
                            {products.map((p) => (
                                <option key={p.value} value={p.value}>{p.label} · {p.unit}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Stock actuel</label>
                        <input type="number" min="0" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} className={numFieldClass} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Seuil d'alerte <span className="text-amber-500">⚠</span></label>
                            <input type="number" min="0" value={alertThreshold} onChange={(e) => setAlertThreshold(e.target.value)} className={numFieldClass} required />
                            <p className="mt-1 text-xs text-slate-400">Alerte jaune en dessous</p>
                        </div>
                        <div>
                            <label className={labelClass}>Seuil critique <span className="text-red-500">●</span></label>
                            <input type="number" min="0" value={criticalThreshold} onChange={(e) => setCriticalThreshold(e.target.value)} className={numFieldClass} required />
                            <p className="mt-1 text-xs text-slate-400">Alerte rouge en dessous</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
                        <button type="submit" disabled={saving || !productId} className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-5 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] disabled:opacity-60">
                            {saving ? 'Ajout…' : 'Ajouter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Assign / Permuter modal ────────────────────────────────────────────────────
const fieldClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink outline-none transition-[border-color,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-aktivy focus:bg-white focus:ring-2 focus:ring-aktivy/15 disabled:opacity-60';
const labelClass = 'block text-xs font-semibold text-ink mb-1';

function AssignModal({
    modal,
    siteId,
    staff,
    onClose,
}: {
    modal: ModalState & { open: true };
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !startsOn) return;
        setSaving(true);

        const data = {
            user_id: Number(userId),
            starts_on: startsOn,
            ends_on: endsOn || undefined,
            slot_start: slotStart || undefined,
            slot_end: slotEnd || undefined,
        };

        if (modal.mode === 'permuter') {
            router.post(
                affectationPermuter({ affectation: modal.replacingId }).url,
                data,
                { onFinish: () => { setSaving(false); onClose(); } },
            );
        } else {
            router.post(
                affectationStore().url,
                { ...data, site_id: siteId },
                { onFinish: () => { setSaving(false); onClose(); } },
            );
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <p className="text-base font-bold text-ink">
                            {modal.mode === 'permuter'
                                ? 'Permuter l\'hôtesse'
                                : 'Affecter une hôtesse'}
                        </p>
                        {modal.mode === 'permuter' && (
                            <p className="mt-0.5 text-xs text-slate-400">
                                Remplace <span className="font-semibold text-slate-600">{modal.replacingName}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={submit} className="p-6 flex flex-col gap-4">
                    {/* Agent */}
                    <div>
                        <label className={labelClass}>
                            Hôtesse / Superviseur <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className={`${fieldClass} pl-9`}
                                required
                            >
                                <option value="">Choisir un membre…</option>
                                {staff.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label} · {s.role_label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>
                                Début <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <CalendarRange className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    value={startsOn}
                                    onChange={(e) => setStartsOn(e.target.value)}
                                    className={`${fieldClass} pl-9`}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Fin <span className="text-slate-400 font-normal">(optionnel)</span></label>
                            <div className="relative">
                                <CalendarRange className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    value={endsOn}
                                    onChange={(e) => setEndsOn(e.target.value)}
                                    className={`${fieldClass} pl-9`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Créneau */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Heure de début</label>
                            <div className="relative">
                                <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="time"
                                    value={slotStart}
                                    onChange={(e) => setSlotStart(e.target.value)}
                                    className={`${fieldClass} pl-9`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Heure de fin</label>
                            <div className="relative">
                                <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="time"
                                    value={slotEnd}
                                    onChange={(e) => setSlotEnd(e.target.value)}
                                    className={`${fieldClass} pl-9`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !userId || !startsOn}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-aktivy px-5 text-sm font-semibold text-ink shadow-sm hover:bg-[#46b52b] disabled:opacity-60"
                        >
                            {saving
                                ? 'Enregistrement…'
                                : modal.mode === 'permuter'
                                    ? 'Permuter'
                                    : 'Affecter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SiteShow({
    site,
    stats,
    chart,
    affectations,
    recent_visits,
    hostess_history,
    available_staff,
    inventory,
    available_products,
}: Props) {
    const [modal, setModal] = useState<ModalState>({ open: false });
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [editingStock, setEditingStock] = useState<Record<number, { current: string; alert: string; critical: string }>>({});
    const confirmDelete = () => {
        if (confirm(`Archiver « ${site.name} » ? Les affectations et visites associées seront conservées.`)) {
            router.delete(siteDestroy(site.id).url);
        }
    };

    const completionRate =
        stats.total_visits > 0
            ? Math.round((stats.completed_visits / stats.total_visits) * 100)
            : 0;

    const canAddPhoto = site.photos_count < 3;

    return (
        <>
            <Head title={site.name} />

            <Page
                title={site.name}
                description={[site.type_label, site.city, site.region].filter(Boolean).join(' · ')}
                actions={
                    <div className="flex items-center gap-2">
                        <Link
                            href={siteEdit(site.id).url}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                        >
                            <Pencil className="size-3.5" />
                            Modifier
                        </Link>
                        <button
                            onClick={confirmDelete}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                        >
                            <Trash2 className="size-3.5" />
                            Archiver
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col gap-6">
                    {/* Photos */}
                    <Panel
                        title="Photos"
                        actions={
                            <span className="text-xs text-slate-400">{site.photos_count}/3</span>
                        }
                    >
                        {site.photos_count === 0 && !canAddPhoto ? (
                            <EmptyState
                                icon={ImagePlus}
                                title="Aucune photo"
                                description="Ajoutez jusqu'à 3 photos de ce site."
                            />
                        ) : (
                            <PhotoGallery
                                photos={site.photos}
                                siteId={site.id}
                                canAdd={canAddPhoto}
                            />
                        )}
                    </Panel>

                    {/* KPI row */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <StatCard
                            icon={Store}
                            label="Visites totales"
                            value={stats.total_visits}
                        />
                        <StatCard
                            icon={TrendingUp}
                            label="Ce mois-ci"
                            value={stats.visits_this_month}
                            sub="depuis le 1er"
                        />
                        <StatCard
                            icon={Clock}
                            label="Durée moyenne"
                            value={formatDuration(stats.avg_duration)}
                            sub="par visite"
                        />
                        <StatCard
                            icon={BarChart2}
                            label="Taux de complétion"
                            value={`${completionRate}%`}
                            sub={`${stats.completed_visits} complètes`}
                        />
                    </div>

                    {/* Chart */}
                    <VisitsChart chart={chart} />

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Colonne principale */}
                        <div className="flex flex-col gap-6 lg:col-span-2">
                            {/* Informations générales */}
                            <Panel title="Informations">
                                <dl className="divide-y divide-slate-100 px-5">
                                    <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                        <dt className="text-slate-500">Statut</dt>
                                        <dd>
                                            <StatusBadge tone={visitStatusTone[site.status] ?? 'neutral'}>
                                                {site.status_label}
                                            </StatusBadge>
                                        </dd>
                                    </div>
                                    {site.code && (
                                        <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                            <dt className="text-slate-500">Code interne</dt>
                                            <dd className="font-medium text-ink">{site.code}</dd>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                        <dt className="text-slate-500">Type</dt>
                                        <dd className="font-medium text-ink">{site.type_label}</dd>
                                    </div>
                                    {site.address && (
                                        <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                            <dt className="text-slate-500">Adresse</dt>
                                            <dd className="font-medium text-ink">{site.address}</dd>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                        <dt className="text-slate-500">Ville</dt>
                                        <dd className="font-medium text-ink">{site.city}</dd>
                                    </div>
                                    {site.region && (
                                        <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                            <dt className="text-slate-500">Région</dt>
                                            <dd className="font-medium text-ink">{site.region}</dd>
                                        </div>
                                    )}
                                    {site.latitude != null && site.longitude != null && (
                                        <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                            <dt className="text-slate-500">GPS</dt>
                                            <dd className="font-mono text-xs text-slate-600">
                                                {(site.latitude as number).toFixed(6)},{' '}
                                                {(site.longitude as number).toFixed(6)}
                                            </dd>
                                        </div>
                                    )}
                                    {(site.opening_time || site.closing_time) && (
                                        <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                            <dt className="text-slate-500">Horaires</dt>
                                            <dd className="font-medium text-ink">
                                                {[site.opening_time, site.closing_time]
                                                    .filter(Boolean)
                                                    .join(' – ')}
                                            </dd>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 text-sm">
                                        <dt className="text-slate-500">Dernière visite</dt>
                                        <dd className="text-slate-600">{site.last_visit_at ?? 'Jamais'}</dd>
                                    </div>
                                </dl>
                            </Panel>

                            {/* Contact sur place */}
                            {(site.contact_name || site.contact_phone) && (
                                <Panel title="Contact sur place">
                                    <div className="flex items-center gap-4 p-5">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                            <User className="size-5" />
                                        </div>
                                        <div>
                                            {site.contact_name && (
                                                <p className="text-sm font-semibold text-ink">
                                                    {site.contact_name}
                                                </p>
                                            )}
                                            {site.contact_phone && (
                                                <a
                                                    href={`tel:${site.contact_phone}`}
                                                    className="flex items-center gap-1 text-sm text-aktivy-deep hover:underline"
                                                >
                                                    <Phone className="size-3.5" />
                                                    {site.contact_phone}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </Panel>
                            )}

                            {/* Notes */}
                            {site.notes && (
                                <Panel title="Notes internes">
                                    <p className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-slate-600">
                                        {site.notes}
                                    </p>
                                </Panel>
                            )}

                            {/* Historique des visites */}
                            <Panel
                                title="Visites récentes"
                                description="Les 10 dernières prises de poste sur ce site."
                            >
                                {recent_visits.length === 0 ? (
                                    <EmptyState
                                        icon={Timer}
                                        title="Aucune visite enregistrée"
                                        description="Les pointages de vos hôtesses apparaîtront ici."
                                    />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {recent_visits.map((visit) => (
                                            <li
                                                key={visit.id}
                                                className="flex items-center gap-4 px-5 py-3 text-sm"
                                            >
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-aktivy-soft text-aktivy-deep text-xs font-semibold">
                                                    {(visit.agent_name ?? '?')
                                                        .split(' ')
                                                        .map((n: string) => n[0])
                                                        .slice(0, 2)
                                                        .join('')
                                                        .toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-ink">
                                                        {visit.agent_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {visit.checked_in_at}
                                                        {visit.checked_out_at &&
                                                            ` → ${visit.checked_out_at}`}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-3">
                                                    {visit.duration_minutes != null && (
                                                        <span className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Clock className="size-3" />
                                                            {formatDuration(visit.duration_minutes)}
                                                        </span>
                                                    )}
                                                    <StatusBadge
                                                        tone={visitStatusTone[visit.status] ?? 'neutral'}
                                                    >
                                                        {visit.status_label}
                                                    </StatusBadge>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>

                            {/* Historique des hôtesses */}
                            <Panel
                                title="Équipe passée & présente"
                                description="Toutes les hôtesses ayant travaillé sur ce site."
                                actions={
                                    <span className="text-sm text-slate-400">
                                        {hostess_history.length}
                                    </span>
                                }
                            >
                                {hostess_history.length === 0 ? (
                                    <EmptyState
                                        icon={Users}
                                        title="Aucune hôtesse affectée"
                                        description="Les hôtesses assignées à ce site apparaîtront ici."
                                    />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {hostess_history.map((h) => (
                                            <li key={h.agent_id}>
                                                <Link
                                                    href={personnelShow({ personnel: h.agent_id }).url}
                                                    className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                                                >
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-aktivy-soft text-aktivy-deep text-xs font-semibold">
                                                        {h.agent_name
                                                            .split(' ')
                                                            .map((n) => n[0])
                                                            .slice(0, 2)
                                                            .join('')
                                                            .toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-ink group-hover:text-aktivy-deep">
                                                                {h.agent_name}
                                                            </span>
                                                            {h.is_current && (
                                                                <StatusBadge tone="success">
                                                                    Actif
                                                                </StatusBadge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            {h.role_label}
                                                            {h.agent_phone && ` · ${h.agent_phone}`}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {h.first_date} → {h.last_date}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="text-sm font-bold text-ink">
                                                            {h.visit_count}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            visite{h.visit_count !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </div>

                        {/* Colonne latérale */}
                        <div className="flex flex-col gap-6">

                            {/* Inventaire */}
                            <Panel
                                title="Inventaire"
                                actions={
                                    available_products.length > 0 && (
                                        <button
                                            onClick={() => setShowInventoryModal(true)}
                                            className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-aktivy px-3 text-xs font-semibold text-ink hover:bg-[#46b52b]"
                                        >
                                            <Plus className="size-3.5" />
                                            Ajouter
                                        </button>
                                    )
                                }
                            >
                                {inventory.length === 0 ? (
                                    <EmptyState
                                        icon={Package}
                                        title="Aucun produit"
                                        description="Ajoutez des produits à suivre sur ce site."
                                        action={
                                            available_products.length > 0 ? (
                                                <button
                                                    onClick={() => setShowInventoryModal(true)}
                                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-aktivy px-4 text-xs font-semibold text-ink hover:bg-[#46b52b]"
                                                >
                                                    <Plus className="size-3.5" />
                                                    Ajouter un produit
                                                </button>
                                            ) : undefined
                                        }
                                    />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {inventory.map((item) => {
                                            const colors = stockColors[item.stock_status];
                                            const editing = editingStock[item.id];
                                            return (
                                                <li key={item.id} className="px-4 py-3">
                                                    <div className="flex items-start gap-3">
                                                        {/* Image ou icône */}
                                                        <div className="shrink-0 size-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                                                            {item.product_image_url
                                                                ? <img src={item.product_image_url} alt={item.product_name} className="h-full w-full object-cover" />
                                                                : <Package className="size-5 text-slate-300" />
                                                            }
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-sm font-semibold text-ink truncate">{item.product_name}</p>
                                                                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                                                                    {colors.label}
                                                                </span>
                                                            </div>
                                                            {item.product_sku && <p className="text-xs font-mono text-slate-400">{item.product_sku}</p>}

                                                            {/* Stock en lecture */}
                                                            {!editing && (
                                                                <>
                                                                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                                                                        <span className="font-bold text-ink text-sm">{item.current_stock}</span>
                                                                        <span>{item.product_unit}</span>
                                                                        <span className="text-slate-300">·</span>
                                                                        <span>Alerte: {item.alert_threshold}</span>
                                                                        <span className="text-slate-300">·</span>
                                                                        <span>Critique: {item.critical_threshold}</span>
                                                                    </div>
                                                                    {/* Barre de stock */}
                                                                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
                                                                        <div
                                                                            className={`h-1.5 rounded-full transition-all ${colors.bar}`}
                                                                            style={{ width: `${Math.min(100, item.alert_threshold > 0 ? (item.current_stock / item.alert_threshold) * 100 : 100)}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="mt-1.5 flex gap-2">
                                                                        <button
                                                                            onClick={() => setEditingStock((prev) => ({
                                                                                ...prev,
                                                                                [item.id]: {
                                                                                    current: String(item.current_stock),
                                                                                    alert: String(item.alert_threshold),
                                                                                    critical: String(item.critical_threshold),
                                                                                },
                                                                            }))}
                                                                            className="text-xs text-aktivy-deep font-semibold hover:underline"
                                                                        >
                                                                            Modifier
                                                                        </button>
                                                                        <span className="text-slate-300">·</span>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (confirm(`Retirer « ${item.product_name} » de l'inventaire ?`)) {
                                                                                    router.delete(inventoryDestroy({ site: site.id, inventory: item.id }).url);
                                                                                }
                                                                            }}
                                                                            className="text-xs text-red-500 hover:underline"
                                                                        >
                                                                            Retirer
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}

                                                            {/* Stock en édition inline */}
                                                            {editing && (
                                                                <div className="mt-2 flex flex-col gap-2">
                                                                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                                                                        <div>
                                                                            <p className="mb-0.5 font-semibold text-slate-500">Stock</p>
                                                                            <input type="number" min="0" value={editing.current}
                                                                                onChange={(e) => setEditingStock((prev) => ({ ...prev, [item.id]: { ...prev[item.id], current: e.target.value } }))}
                                                                                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-aktivy focus:ring-1 focus:ring-aktivy/20" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="mb-0.5 font-semibold text-amber-600">Alerte</p>
                                                                            <input type="number" min="0" value={editing.alert}
                                                                                onChange={(e) => setEditingStock((prev) => ({ ...prev, [item.id]: { ...prev[item.id], alert: e.target.value } }))}
                                                                                className="h-8 w-full rounded-lg border border-amber-200 bg-amber-50 px-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="mb-0.5 font-semibold text-red-600">Critique</p>
                                                                            <input type="number" min="0" value={editing.critical}
                                                                                onChange={(e) => setEditingStock((prev) => ({ ...prev, [item.id]: { ...prev[item.id], critical: e.target.value } }))}
                                                                                className="h-8 w-full rounded-lg border border-red-200 bg-red-50 px-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                router.put(
                                                                                    inventoryUpdate({ site: site.id, inventory: item.id }).url,
                                                                                    {
                                                                                        current_stock:      Number(editing.current),
                                                                                        alert_threshold:    Number(editing.alert),
                                                                                        critical_threshold: Number(editing.critical),
                                                                                    },
                                                                                    { onSuccess: () => setEditingStock((prev) => { const n = { ...prev }; delete n[item.id]; return n; }) },
                                                                                );
                                                                            }}
                                                                            className="inline-flex h-7 items-center rounded-lg bg-aktivy px-3 text-xs font-semibold text-ink hover:bg-[#46b52b]"
                                                                        >
                                                                            Sauver
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingStock((prev) => { const n = { ...prev }; delete n[item.id]; return n; })}
                                                                            className="inline-flex h-7 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                                                        >
                                                                            Annuler
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </Panel>

                            {/* Affectations actives */}
                            <Panel
                                title="Affectées actuellement"
                                actions={
                                    <button
                                        onClick={() => setModal({ open: true, mode: 'assign' })}
                                        className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-aktivy px-3 text-xs font-semibold text-ink hover:bg-[#46b52b]"
                                    >
                                        <Plus className="size-3.5" />
                                        Affecter
                                    </button>
                                }
                            >
                                {affectations.length === 0 ? (
                                    <EmptyState
                                        icon={CalendarRange}
                                        title="Aucune affectation"
                                        description="Personne n'est encore affecté à ce site."
                                        action={
                                            <button
                                                onClick={() => setModal({ open: true, mode: 'assign' })}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-aktivy px-4 text-xs font-semibold text-ink hover:bg-[#46b52b]"
                                            >
                                                <Plus className="size-3.5" />
                                                Affecter une hôtesse
                                            </button>
                                        }
                                    />
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {affectations.map((a) => (
                                            <li key={a.id} className="px-5 py-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-aktivy-soft text-xs font-bold text-aktivy-deep">
                                                        {a.agent_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <Link
                                                            href={personnelShow({ personnel: a.agent_id }).url}
                                                            className="text-sm font-semibold text-ink hover:text-aktivy-deep hover:underline"
                                                        >
                                                            {a.agent_name}
                                                        </Link>
                                                        {a.agent_phone && (
                                                            <p className="text-xs text-slate-500">{a.agent_phone}</p>
                                                        )}
                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            Depuis le {a.starts_on}
                                                            {a.ends_on && ` · jusqu'au ${a.ends_on}`}
                                                        </p>
                                                        {a.slot_start && a.slot_end && (
                                                            <p className="text-xs text-slate-400">
                                                                <Clock className="mr-1 inline size-3" />
                                                                {a.slot_start} – {a.slot_end}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                        {a.is_current && (
                                                            <StatusBadge tone="success">En poste</StatusBadge>
                                                        )}
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => setModal({
                                                                    open: true,
                                                                    mode: 'permuter',
                                                                    replacingId: a.id,
                                                                    replacingName: a.agent_name,
                                                                })}
                                                                title="Permuter"
                                                                className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                                            >
                                                                <ArrowLeftRight className="size-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm(`Retirer ${a.agent_name} de ce site ?`)) {
                                                                        router.delete(affectationDestroy({ affectation: a.id }).url);
                                                                    }
                                                                }}
                                                                title="Retirer"
                                                                className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                                            >
                                                                <X className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>

                            {/* Localisation */}
                            {site.latitude != null && site.longitude != null && (
                                <Panel title="Localisation">
                                    <div className="p-5">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <MapPin className="size-4 text-aktivy" />
                                            <span className="font-mono text-xs">
                                                {(site.latitude as number).toFixed(5)},{' '}
                                                {(site.longitude as number).toFixed(5)}
                                            </span>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 inline-flex text-xs font-semibold text-aktivy-deep underline-offset-2 hover:underline"
                                        >
                                            Voir sur Google Maps →
                                        </a>
                                    </div>
                                </Panel>
                            )}
                        </div>
                    </div>
                </div>
            </Page>

            {/* Inventory add modal */}
            {showInventoryModal && (
                <InventoryAddModal
                    siteId={site.id}
                    products={available_products}
                    onClose={() => setShowInventoryModal(false)}
                />
            )}

            {/* Assign / Permuter modal */}
            {modal.open && (
                <AssignModal
                    modal={modal}
                    siteId={site.id}
                    staff={available_staff}
                    onClose={() => setModal({ open: false })}
                />
            )}
        </>
    );
}

SiteShow.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: dashboard() },
        { title: 'Sites', href: sitesIndex() },
    ],
};
