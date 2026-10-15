import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BadgeDollarSign,
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
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton, ActionLink } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { TextArea, TextInput } from '@/components/page/form-fields';
import { Panel } from '@/components/page/page';
import { StatCard } from '@/components/page/stat-card';
import { StatusBadge } from '@/components/page/status-badge';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { home as terrainHome } from '@/routes/terrain';
import { update as reportUpdate, submit as reportSubmit, flag as reportFlag } from '@/routes/terrain/report';
import { checkout as visitCheckout } from '@/routes/terrain/visit';

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

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Panel title={title}>
            <div className="p-5">{children}</div>
        </Panel>
    );
}

function Notice({ tone, icon: Icon, children }: { tone: 'warning' | 'success'; icon: typeof TriangleAlert; children: ReactNode }) {
    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-2xl border p-4 text-sm',
                tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-green-200 bg-aktivy-soft text-green-800',
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p>{children}</p>
        </div>
    );
}

function Summary({ units, revenue }: { units: number; revenue: number }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Package} label="Unités vendues" value={units} highlight />
            <StatCard icon={BadgeDollarSign} label="CA journalier" value={formatMoney(revenue)} />
        </div>
    );
}

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' FCFA';
}

export default function TerrainReport({ visit, report }: { visit: VisitInfo; report: Report }) {
    const isSubmitted = report.status === 'submitted';
    const [lines, setLines] = useState<ReportLine[]>(report.lines);
    const [notes, setNotes] = useState(report.notes ?? '');
    const [incidentNotes, setIncidentNotes] = useState(report.incident_notes ?? '');
    const [busy, setBusy] = useState<Busy>(null);
    const [step, setStep] = useState<'edit' | 'review' | 'incident'>('edit');
    const [confirmCheckout, setConfirmCheckout] = useState(false);

    const totalSold = lines.reduce((s, l) => s + l.units_sold, 0);
    const totalRevenue = lines.reduce((s, l) => s + l.units_sold * l.unit_price, 0);
    const payloadLines = () => lines.map((l) => ({ id: l.id, units_sold: l.units_sold, notes: l.notes }));

    function updateLine(id: number, sold: number) {
        setLines((prev) =>
            prev.map((l) =>
                l.id === id ? { ...l, units_sold: sold, closing_stock: Math.max(0, l.opening_stock - sold), revenue: sold * l.unit_price } : l,
            ),
        );
    }

    function updateLineNote(id: number, note: string) {
        setLines((prev) => prev.map((l) => (l.id === id ? { ...l, notes: note } : l)));
    }

    function saveDraft() {
        router.put(
            reportUpdate({ visit: visit.id }).url,
            { notes, lines: payloadLines() },
            {
                preserveScroll: true,
                onStart: () => setBusy('draft'),
                onSuccess: () => toast.success('Brouillon enregistré'),
                onError: toastFormError,
                onFinish: () => setBusy(null),
            },
        );
    }

    function submitReport() {
        router.post(
            reportSubmit({ visit: visit.id }).url,
            { notes, incident_notes: incidentNotes || null, lines: payloadLines() },
            {
                onStart: () => setBusy('submit'),
                onSuccess: () => toast.success('Rapport soumis', { description: `${formatMoney(totalRevenue)} enregistrés pour aujourd'hui.` }),
                onError: toastFormError,
                onFinish: () => setBusy(null),
            },
        );
    }

    function submitFlag() {
        router.post(
            reportFlag({ visit: visit.id }).url,
            { incident_notes: incidentNotes },
            {
                preserveScroll: true,
                onStart: () => setBusy('flag'),
                onSuccess: () => {
                    toast.success('Signalement envoyé', { description: 'Votre responsable en a été informé.' });
                    setStep('edit');
                },
                onError: toastFormError,
                onFinish: () => setBusy(null),
            },
        );
    }

    function checkoutAndGo() {
        if (visit.status !== 'in_progress') return;
        setBusy('checkout');

        const doCheckout = (lat?: number, lng?: number) => {
            router.patch(
                visitCheckout({ visit: visit.id }).url,
                { latitude: lat ?? null, longitude: lng ?? null },
                {
                    onSuccess: () => {
                        toast.success('Service terminé', { description: 'Merci pour votre journée !' });
                        setConfirmCheckout(false);
                    },
                    onError: toastFormError,
                    onFinish: () => setBusy(null),
                },
            );
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((p) => doCheckout(p.coords.latitude, p.coords.longitude), () => doCheckout(), { timeout: 8000 });
        } else {
            doCheckout();
        }
    }

    const stepper = 'size-11 rounded-xl text-slate-700 active:scale-90';

    return (
        <>
            <Head title="Rapport journalier" />

            <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6 sm:py-8">
                <header>
                    <ActionLink href={terrainHome().url} variant="ghost" size="sm" icon={<ArrowLeft />} className="-ml-2 mb-2">
                        Retour
                    </ActionLink>
                    <h1 className="text-2xl font-bold tracking-tight text-ink">{report.site_name}</h1>
                    <p className="text-sm text-slate-500 capitalize">{report.report_date}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                            <Clock className="size-3.5" />
                            Arrivée {visit.checked_in_at}
                        </span>
                        {visit.checked_out_at && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                                <Flag className="size-3.5" />
                                Départ {visit.checked_out_at}
                            </span>
                        )}
                        {isSubmitted && <StatusBadge tone="success">Soumis à {report.submitted_at}</StatusBadge>}
                    </div>
                </header>

                {/* Saisie */}
                {!isSubmitted && step === 'edit' && (
                    <div className="flex flex-col gap-5">
                        <Summary units={totalSold} revenue={totalRevenue} />

                        <Section title="Ventes par produit">
                            <div className="flex flex-col divide-y divide-slate-100">
                                {lines.map((line) => {
                                    const remaining = Math.max(0, line.opening_stock - line.units_sold);
                                    return (
                                        <div key={line.id} className="py-5 first:pt-0 last:pb-0">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-ink">{line.product_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        Stock d'ouverture : {line.opening_stock} {line.unit}
                                                        {line.unit_price > 0 && ` · ${formatMoney(line.unit_price)} / ${line.unit}`}
                                                    </p>
                                                </div>
                                                <span
                                                    className={cn(
                                                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                                                        remaining === 0
                                                            ? 'bg-red-50 text-red-700 ring-red-600/15'
                                                            : remaining <= line.opening_stock * 0.2
                                                              ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                                              : 'bg-slate-100 text-slate-600 ring-slate-500/10',
                                                    )}
                                                >
                                                    Reste {remaining} {line.unit}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <ActionButton variant="secondary" size="icon" className={stepper} icon={<Minus className="!size-5" />} aria-label="Retirer une unité" onClick={() => updateLine(line.id, Math.max(0, line.units_sold - 1))} />
                                                <div className="flex-1">
                                                    <TextInput
                                                        type="number"
                                                        inputMode="numeric"
                                                        min={0}
                                                        max={line.opening_stock}
                                                        value={line.units_sold}
                                                        onChange={(e) => updateLine(line.id, Math.max(0, Math.min(line.opening_stock, Number(e.target.value))))}
                                                        aria-label={`Unités vendues — ${line.product_name}`}
                                                        className="h-11 text-center text-lg font-bold"
                                                    />
                                                </div>
                                                <ActionButton variant="secondary" size="icon" className={stepper} icon={<Plus className="!size-5" />} aria-label="Ajouter une unité" onClick={() => updateLine(line.id, Math.min(line.opening_stock, line.units_sold + 1))} />
                                            </div>

                                            {line.units_sold > 0 && line.unit_price > 0 && (
                                                <p className="mt-1.5 text-right text-xs font-semibold text-aktivy-deep">= {formatMoney(line.units_sold * line.unit_price)}</p>
                                            )}

                                            <div className="mt-3">
                                                <TextInput
                                                    placeholder="Note (optionnel)"
                                                    value={line.notes ?? ''}
                                                    onChange={(e) => updateLineNote(line.id, e.target.value)}
                                                    aria-label={`Note — ${line.product_name}`}
                                                    className="h-10"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>

                        <Section title="Notes du jour (optionnel)">
                            <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations, remarques sur la journée…" />
                        </Section>

                        <div className="flex flex-col gap-3 pb-8">
                            <ActionButton onClick={() => setStep('review')} disabled={busy !== null} className="h-14 w-full rounded-2xl text-base" icon={<ArrowRight className="order-last" />}>
                                Revoir et soumettre
                            </ActionButton>
                            <ActionButton variant="secondary" onClick={saveDraft} loading={busy === 'draft'} disabled={busy !== null} icon={<Save />} className="h-12 w-full rounded-2xl">
                                {busy === 'draft' ? 'Sauvegarde…' : 'Sauvegarder le brouillon'}
                            </ActionButton>
                        </div>
                    </div>
                )}

                {/* Revue */}
                {!isSubmitted && step === 'review' && (
                    <div className="flex flex-col gap-5">
                        <Notice tone="warning" icon={TriangleAlert}>
                            Vérifiez vos données avant de soumettre. <strong>Le rapport ne pourra plus être modifié.</strong>
                        </Notice>

                        <Section title="Récapitulatif">
                            <div className="flex flex-col divide-y divide-slate-100">
                                {lines.map((l) => (
                                    <div key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                                        <div className="min-w-0">
                                            <p className="font-medium text-ink">{l.product_name}</p>
                                            <p className="text-xs text-slate-500">
                                                Vendus : {l.units_sold} {l.unit} · Reste : {Math.max(0, l.opening_stock - l.units_sold)} {l.unit}
                                            </p>
                                        </div>
                                        {l.unit_price > 0 && <p className="shrink-0 font-semibold text-aktivy-deep">{formatMoney(l.units_sold * l.unit_price)}</p>}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between rounded-xl bg-aktivy-soft px-4 py-3">
                                <p className="font-bold text-ink">Total</p>
                                <p className="text-lg font-extrabold text-aktivy-deep">{formatMoney(totalRevenue)}</p>
                            </div>
                        </Section>

                        <Section title="Signaler un incident (optionnel)">
                            <TextArea rows={3} value={incidentNotes} onChange={(e) => setIncidentNotes(e.target.value)} placeholder="Rupture de stock, problème client, matériel manquant…" />
                        </Section>

                        <div className="flex flex-col gap-3 pb-8">
                            <ActionButton onClick={submitReport} loading={busy === 'submit'} disabled={busy !== null} icon={<Send />} className="h-14 w-full rounded-2xl text-base">
                                {busy === 'submit' ? 'Soumission…' : 'Soumettre le rapport'}
                            </ActionButton>
                            <ActionButton variant="secondary" onClick={() => setStep('edit')} disabled={busy !== null} icon={<ArrowLeft />} className="h-12 w-full rounded-2xl">
                                Modifier mes saisies
                            </ActionButton>
                        </div>
                    </div>
                )}

                {/* Lecture seule */}
                {isSubmitted && step !== 'incident' && (
                    <div className="flex flex-col gap-5">
                        <Notice tone="success" icon={CheckCircle2}>
                            Rapport soumis à <strong>{report.submitted_at}</strong>. Il ne peut plus être modifié.
                        </Notice>

                        <Summary units={report.total_units_sold} revenue={report.total_revenue} />

                        <Section title="Détail par produit">
                            <div className="flex flex-col divide-y divide-slate-100">
                                {report.lines.map((l) => (
                                    <div key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                                        <div className="min-w-0">
                                            <p className="font-medium text-ink">{l.product_name}</p>
                                            <p className="text-xs text-slate-500">
                                                Ouverture {l.opening_stock} → Clôture {l.closing_stock} {l.unit}
                                                {l.units_sold > 0 ? ` · ${l.units_sold} vendus` : ''}
                                            </p>
                                            {l.notes && <p className="mt-0.5 text-xs text-slate-500 italic">{l.notes}</p>}
                                        </div>
                                        {l.unit_price > 0 && l.units_sold > 0 && <p className="shrink-0 font-semibold text-aktivy-deep">{formatMoney(l.revenue)}</p>}
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {report.notes && (
                            <Section title="Notes du jour">
                                <p className="text-sm leading-relaxed text-slate-600">{report.notes}</p>
                            </Section>
                        )}

                        {report.incident_notes && (
                            <Section title="Incident signalé">
                                <p className="text-sm leading-relaxed text-orange-700">{report.incident_notes}</p>
                            </Section>
                        )}

                        <div className="flex flex-col gap-3 pb-8">
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
                            <ActionButton variant="secondary" icon={<AlertTriangle />} onClick={() => setStep('incident')} className="h-12 w-full rounded-2xl border-orange-200 text-orange-700 hover:border-orange-300 hover:bg-orange-50">
                                Signaler un incident ou une erreur
                            </ActionButton>
                        </div>
                    </div>
                )}

                {/* Signalement après soumission */}
                {isSubmitted && step === 'incident' && (
                    <div className="flex flex-col gap-5">
                        <ActionButton variant="ghost" size="sm" icon={<ArrowLeft />} onClick={() => setStep('edit')} className="-ml-2 self-start">
                            Retour
                        </ActionButton>
                        <Section title="Signalement / Demande de correction">
                            <p className="mb-3 text-sm text-slate-600">Décrivez le problème. Votre responsable en sera informé.</p>
                            <TextArea rows={5} value={incidentNotes} onChange={(e) => setIncidentNotes(e.target.value)} placeholder="Erreur de saisie, rupture non signalée, problème client…" />
                        </Section>
                        <ActionButton
                            onClick={submitFlag}
                            loading={busy === 'flag'}
                            disabled={busy !== null || !incidentNotes.trim()}
                            icon={<Megaphone />}
                            className="h-14 w-full rounded-2xl bg-orange-500 text-base shadow-orange-400/30 hover:bg-orange-600 hover:shadow-orange-400/40"
                        >
                            {busy === 'flag' ? 'Envoi…' : 'Envoyer le signalement'}
                        </ActionButton>
                    </div>
                )}
            </div>

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
        { title: 'Ma journée', href: terrainHome().url },
        { title: 'Rapport du jour' },
    ],
};
