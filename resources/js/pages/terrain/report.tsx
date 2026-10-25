import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Clock,
    Flag,
    Megaphone,
    Minus,
    Package,
    Pencil,
    Plus,
    Save,
    Send,
    TriangleAlert,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { TextArea, TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { GlowCard, GlowStyles } from '@/components/page/surface';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { home as terrainHome } from '@/routes/terrain';
import { update as reportUpdate, submit as reportSubmit, flag as reportFlag } from '@/routes/terrain/report';
import { checkout as visitCheckout } from '@/routes/terrain/visit';

/* ─── Types ─── */

type ReportLine = {
    id: number;
    product_name: string;
    unit: string;
    unit_price: number;
    opening_stock: number;
    units_sold: number;
    closing_stock: number;
    revenue: number;
    notes: string | null;
    image_url: string | null;
};

type Report = {
    id: number;
    status: 'draft' | 'submitted';
    report_date: string;
    site_name: string;
    notes: string | null;
    incident_notes: string | null;
    submitted_at: string | null;
    total_revenue: number;
    total_units_sold: number;
    lines: ReportLine[];
};

type VisitInfo = {
    id: number;
    checked_in_at: string;
    checked_out_at: string | null;
    status: string;
};

type Busy = 'draft' | 'submit' | 'flag' | 'checkout' | null;
type Step = 'edit' | 'review' | 'incident';

/* ─── Mise en page : contenu principal + panneau latéral ─── */

const twoCol =
    'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem]';

/* ─── Formatters ─── */

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

/* ─── Notice ─── */

function Notice({ tone, icon: Icon, children }: {
    tone: 'warning' | 'success' | 'danger';
    icon: typeof TriangleAlert;
    children: ReactNode;
}) {
    const styles = {
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        success: 'border-green-200 bg-aktivy-soft text-green-800',
        danger: 'border-red-200 bg-red-50 text-red-800',
    };
    return (
        <div className={cn('flex items-start gap-3 rounded-2xl border p-4 text-sm', styles[tone])}>
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p>{children}</p>
        </div>
    );
}

/* ─── Progression : 3 fines barres ─── */

function Steps({ current }: { current: 1 | 2 | 3 }) {
    const labels = ['Saisie', 'Révision', 'Envoyé'];
    return (
        <ol className="grid grid-cols-3 gap-2" aria-label="Progression du rapport">
            {labels.map((label, i) => {
                const n = i + 1;
                return (
                    <li key={label} aria-current={n === current ? 'step' : undefined}>
                        <div
                            className={cn(
                                'h-1 rounded-full transition-colors duration-500',
                                n <= current ? 'bg-aktivy' : 'bg-slate-200',
                            )}
                        />
                        <p
                            className={cn(
                                'mt-2 text-xs font-medium transition-colors',
                                n === current ? 'text-aktivy-deep' : n < current ? 'text-slate-500' : 'text-slate-400',
                            )}
                        >
                            {label}
                        </p>
                    </li>
                );
            })}
        </ol>
    );
}

/* ─── Barre de stock ─── */

function StockBar({ used, total }: { used: number; total: number }) {
    const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    const remaining = total - used;
    const tone = remaining === 0 ? 'bg-red-400' : remaining <= total * 0.2 ? 'bg-amber-400' : 'bg-aktivy';

    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={cn('h-full rounded-full transition-[width] duration-300', tone)} style={{ width: `${pct}%` }} />
        </div>
    );
}

/* ─── Ligne produit (pleine largeur) ─── */

function ProductRow({ line, onChange, onNoteChange, disabled }: {
    line: ReportLine;
    onChange: (sold: number) => void;
    onNoteChange: (note: string) => void;
    disabled: boolean;
}) {
    const [noteOpen, setNoteOpen] = useState(Boolean(line.notes));
    const active = line.units_sold > 0;
    const remaining = Math.max(0, line.opening_stock - line.units_sold);
    const soldOut = line.opening_stock > 0 && remaining === 0;
    const lowStock = !soldOut && line.opening_stock > 0 && remaining <= line.opening_stock * 0.2;
    const amount = line.units_sold * line.unit_price;

    return (
        <li className={cn('p-4 transition-colors sm:p-5', active && 'bg-aktivy-soft/40')}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                {/* Identité */}
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    {line.image_url ? (
                        <img
                            src={line.image_url}
                            alt={line.product_name}
                            className="size-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-100"
                        />
                    ) : (
                        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                            <Package className="size-6" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-ink">{line.product_name}</p>
                            {soldOut && (
                                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-600/15 ring-inset">
                                    Épuisé
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {line.unit_price > 0 && <>{formatMoney(line.unit_price)} FCFA / {line.unit} · </>}
                            stock {line.opening_stock}
                        </p>
                        {line.opening_stock > 0 && (
                            <div className="mt-2.5 flex items-center gap-3">
                                <StockBar used={line.units_sold} total={line.opening_stock} />
                                <span
                                    className={cn(
                                        'shrink-0 text-[11px] font-medium tabular-nums',
                                        soldOut ? 'text-red-600' : lowStock ? 'text-amber-600' : 'text-slate-400',
                                    )}
                                >
                                    Reste {remaining}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stepper + montant */}
                <div className="flex items-center justify-between gap-4 md:justify-end">
                    <div className="inline-flex items-center rounded-2xl bg-slate-100 p-1">
                        <button
                            type="button"
                            disabled={disabled || line.units_sold <= 0}
                            onClick={() => onChange(Math.max(0, line.units_sold - 1))}
                            className="flex size-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition-all hover:text-ink focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none active:scale-90 disabled:opacity-40 disabled:shadow-none"
                            aria-label="Retirer une unité"
                        >
                            <Minus className="size-4" />
                        </button>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={line.opening_stock}
                            value={line.units_sold}
                            disabled={disabled}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                                onChange(Math.max(0, Math.min(line.opening_stock, Number(e.target.value) || 0)))
                            }
                            aria-label={`Unités vendues — ${line.product_name}`}
                            className="h-11 w-16 bg-transparent text-center text-lg font-bold text-ink tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            disabled={disabled || line.units_sold >= line.opening_stock}
                            onClick={() => onChange(Math.min(line.opening_stock, line.units_sold + 1))}
                            className="flex size-11 items-center justify-center rounded-xl bg-aktivy text-white shadow-sm shadow-green-600/25 transition-all hover:bg-aktivy-deep focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:ring-offset-2 focus-visible:outline-none active:scale-90 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                            aria-label="Ajouter une unité"
                        >
                            <Plus className="size-4" />
                        </button>
                    </div>

                    <p
                        className={cn(
                            'min-w-24 text-right text-base font-bold tabular-nums md:w-32',
                            amount > 0 ? 'text-aktivy-deep' : 'text-slate-300',
                        )}
                    >
                        {amount > 0 ? formatMoney(amount) : '—'}
                        <span className="ml-1 text-xs font-medium text-slate-400">FCFA</span>
                    </p>
                </div>
            </div>

            {/* Actions discrètes */}
            <div className="mt-3 flex items-center gap-4 text-xs md:pl-20">
                {!soldOut && line.opening_stock > 0 && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(line.opening_stock)}
                        className="font-semibold text-aktivy-deep hover:underline focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none disabled:opacity-40"
                    >
                        Tout vendu
                    </button>
                )}
                {active && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(0)}
                        className="font-medium text-slate-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none disabled:opacity-40"
                    >
                        Remettre à 0
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setNoteOpen((o) => !o)}
                    className="inline-flex items-center gap-1 font-medium text-slate-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-aktivy focus-visible:outline-none"
                >
                    <Pencil className="size-3" />
                    Note
                </button>
            </div>

            {noteOpen && (
                <div className="md:pl-20">
                    <TextInput
                        placeholder="Note sur ce produit (optionnel)"
                        value={line.notes ?? ''}
                        disabled={disabled}
                        onChange={(e) => onNoteChange(e.target.value)}
                        className="mt-2.5 h-9 bg-white text-xs"
                    />
                </div>
            )}
        </li>
    );
}

/* ─── Panneau récapitulatif (colonne de droite) ─── */

function SummaryPanel({
    totalSold,
    totalRevenue,
    filledCount,
    totalLines,
    remainingStock,
    notes,
    onNotes,
    busy,
    onSave,
    onReview,
}: {
    totalSold: number;
    totalRevenue: number;
    filledCount: number;
    totalLines: number;
    remainingStock: number;
    notes: string;
    onNotes: (v: string) => void;
    busy: Busy;
    onSave: () => void;
    onReview: () => void;
}) {
    const pct = totalLines > 0 ? Math.round((filledCount / totalLines) * 100) : 0;

    return (
        <GlowCard contentClassName="flex flex-col gap-5 p-5 sm:p-6">
            <div>
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Total de la journée</p>
                <p className="mt-1.5 text-4xl font-extrabold tracking-tight text-ink tabular-nums">
                    {formatMoney(totalRevenue)}
                    <span className="ml-1.5 text-base font-medium text-slate-400">FCFA</span>
                </p>
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">Produits saisis</span>
                    <span className="font-semibold text-ink tabular-nums">
                        {filledCount}/{totalLines}
                    </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-aktivy transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                    <dt className="text-xs text-slate-500">Unités vendues</dt>
                    <dd className="mt-1 text-xl font-bold text-ink tabular-nums">{totalSold}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                    <dt className="text-xs text-slate-500">Stock restant</dt>
                    <dd className="mt-1 text-xl font-bold text-ink tabular-nums">{remainingStock}</dd>
                </div>
            </dl>

            <div className="border-t border-slate-100 pt-5">
                <label htmlFor="day-notes" className="text-sm font-semibold text-ink">
                    Notes du jour <span className="font-normal text-slate-400">(facultatif)</span>
                </label>
                <TextArea
                    id="day-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => onNotes(e.target.value)}
                    placeholder="Événements particuliers, remarques clients…"
                    className="mt-2"
                />
            </div>

            <div className="flex flex-col gap-2.5">
                <ActionButton
                    onClick={onReview}
                    disabled={busy !== null}
                    icon={<ArrowRight className="order-last" />}
                    className="h-12 w-full rounded-2xl text-base"
                >
                    Réviser et soumettre
                </ActionButton>
                <ActionButton
                    variant="secondary"
                    onClick={onSave}
                    loading={busy === 'draft'}
                    disabled={busy !== null}
                    icon={<Save />}
                    className="h-11 w-full rounded-2xl"
                >
                    {busy === 'draft' ? 'Sauvegarde…' : 'Enregistrer le brouillon'}
                </ActionButton>
            </div>
        </GlowCard>
    );
}

/* ─── Page ─── */

export default function TerrainReport({ visit, report }: { visit: VisitInfo; report: Report }) {
    const isSubmitted = report.status === 'submitted';
    const [lines, setLines] = useState<ReportLine[]>(report.lines);
    const [notes, setNotes] = useState(report.notes ?? '');
    const [incidentNotes, setIncidentNotes] = useState(report.incident_notes ?? '');
    const [busy, setBusy] = useState<Busy>(null);
    const [step, setStep] = useState<Step>('edit');
    const [confirmCheckout, setConfirmCheckout] = useState(false);

    const totalSold = lines.reduce((s, l) => s + l.units_sold, 0);
    const totalRevenue = lines.reduce((s, l) => s + l.units_sold * l.unit_price, 0);
    const filledCount = lines.filter((l) => l.units_sold > 0).length;
    const remainingStock = lines.reduce((s, l) => s + Math.max(0, l.opening_stock - l.units_sold), 0);
    const soldLines = lines.filter((l) => l.units_sold > 0);
    const payloadLines = () => lines.map((l) => ({ id: l.id, units_sold: l.units_sold, notes: l.notes }));

    function updateLine(id: number, sold: number) {
        setLines((prev) => prev.map((l) =>
            l.id === id
                ? { ...l, units_sold: sold, closing_stock: Math.max(0, l.opening_stock - sold), revenue: sold * l.unit_price }
                : l,
        ));
    }

    function updateLineNote(id: number, note: string) {
        setLines((prev) => prev.map((l) => (l.id === id ? { ...l, notes: note } : l)));
    }

    function saveDraft() {
        router.put(reportUpdate({ visit: visit.id }).url, { notes, lines: payloadLines() }, {
            preserveScroll: true,
            onStart: () => setBusy('draft'),
            onSuccess: () => toast.success('Brouillon enregistré'),
            onError: toastFormError,
            onFinish: () => setBusy(null),
        });
    }

    function submitReport() {
        router.post(reportSubmit({ visit: visit.id }).url, { notes, incident_notes: incidentNotes || null, lines: payloadLines() }, {
            onStart: () => setBusy('submit'),
            onSuccess: () => toast.success('Rapport soumis !', { description: `${formatMoney(totalRevenue)} FCFA enregistrés.` }),
            onError: toastFormError,
            onFinish: () => setBusy(null),
        });
    }

    function submitFlag() {
        router.post(reportFlag({ visit: visit.id }).url, { incident_notes: incidentNotes }, {
            preserveScroll: true,
            onStart: () => setBusy('flag'),
            onSuccess: () => { toast.success('Signalement envoyé'); setStep('edit'); },
            onError: toastFormError,
            onFinish: () => setBusy(null),
        });
    }

    function checkoutAndGo() {
        if (visit.status !== 'in_progress') return;
        setBusy('checkout');
        const doCheckout = (lat?: number, lng?: number) => {
            router.patch(visitCheckout({ visit: visit.id }).url, { latitude: lat ?? null, longitude: lng ?? null }, {
                onSuccess: () => { toast.success('Service terminé !'); setConfirmCheckout(false); },
                onError: toastFormError,
                onFinish: () => setBusy(null),
            });
        };
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (p) => doCheckout(p.coords.latitude, p.coords.longitude),
                () => doCheckout(),
                { timeout: 8000 },
            );
        } else {
            doCheckout();
        }
    }

    const isEditing = !isSubmitted && step === 'edit';
    const current: 1 | 2 | 3 = isSubmitted ? 3 : step === 'review' ? 2 : 1;

    return (
        <>
            <Head title="Rapport journalier" />
            <GlowStyles />

            <Page
                title={report.site_name}
                description={`Rapport du ${report.report_date}`}
                actions={
                    <ActionLink href={terrainHome().url} variant="secondary" icon={<ArrowLeft />}>
                        Tableau de bord
                    </ActionLink>
                }
            >
                <div className="flex w-full flex-col gap-6">

                    {/* ── Méta + progression ── */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                                <Clock className="size-4 text-slate-400" />
                                Arrivée {visit.checked_in_at}
                            </span>
                            {visit.checked_out_at && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Flag className="size-4 text-slate-400" />
                                    Départ {visit.checked_out_at}
                                </span>
                            )}
                            {isSubmitted ? (
                                <StatusBadge tone="success">Soumis à {report.submitted_at}</StatusBadge>
                            ) : (
                                <StatusBadge tone="warning">Brouillon</StatusBadge>
                            )}
                        </div>
                        <div className="w-full md:w-96">
                            <Steps current={current} />
                        </div>
                    </div>

                    {/* ══════ SAISIE ══════ */}
                    {isEditing && (
                        <>
                            <div className={twoCol}>
                                <GlowCard contentClassName="p-0">
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                                        <div>
                                            <h3 className="text-base font-semibold text-ink">Ventes par produit</h3>
                                            <p className="mt-0.5 text-sm text-slate-500">
                                                Saisissez les unités vendues pour chaque produit.
                                            </p>
                                        </div>
                                        {lines.length > 0 && (
                                            <span className="shrink-0 rounded-full bg-aktivy-soft px-3 py-1 text-xs font-semibold text-aktivy-deep ring-1 ring-green-200/60">
                                                {filledCount}/{lines.length}
                                            </span>
                                        )}
                                    </div>

                                    {lines.length === 0 ? (
                                        <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                                            <Package className="size-10 text-slate-200" />
                                            <p className="text-sm font-medium text-slate-500">Aucun produit configuré</p>
                                            <p className="text-xs text-slate-400">
                                                Votre responsable doit d'abord ajouter des produits à ce site.
                                            </p>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-slate-100">
                                            {lines.map((line) => (
                                                <ProductRow
                                                    key={line.id}
                                                    line={line}
                                                    onChange={(sold) => updateLine(line.id, sold)}
                                                    onNoteChange={(note) => updateLineNote(line.id, note)}
                                                    disabled={busy !== null}
                                                />
                                            ))}
                                        </ul>
                                    )}
                                </GlowCard>

                                <div className="lg:sticky lg:top-6">
                                    <SummaryPanel
                                        totalSold={totalSold}
                                        totalRevenue={totalRevenue}
                                        filledCount={filledCount}
                                        totalLines={lines.length}
                                        remainingStock={remainingStock}
                                        notes={notes}
                                        onNotes={setNotes}
                                        busy={busy}
                                        onSave={saveDraft}
                                        onReview={() => setStep('review')}
                                    />
                                </div>
                            </div>

                            {/* Barre fixe — mobile uniquement */}
                            <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 lg:hidden">
                                <div className="flex items-center gap-3 rounded-2xl bg-white/90 p-2.5 pl-5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 backdrop-blur-md">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-slate-500">
                                            {totalSold} unité{totalSold > 1 ? 's' : ''} · {filledCount} produit{filledCount > 1 ? 's' : ''}
                                        </p>
                                        <p className="truncate text-xl font-bold text-ink tabular-nums">
                                            {formatMoney(totalRevenue)}
                                            <span className="ml-1.5 text-sm font-medium text-slate-400">FCFA</span>
                                        </p>
                                    </div>
                                    <ActionButton
                                        onClick={() => setStep('review')}
                                        disabled={busy !== null}
                                        icon={<ArrowRight className="order-last" />}
                                        className="h-12 shrink-0 rounded-xl px-5 text-sm"
                                    >
                                        Réviser
                                    </ActionButton>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ══════ RÉVISION ══════ */}
                    {!isSubmitted && step === 'review' && (
                        <div className={twoCol}>
                            {/* Ticket */}
                            <GlowCard contentClassName="p-0">
                                <div className="border-b border-dashed border-slate-200 px-5 py-4 sm:px-6">
                                    <h3 className="text-base font-semibold text-ink">Récapitulatif</h3>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        {report.site_name} · {report.report_date}
                                    </p>
                                </div>

                                {soldLines.length === 0 ? (
                                    <p className="px-5 py-10 text-center text-sm text-slate-400">Aucune vente saisie.</p>
                                ) : (
                                    <ul className="divide-y divide-dashed divide-slate-200">
                                        {soldLines.map((l) => (
                                            <li key={l.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                                                {l.image_url ? (
                                                    <img src={l.image_url} alt={l.product_name} className="size-11 shrink-0 rounded-xl object-cover" />
                                                ) : (
                                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                                                        <Package className="size-4 text-slate-300" />
                                                    </span>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-ink">{l.product_name}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {l.units_sold} × {formatMoney(l.unit_price)} FCFA
                                                    </p>
                                                </div>
                                                <p className="shrink-0 text-sm font-bold text-aktivy-deep tabular-nums">
                                                    {formatMoney(l.units_sold * l.unit_price)}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <div className="flex items-center justify-between border-t border-dashed border-slate-200 px-5 py-5 sm:px-6">
                                    <div>
                                        <p className="text-sm font-bold text-ink">Total journée</p>
                                        <p className="text-xs text-slate-500">
                                            {totalSold} unité{totalSold > 1 ? 's' : ''} vendues
                                        </p>
                                    </div>
                                    <p className="text-3xl font-extrabold text-aktivy-deep tabular-nums">
                                        {formatMoney(totalRevenue)}
                                        <span className="ml-1 text-sm font-medium text-slate-400">FCFA</span>
                                    </p>
                                </div>
                            </GlowCard>

                            <div className="flex flex-col gap-6 lg:sticky lg:top-6">
                                <Notice tone="warning" icon={TriangleAlert}>
                                    Vérifiez vos données avant de soumettre.{' '}
                                    <strong>Le rapport ne pourra plus être modifié.</strong>
                                </Notice>

                                <GlowCard contentClassName="p-5">
                                    <label htmlFor="incident" className="text-base font-semibold text-ink">
                                        Signaler un incident
                                    </label>
                                    <p className="mt-0.5 mb-3 text-sm text-slate-500">
                                        Optionnel : rupture de stock, problème client, matériel manquant…
                                    </p>
                                    <TextArea
                                        id="incident"
                                        rows={4}
                                        value={incidentNotes}
                                        onChange={(e) => setIncidentNotes(e.target.value)}
                                        placeholder="Décrivez l'incident…"
                                    />
                                </GlowCard>

                                <div className="flex flex-col gap-2.5">
                                    <ActionButton
                                        onClick={submitReport}
                                        loading={busy === 'submit'}
                                        disabled={busy !== null}
                                        icon={<Send />}
                                        className="h-12 w-full rounded-2xl text-base"
                                    >
                                        {busy === 'submit' ? 'Soumission…' : 'Soumettre le rapport'}
                                    </ActionButton>
                                    <ActionButton
                                        variant="secondary"
                                        onClick={() => setStep('edit')}
                                        disabled={busy !== null}
                                        icon={<ArrowLeft />}
                                        className="h-11 w-full rounded-2xl"
                                    >
                                        Modifier mes saisies
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════ SOUMIS : lecture seule ══════ */}
                    {isSubmitted && step !== 'incident' && (
                        <div className={twoCol}>
                            <GlowCard contentClassName="p-0">
                                <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                                    <h3 className="text-base font-semibold text-ink">Détail par produit</h3>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                    {report.lines.map((l) => (
                                        <li key={l.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                                            {l.image_url ? (
                                                <img src={l.image_url} alt={l.product_name} className="size-12 shrink-0 rounded-xl object-cover" />
                                            ) : (
                                                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                                                    <Package className="size-4 text-slate-300" />
                                                </span>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-ink">{l.product_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    Stock {l.opening_stock} → {l.closing_stock} {l.unit}
                                                    {l.units_sold > 0 && ` · ${l.units_sold} vendus`}
                                                </p>
                                                {l.notes && <p className="mt-0.5 text-xs text-slate-400 italic">{l.notes}</p>}
                                            </div>
                                            {l.unit_price > 0 && l.units_sold > 0 && (
                                                <p className="shrink-0 font-semibold text-aktivy-deep tabular-nums">
                                                    {formatMoney(l.revenue)}
                                                    <span className="ml-1 text-xs font-medium text-slate-400">FCFA</span>
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </GlowCard>

                            <div className="flex flex-col gap-6 lg:sticky lg:top-6">
                                <div className="flex items-center gap-4 rounded-2xl bg-aktivy-soft p-5 ring-1 ring-green-100">
                                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-aktivy text-white shadow-lg shadow-aktivy/30">
                                        <CheckCircle2 className="size-6" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-green-900">Soumis à {report.submitted_at}</p>
                                        <p className="text-2xl font-extrabold text-aktivy-deep tabular-nums">
                                            {formatMoney(report.total_revenue)}
                                            <span className="ml-1 text-sm font-medium text-green-700/70">FCFA</span>
                                        </p>
                                        <p className="text-xs text-green-700">
                                            {report.total_units_sold} unité{report.total_units_sold > 1 ? 's' : ''} vendues
                                        </p>
                                    </div>
                                </div>

                                {report.notes && (
                                    <GlowCard contentClassName="p-5">
                                        <h3 className="mb-1.5 text-sm font-semibold text-slate-500">Notes du jour</h3>
                                        <p className="text-sm leading-relaxed text-ink">{report.notes}</p>
                                    </GlowCard>
                                )}

                                {report.incident_notes && (
                                    <GlowCard contentClassName="p-5">
                                        <h3 className="mb-1.5 text-sm font-semibold text-amber-600">Incident signalé</h3>
                                        <p className="text-sm leading-relaxed text-amber-800">{report.incident_notes}</p>
                                    </GlowCard>
                                )}

                                <div className="flex flex-col gap-2.5">
                                    {visit.status === 'in_progress' && (
                                        <ActionButton
                                            variant="secondary"
                                            icon={<Flag />}
                                            onClick={() => setConfirmCheckout(true)}
                                            className="h-12 w-full rounded-2xl border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                                        >
                                            Terminer mon service
                                        </ActionButton>
                                    )}
                                    <ActionButton
                                        variant="secondary"
                                        icon={<AlertTriangle />}
                                        onClick={() => setStep('incident')}
                                        className="h-11 w-full rounded-2xl border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                                    >
                                        Signaler une erreur
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════ SIGNALEMENT POST-SOUMISSION ══════ */}
                    {isSubmitted && step === 'incident' && (
                        <div className={twoCol}>
                            <GlowCard contentClassName="p-5 sm:p-6">
                                <label htmlFor="flag" className="text-base font-semibold text-ink">
                                    Signalement / Correction
                                </label>
                                <p className="mt-0.5 mb-3 text-sm text-slate-500">
                                    Décrivez le problème. Votre responsable en sera informé.
                                </p>
                                <TextArea
                                    id="flag"
                                    rows={7}
                                    value={incidentNotes}
                                    onChange={(e) => setIncidentNotes(e.target.value)}
                                    placeholder="Erreur de saisie, rupture non signalée, problème client…"
                                />
                            </GlowCard>
                            <div className="flex flex-col gap-2.5 lg:sticky lg:top-6">
                                <ActionButton
                                    onClick={submitFlag}
                                    loading={busy === 'flag'}
                                    disabled={busy !== null || !incidentNotes.trim()}
                                    icon={<Megaphone />}
                                    className="h-12 w-full rounded-2xl bg-amber-500 text-base shadow-amber-400/30 hover:bg-amber-600"
                                >
                                    {busy === 'flag' ? 'Envoi…' : 'Envoyer le signalement'}
                                </ActionButton>
                                <ActionButton
                                    variant="secondary"
                                    icon={<ArrowLeft />}
                                    onClick={() => setStep('edit')}
                                    className="h-11 w-full rounded-2xl"
                                >
                                    Retour
                                </ActionButton>
                            </div>
                        </div>
                    )}
                </div>
            </Page>

            <ConfirmDialog
                open={confirmCheckout}
                onOpenChange={setConfirmCheckout}
                title="Terminer votre service ?"
                description="Votre heure de départ et votre position seront enregistrées."
                confirmLabel="Terminer mon service"
                icon={Flag}
                tone="primary"
                loading={busy === 'checkout'}
                onConfirm={checkoutAndGo}
            />
        </>
    );
}

TerrainReport.layout = {
    breadcrumbs: [
        { title: 'Tableau de bord', href: terrainHome().url },
        { title: 'Rapport du jour' },
    ],
};