import { Head, router, usePage } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { update as reportUpdate, submit as reportSubmit, flag as reportFlag } from '@/routes/terrain/report';
import { checkout as visitCheckout } from '@/routes/terrain/visit';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Helpers UI                                                          */
/* ------------------------------------------------------------------ */
function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' FCFA';
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                                 */
/* ------------------------------------------------------------------ */
export default function TerrainReport({
    visit,
    report,
}: {
    visit: VisitInfo;
    report: Report;
}) {
    const isSubmitted = report.status === 'submitted';
    const [lines, setLines] = useState<ReportLine[]>(report.lines);
    const [notes, setNotes] = useState(report.notes ?? '');
    const [incidentNotes, setIncidentNotes] = useState(report.incident_notes ?? '');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'edit' | 'review' | 'incident'>('edit');

    // Calculs temps réel
    const totalSold = lines.reduce((s, l) => s + l.units_sold, 0);
    const totalRevenue = lines.reduce((s, l) => s + l.units_sold * l.unit_price, 0);

    function updateLine(id: number, sold: number) {
        setLines((prev) =>
            prev.map((l) =>
                l.id === id
                    ? { ...l, units_sold: sold, closing_stock: Math.max(0, l.opening_stock - sold), revenue: sold * l.unit_price }
                    : l,
            ),
        );
    }

    function updateLineNote(id: number, note: string) {
        setLines((prev) => prev.map((l) => (l.id === id ? { ...l, notes: note } : l)));
    }

    function saveDraft() {
        setLoading(true);
        router.put(reportUpdate({ visit: visit.id }).url, {
            notes,
            lines: lines.map((l) => ({ id: l.id, units_sold: l.units_sold, notes: l.notes })),
        }, { onFinish: () => setLoading(false), preserveScroll: true });
    }

    function submitReport() {
        setLoading(true);
        router.post(reportSubmit({ visit: visit.id }).url, {
            notes,
            incident_notes: incidentNotes || null,
            lines: lines.map((l) => ({ id: l.id, units_sold: l.units_sold, notes: l.notes })),
        }, { onFinish: () => setLoading(false) });
    }

    function submitFlag() {
        setLoading(true);
        router.post(reportFlag({ visit: visit.id }).url, {
            incident_notes: incidentNotes,
        }, { onFinish: () => { setLoading(false); setStep('edit'); } });
    }

    function checkoutAndGo() {
        if (visit.status !== 'in_progress') return;
        setLoading(true);
        const doCheckout = (lat?: number, lng?: number) => {
            router.patch(visitCheckout({ visit: visit.id }).url, {
                latitude: lat ?? null,
                longitude: lng ?? null,
            }, { onFinish: () => setLoading(false) });
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

            {/* En-tête */}
            <div className="mb-5">
                <a href="/terrain" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                    ← Retour
                </a>
                <h1 className="text-xl font-bold text-slate-900">{report.site_name}</h1>
                <p className="capitalize text-sm text-slate-500">{report.report_date}</p>
                <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
                    <span>🕐 Arrivée {visit.checked_in_at}</span>
                    {visit.checked_out_at && <span>🏁 Départ {visit.checked_out_at}</span>}
                    {isSubmitted && (
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                            Soumis à {report.submitted_at}
                        </span>
                    )}
                </div>
            </div>

            {/* Vue brouillon : saisie */}
            {!isSubmitted && step === 'edit' && (
                <div className="flex flex-col gap-4">
                    {/* Résumé rapide */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-green-50 p-4 text-center">
                            <p className="text-xs text-green-700">Unités vendues</p>
                            <p className="text-3xl font-extrabold text-green-700">{totalSold}</p>
                        </div>
                        <div className="rounded-2xl bg-blue-50 p-4 text-center">
                            <p className="text-xs text-blue-700">CA journalier</p>
                            <p className="text-xl font-extrabold text-blue-700">{formatMoney(totalRevenue)}</p>
                        </div>
                    </div>

                    {/* Lignes produit */}
                    <Section title="Ventes par produit">
                        <div className="flex flex-col divide-y divide-slate-100">
                            {lines.map((line) => (
                                <div key={line.id} className="py-4 first:pt-0 last:pb-0">
                                    <div className="mb-2 flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-900">{line.product_name}</p>
                                            <p className="text-xs text-slate-400">
                                                Stock ouverture : {line.opening_stock} {line.unit}
                                                {line.unit_price > 0 && ` · ${formatMoney(line.unit_price)} / ${line.unit}`}
                                            </p>
                                        </div>
                                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                                            line.closing_stock === 0
                                                ? 'bg-red-100 text-red-700'
                                                : line.closing_stock <= (line.opening_stock * 0.2)
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            Reste : {Math.max(0, line.opening_stock - line.units_sold)} {line.unit}
                                        </span>
                                    </div>

                                    {/* Saisie quantité */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => updateLine(line.id, Math.max(0, line.units_sold - 1))}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-700 transition active:scale-90"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min={0}
                                            max={line.opening_stock}
                                            value={line.units_sold}
                                            onChange={(e) => updateLine(line.id, Math.max(0, Math.min(line.opening_stock, Number(e.target.value))))}
                                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 text-center text-lg font-bold text-slate-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateLine(line.id, Math.min(line.opening_stock, line.units_sold + 1))}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-700 transition active:scale-90"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {line.units_sold > 0 && line.unit_price > 0 && (
                                        <p className="mt-1 text-right text-xs text-green-600 font-medium">
                                            = {formatMoney(line.units_sold * line.unit_price)}
                                        </p>
                                    )}

                                    {/* Note optionnelle */}
                                    <input
                                        type="text"
                                        placeholder="Note (optionnel)"
                                        value={line.notes ?? ''}
                                        onChange={(e) => updateLineNote(line.id, e.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                                    />
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Notes journalières */}
                    <Section title="Notes du jour (optionnel)">
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observations, remarques sur la journée…"
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                        />
                    </Section>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pb-8">
                        <button
                            onClick={() => setStep('review')}
                            className="w-full rounded-2xl bg-green-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-green-600/30 transition active:scale-95"
                        >
                            Revoir et soumettre →
                        </button>
                        <button
                            onClick={saveDraft}
                            disabled={loading}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-60"
                        >
                            {loading ? 'Sauvegarde…' : '💾 Sauvegarder le brouillon'}
                        </button>
                    </div>
                </div>
            )}

            {/* Étape revue avant soumission */}
            {!isSubmitted && step === 'review' && (
                <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        ⚠️ Vérifiez vos données avant de soumettre. <strong>Le rapport ne pourra plus être modifié.</strong>
                    </div>

                    {/* Résumé */}
                    <Section title="Récapitulatif">
                        <div className="flex flex-col divide-y divide-slate-100">
                            {lines.map((l) => (
                                <div key={l.id} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-slate-900">{l.product_name}</p>
                                        <p className="text-xs text-slate-400">Vendus : {l.units_sold} {l.unit} · Reste : {Math.max(0, l.opening_stock - l.units_sold)} {l.unit}</p>
                                    </div>
                                    {l.unit_price > 0 && (
                                        <p className="font-semibold text-green-700">{formatMoney(l.units_sold * l.unit_price)}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
                            <p className="font-bold text-slate-900">Total</p>
                            <p className="text-lg font-extrabold text-green-700">{formatMoney(totalRevenue)}</p>
                        </div>
                    </Section>

                    {/* Signalement incident optionnel à la soumission */}
                    <Section title="Signaler un incident (optionnel)">
                        <textarea
                            rows={3}
                            value={incidentNotes}
                            onChange={(e) => setIncidentNotes(e.target.value)}
                            placeholder="Rupture de stock, problème client, matériel manquant…"
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                        />
                    </Section>

                    <div className="flex flex-col gap-3 pb-8">
                        <button
                            onClick={submitReport}
                            disabled={loading}
                            className="w-full rounded-2xl bg-green-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-green-600/30 transition active:scale-95 disabled:opacity-60"
                        >
                            {loading ? 'Soumission…' : '✅ Soumettre le rapport'}
                        </button>
                        <button
                            onClick={() => setStep('edit')}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition active:scale-95"
                        >
                            ← Modifier les saisies
                        </button>
                    </div>
                </div>
            )}

            {/* Rapport soumis : lecture seule */}
            {isSubmitted && step !== 'incident' && (
                <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
                        ✅ Rapport soumis à <strong>{report.submitted_at}</strong>. Il ne peut plus être modifié.
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-green-50 p-4 text-center">
                            <p className="text-xs text-green-700">Unités vendues</p>
                            <p className="text-3xl font-extrabold text-green-700">{report.total_units_sold}</p>
                        </div>
                        <div className="rounded-2xl bg-blue-50 p-4 text-center">
                            <p className="text-xs text-blue-700">CA journalier</p>
                            <p className="text-xl font-extrabold text-blue-700">{formatMoney(report.total_revenue)}</p>
                        </div>
                    </div>

                    <Section title="Détail par produit">
                        <div className="flex flex-col divide-y divide-slate-100">
                            {report.lines.map((l) => (
                                <div key={l.id} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-slate-900">{l.product_name}</p>
                                        <p className="text-xs text-slate-400">
                                            Ouverture {l.opening_stock} → Clôture {l.closing_stock} {l.unit}
                                            {l.units_sold > 0 ? ` · ${l.units_sold} vendus` : ''}
                                        </p>
                                        {l.notes && <p className="mt-0.5 text-xs italic text-slate-500">{l.notes}</p>}
                                    </div>
                                    {l.unit_price > 0 && l.units_sold > 0 && (
                                        <p className="font-semibold text-green-700">{formatMoney(l.revenue)}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>

                    {report.notes && (
                        <Section title="Notes du jour">
                            <p className="text-sm text-slate-600">{report.notes}</p>
                        </Section>
                    )}

                    {report.incident_notes && (
                        <Section title="Incident signalé">
                            <p className="text-sm text-orange-700">{report.incident_notes}</p>
                        </Section>
                    )}

                    {/* Fin de service si pas encore fait */}
                    {visit.status === 'in_progress' && (
                        <button
                            onClick={checkoutAndGo}
                            disabled={loading}
                            className="w-full rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 text-base font-bold text-red-600 transition active:scale-95 disabled:opacity-60"
                        >
                            {loading ? 'Enregistrement…' : '🏁 Terminer mon service'}
                        </button>
                    )}

                    {/* Signalement post-soumission */}
                    <button
                        onClick={() => setStep('incident')}
                        className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-6 py-3 text-sm font-semibold text-orange-700 transition active:scale-95"
                    >
                        ⚠️ Signaler un incident ou une erreur
                    </button>
                </div>
            )}

            {/* Signalement post-soumission */}
            {isSubmitted && step === 'incident' && (
                <div className="flex flex-col gap-4">
                    <button onClick={() => setStep('edit')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                        ← Retour
                    </button>
                    <Section title="Signalement / Demande de correction">
                        <p className="mb-3 text-sm text-slate-600">
                            Décrivez le problème. Votre responsable en sera informé.
                        </p>
                        <textarea
                            rows={5}
                            value={incidentNotes}
                            onChange={(e) => setIncidentNotes(e.target.value)}
                            placeholder="Erreur de saisie, rupture non signalée, problème client…"
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                        />
                    </Section>
                    <button
                        onClick={submitFlag}
                        disabled={loading || !incidentNotes.trim()}
                        className="w-full rounded-2xl bg-orange-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-orange-400/30 transition active:scale-95 disabled:opacity-60"
                    >
                        {loading ? 'Envoi…' : '📢 Envoyer le signalement'}
                    </button>
                </div>
            )}
        </>
    );
}
