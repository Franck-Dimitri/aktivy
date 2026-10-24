import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BadgeDollarSign,
    Check,
    CheckCircle2,
    Clock,
    Flag,
    Megaphone,
    Minus,
    Package,
    Plus,
    Save,
    Send,
    TriangleAlert,
} from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { TextArea, TextInput } from '@/components/page/form-fields';
import { Page } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { GlowCard, GlowStyles, MetricStrip } from '@/components/page/surface';
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
        success: 'border-green-200 bg-motriks-soft text-green-800',
        danger: 'border-red-200 bg-red-50 text-red-800',
    };
    return (
        <div className={cn('flex items-start gap-3 rounded-2xl border p-4 text-sm', styles[tone])}>
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p>{children}</p>
        </div>
    );
}

/* ─── Indicateur de progression ─── */

function StepIndicator({ step, isSubmitted }: { step: Step; isSubmitted: boolean }) {
    const steps = [
        { label: 'Saisie', num: 1 },
        { label: 'Révision', num: 2 },
        { label: 'Soumis', num: 3 },
    ];
    const current = isSubmitted ? 3 : step === 'review' ? 2 : 1;

    return (
        <div className="flex items-center">
            {steps.map((s, i) => (
                <Fragment key={s.label}>
                    <div className="flex flex-col items-center gap-1.5">
                        <div className={cn(
                            'flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
                            s.num < current && 'bg-motriks text-white',
                            s.num === current && 'bg-motriks text-white shadow-md shadow-motriks/30 ring-4 ring-motriks/15',
                            s.num > current && 'bg-slate-100 text-slate-400',
                        )}>
                            {s.num < current ? <Check className="size-3.5" /> : s.num}
                        </div>
                        <span className={cn(
                            'text-[11px] font-medium transition-colors',
                            s.num <= current ? 'text-motriks-deep' : 'text-slate-400',
                        )}>
                            {s.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={cn(
                            'mb-4 h-px flex-1 transition-all duration-500',
                            s.num < current ? 'bg-motriks' : 'bg-slate-200',
                        )} />
                    )}
                </Fragment>
            ))}
        </div>
    );
}

/* ─── StockBar ─── */

function StockBar({ used, total }: { used: number; total: number }) {
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
    const remaining = total - used;
    const tone = remaining === 0 ? 'bg-red-400' : remaining <= total * 0.2 ? 'bg-amber-400' : 'bg-motriks';

    return (
        <div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={cn('h-full rounded-full transition-[width] duration-300', tone)} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>Vendu : {used}</span>
                <span className={cn(
                    'font-medium',
                    remaining === 0 ? 'text-red-600' : remaining <= total * 0.2 ? 'text-amber-600' : 'text-slate-500',
                )}>
                    Reste : {remaining}
                </span>
            </div>
        </div>
    );
}

/* ─── ProductCard ─── */

function ProductCard({ line, onChange, onNoteChange, disabled }: {
    line: ReportLine;
    onChange: (sold: number) => void;
    onNoteChange: (note: string) => void;
    disabled: boolean;
}) {
    const remaining = Math.max(0, line.opening_stock - line.units_sold);
    const revenueAmount = line.units_sold * line.unit_price;

    return (
        <div className={cn(
            'flex flex-col gap-3 rounded-2xl p-4 ring-1 transition-all',
            line.units_sold > 0
                ? 'bg-motriks-soft ring-green-200'
                : 'bg-white ring-slate-100',
        )}>
            {/* En-tête */}
            <div className="flex items-start gap-3">
                {line.image_url ? (
                    <img
                        src={line.image_url}
                        alt={line.product_name}
                        className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-slate-100"
                    />
                ) : (
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                        <Package className="size-6" />
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink leading-tight">{line.product_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Stock : {line.opening_stock} {line.unit}
                    </p>
                    {line.unit_price > 0 && (
                        <p className="text-xs text-slate-400">
                            {formatMoney(line.unit_price)} FCFA / {line.unit}
                        </p>
                    )}
                </div>
                {remaining === 0 && line.opening_stock > 0 && (
                    <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/15">
                        Épuisé
                    </span>
                )}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={disabled || line.units_sold <= 0}
                    onClick={() => onChange(Math.max(0, line.units_sold - 1))}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-90 disabled:opacity-40"
                    aria-label="Retirer une unité"
                >
                    <Minus className="size-4" />
                </button>
                <TextInput
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={line.opening_stock}
                    value={line.units_sold}
                    disabled={disabled}
                    onChange={(e) => onChange(Math.max(0, Math.min(line.opening_stock, Number(e.target.value))))}
                    aria-label={`Unités vendues — ${line.product_name}`}
                    className="h-10 text-center text-lg font-bold tabular-nums"
                />
                <button
                    type="button"
                    disabled={disabled || line.units_sold >= line.opening_stock}
                    onClick={() => onChange(Math.min(line.opening_stock, line.units_sold + 1))}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-90 disabled:opacity-40"
                    aria-label="Ajouter une unité"
                >
                    <Plus className="size-4" />
                </button>
            </div>

            {/* Stock bar */}
            {line.opening_stock > 0 && (
                <StockBar used={line.units_sold} total={line.opening_stock} />
            )}

            {/* Revenue badge */}
            {revenueAmount > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 ring-1 ring-green-200/60">
                    <span className="text-xs text-green-700">
                        {line.units_sold} × {formatMoney(line.unit_price)}
                    </span>
                    <span className="text-sm font-bold text-motriks-deep tabular-nums">
                        {formatMoney(revenueAmount)} FCFA
                    </span>
                </div>
            )}

            {/* Note */}
            <TextInput
                placeholder={`Note (optionnel)`}
                value={line.notes ?? ''}
                disabled={disabled}
                onChange={(e) => onNoteChange(e.target.value)}
                className="h-9 text-xs bg-white/70"
            />
        </div>
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
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">

                    {/* ── En-tête visite ── */}
                    <GlowCard contentClassName="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                                    <Clock className="size-3.5" />
                                    Arrivée {visit.checked_in_at}
                                </span>
                                {visit.checked_out_at && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                                        <Flag className="size-3.5" />
                                        Départ {visit.checked_out_at}
                                    </span>
                                )}
                            </div>
                            {isSubmitted ? (
                                <StatusBadge tone="success">Soumis à {report.submitted_at}</StatusBadge>
                            ) : (
                                <StatusBadge tone="warning">Brouillon</StatusBadge>
                            )}
                        </div>
                    </GlowCard>

                    {/* ── Indicateur de progression ── */}
                    <StepIndicator step={step} isSubmitted={isSubmitted} />

                    {/* ── Résumé CA + unités ── */}
                    <MetricStrip
                        items={[
                            {
                                label: 'Unités vendues',
                                value: isSubmitted ? report.total_units_sold : totalSold,
                                sub: `sur ${lines.reduce((s, l) => s + l.opening_stock, 0)} en stock`,
                                live: !isSubmitted && totalSold > 0,
                            },
                            {
                                label: "Chiffre d'affaires",
                                value: (
                                    <>
                                        {isSubmitted
                                            ? formatMoney(report.total_revenue)
                                            : formatMoney(totalRevenue)}
                                        <span className="text-sm font-medium text-slate-400">FCFA</span>
                                    </>
                                ),
                                sub: 'journée en cours',
                            },
                            { label: 'Produits', value: lines.length, sub: 'ce point de vente' },
                            {
                                label: 'Statut',
                                value: isSubmitted ? 'Soumis' : step === 'review' ? 'En révision' : 'Brouillon',
                                sub: 'état du rapport',
                            },
                        ]}
                    />

                    {/* ══════ ÉTAPE SAISIE ══════ */}
                    {!isSubmitted && step === 'edit' && (
                        <>
                            {/* Grille produits */}
                            <GlowCard contentClassName="p-5">
                                <div className="mb-4">
                                    <h3 className="text-base font-semibold text-ink">Ventes par produit</h3>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        Entrez le nombre d'unités vendues pour chaque produit.
                                    </p>
                                </div>

                                {lines.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                                        <Package className="size-10 text-slate-200" />
                                        <p className="text-sm font-medium text-slate-500">Aucun produit configuré</p>
                                        <p className="text-xs text-slate-400">
                                            Votre responsable doit d'abord ajouter des produits à ce site.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {lines.map((line) => (
                                            <ProductCard
                                                key={line.id}
                                                line={line}
                                                onChange={(sold) => updateLine(line.id, sold)}
                                                onNoteChange={(note) => updateLineNote(line.id, note)}
                                                disabled={busy !== null}
                                            />
                                        ))}
                                    </div>
                                )}
                            </GlowCard>

                            {/* Notes */}
                            <GlowCard contentClassName="p-5">
                                <h3 className="mb-1 text-base font-semibold text-ink">Notes du jour</h3>
                                <p className="mb-3 text-sm text-slate-500">
                                    Observations sur la journée (facultatif).
                                </p>
                                <TextArea
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Événements particuliers, remarques clients, problèmes…"
                                />
                            </GlowCard>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <ActionButton
                                    onClick={() => setStep('review')}
                                    disabled={busy !== null}
                                    className="h-14 w-full rounded-2xl text-base"
                                    icon={<ArrowRight className="order-last" />}
                                >
                                    Revoir et soumettre
                                </ActionButton>
                                <ActionButton
                                    variant="secondary"
                                    onClick={saveDraft}
                                    loading={busy === 'draft'}
                                    disabled={busy !== null}
                                    icon={<Save />}
                                    className="h-11 w-full rounded-2xl"
                                >
                                    {busy === 'draft' ? 'Sauvegarde…' : 'Sauvegarder le brouillon'}
                                </ActionButton>
                            </div>

                            {/* Barre de total flottante */}
                            {totalSold > 0 && (
                                <div className="sticky bottom-4 z-10">
                                    <div className="rounded-2xl bg-slate-900 px-5 py-3.5 shadow-2xl shadow-slate-900/30 ring-1 ring-slate-700">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-medium text-slate-400">
                                                    {totalSold} unité{totalSold > 1 ? 's' : ''} vendues
                                                </p>
                                                <p className="text-xl font-bold tabular-nums text-white">
                                                    {formatMoney(totalRevenue)}
                                                    <span className="ml-1.5 text-sm font-medium text-slate-400">FCFA</span>
                                                </p>
                                            </div>
                                            <ActionButton
                                                onClick={() => setStep('review')}
                                                disabled={busy !== null}
                                                className="h-10 shrink-0 rounded-xl text-sm"
                                            >
                                                Réviser →
                                            </ActionButton>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ══════ ÉTAPE RÉVISION ══════ */}
                    {!isSubmitted && step === 'review' && (
                        <>
                            <Notice tone="warning" icon={TriangleAlert}>
                                Vérifiez vos données avant de soumettre.{' '}
                                <strong>Le rapport ne pourra plus être modifié.</strong>
                            </Notice>

                            {/* Reçu style */}
                            <GlowCard contentClassName="p-0">
                                <div className="border-b border-dashed border-slate-200 px-6 py-4">
                                    <h3 className="text-base font-semibold text-ink">Récapitulatif</h3>
                                    <p className="mt-0.5 text-sm text-slate-500">{report.site_name} · {report.report_date}</p>
                                </div>

                                <div className="divide-y divide-dashed divide-slate-200">
                                    {lines.map((l) => (
                                        <div key={l.id} className="flex items-center gap-3 px-6 py-3">
                                            {l.image_url ? (
                                                <img src={l.image_url} alt={l.product_name} className="size-9 shrink-0 rounded-lg object-cover" />
                                            ) : (
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                                    <Package className="size-4 text-slate-300" />
                                                </span>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-ink">{l.product_name}</p>
                                                <p className="text-xs text-slate-400">
                                                    {l.units_sold} {l.unit} vendu{l.units_sold > 1 ? 's' : ''}
                                                    {l.unit_price > 0 && ` · ${formatMoney(l.unit_price)} / u`}
                                                </p>
                                            </div>
                                            {l.unit_price > 0 && (
                                                <p className={cn(
                                                    'shrink-0 text-sm font-bold tabular-nums',
                                                    l.units_sold > 0 ? 'text-motriks-deep' : 'text-slate-300',
                                                )}>
                                                    {formatMoney(l.units_sold * l.unit_price)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-dashed border-slate-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-500">{totalSold} unité{totalSold > 1 ? 's' : ''} vendues</p>
                                            <p className="mt-0.5 text-sm font-bold text-ink">Total journée</p>
                                        </div>
                                        <p className="text-2xl font-extrabold tabular-nums text-motriks-deep">
                                            {formatMoney(totalRevenue)}
                                            <span className="ml-1 text-sm font-medium text-slate-400">FCFA</span>
                                        </p>
                                    </div>
                                </div>
                            </GlowCard>

                            {/* Signalement incident */}
                            <GlowCard contentClassName="p-5">
                                <h3 className="mb-1 text-base font-semibold text-ink">Signaler un incident</h3>
                                <p className="mb-3 text-sm text-slate-500">
                                    Optionnel — rupture de stock, problème client, matériel manquant…
                                </p>
                                <TextArea
                                    rows={3}
                                    value={incidentNotes}
                                    onChange={(e) => setIncidentNotes(e.target.value)}
                                    placeholder="Décrivez l'incident…"
                                />
                            </GlowCard>

                            <div className="flex flex-col gap-3">
                                <ActionButton
                                    onClick={submitReport}
                                    loading={busy === 'submit'}
                                    disabled={busy !== null}
                                    icon={<Send />}
                                    className="h-14 w-full rounded-2xl text-base"
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
                        </>
                    )}

                    {/* ══════ SOUMIS — Lecture seule ══════ */}
                    {isSubmitted && step !== 'incident' && (
                        <>
                            {/* Confirmation */}
                            <div className="flex flex-col items-center gap-2 rounded-2xl bg-motriks-soft py-6 text-center ring-1 ring-green-100">
                                <div className="flex size-12 items-center justify-center rounded-full bg-motriks text-white shadow-lg shadow-motriks/30">
                                    <CheckCircle2 className="size-6" />
                                </div>
                                <p className="font-semibold text-green-800">Rapport soumis à {report.submitted_at}</p>
                                <p className="text-sm text-green-700">
                                    {formatMoney(report.total_revenue)} FCFA enregistrés
                                </p>
                            </div>

                            {/* Détail produits */}
                            <GlowCard contentClassName="p-0">
                                <div className="border-b border-slate-100 px-6 py-4">
                                    <h3 className="text-base font-semibold text-ink">Détail par produit</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {report.lines.map((l) => (
                                        <div key={l.id} className="flex items-center gap-3 px-6 py-3.5">
                                            {l.image_url ? (
                                                <img src={l.image_url} alt={l.product_name} className="size-10 shrink-0 rounded-xl object-cover" />
                                            ) : (
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                                                    <Package className="size-4 text-slate-300" />
                                                </span>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-ink">{l.product_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    Ouv. {l.opening_stock} → Clôt. {l.closing_stock} {l.unit}
                                                    {l.units_sold > 0 && ` · ${l.units_sold} vendus`}
                                                </p>
                                                {l.notes && <p className="mt-0.5 text-xs italic text-slate-400">{l.notes}</p>}
                                            </div>
                                            {l.unit_price > 0 && l.units_sold > 0 && (
                                                <p className="shrink-0 font-semibold text-motriks-deep tabular-nums">
                                                    {formatMoney(l.revenue)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                                    <p className="font-bold text-ink">Total</p>
                                    <p className="text-xl font-extrabold tabular-nums text-motriks-deep">
                                        {formatMoney(report.total_revenue)}
                                        <span className="ml-1 text-sm font-medium text-slate-400">FCFA</span>
                                    </p>
                                </div>
                            </GlowCard>

                            {report.notes && (
                                <GlowCard contentClassName="p-5">
                                    <h3 className="mb-2 text-sm font-semibold text-slate-500">Notes du jour</h3>
                                    <p className="text-sm leading-relaxed text-ink">{report.notes}</p>
                                </GlowCard>
                            )}

                            {report.incident_notes && (
                                <GlowCard contentClassName="p-5">
                                    <h3 className="mb-2 text-sm font-semibold text-amber-600">Incident signalé</h3>
                                    <p className="text-sm leading-relaxed text-amber-800">{report.incident_notes}</p>
                                </GlowCard>
                            )}

                            <div className="flex flex-col gap-3">
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
                        </>
                    )}

                    {/* ══════ SIGNALEMENT POST-SOUMISSION ══════ */}
                    {isSubmitted && step === 'incident' && (
                        <>
                            <GlowCard contentClassName="p-5">
                                <h3 className="mb-1 text-base font-semibold text-ink">Signalement / Correction</h3>
                                <p className="mb-3 text-sm text-slate-500">
                                    Décrivez le problème. Votre responsable en sera informé.
                                </p>
                                <TextArea
                                    rows={5}
                                    value={incidentNotes}
                                    onChange={(e) => setIncidentNotes(e.target.value)}
                                    placeholder="Erreur de saisie, rupture non signalée, problème client…"
                                />
                            </GlowCard>
                            <div className="flex flex-col gap-3">
                                <ActionButton
                                    onClick={submitFlag}
                                    loading={busy === 'flag'}
                                    disabled={busy !== null || !incidentNotes.trim()}
                                    icon={<Megaphone />}
                                    className="h-14 w-full rounded-2xl bg-amber-500 text-base shadow-amber-400/30 hover:bg-amber-600"
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
                        </>
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
