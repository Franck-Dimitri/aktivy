import { router } from '@inertiajs/react';
import { Check, Pencil, Target, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import { ActionButton } from '@/components/page/buttons';
import { TextInput } from '@/components/page/form-fields';
import { Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { cn } from '@/lib/utils';
import { save as saveTarget } from '@/routes/reports/targets';
import { monthName, money, number } from './format';

type TargetLine = { actual: number; target: number | null; projection: number };

export type Targets = {
    month: string;
    days_elapsed: number;
    days_in_month: number;
    /** Absent pour un superviseur : il ne voit que ses sites et ses hôtesses. */
    global: TargetLine | null;
    sites: (TargetLine & { site_id: number; name: string })[];
    hostesses: (TargetLine & { user_id: number; name: string })[];
};

/** Ce sur quoi porte un objectif : l'entreprise (vide), un site ou une hôtesse. */
type TargetScope = { site_id?: number; user_id?: number };

/** Statut d'un objectif : atteint, en bonne voie (projection suffisante) ou en retard. */
function status(line: TargetLine) {
    if (!line.target) return null;
    if (line.actual >= line.target) return <StatusBadge tone="success">Atteint</StatusBadge>;
    if (line.projection >= line.target) return <StatusBadge tone="info">En bonne voie</StatusBadge>;

    return <StatusBadge tone="warning">En retard</StatusBadge>;
}

function TargetRow({ label, line, scope, currency, canEdit, prominent = false }: {
    label: string;
    line: TargetLine;
    scope: TargetScope;
    currency: string;
    canEdit: boolean;
    prominent?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [amount, setAmount] = useState(line.target ? String(line.target) : '');
    const [error, setError] = useState<string>();
    const [saving, setSaving] = useState(false);

    const percent = line.target ? Math.min(100, (line.actual / line.target) * 100) : 0;
    const projectionPercent = line.target ? Math.min(100, (line.projection / line.target) * 100) : 0;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        router.post(
            saveTarget().url,
            { ...scope, amount: amount === '' ? null : Number(amount) },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onSuccess: () => { setEditing(false); setError(undefined); },
                onError: (errors) => setError(errors.amount ?? errors.site_id ?? errors.user_id),
            },
        );
    };

    return (
        <li className={cn('px-5', prominent ? 'py-5' : 'py-4')}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={cn('truncate font-semibold text-ink', prominent ? 'text-base' : 'text-sm')}>{label}</span>
                    {status(line)}
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <span className="tabular-nums text-ink">
                        <span className="font-semibold">{money(line.actual, currency)}</span>
                        {line.target ? <span className="text-slate-400"> / {money(line.target, currency)}</span> : null}
                    </span>
                    {canEdit && !editing && (
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-motriks-deep hover:bg-motriks-soft"
                        >
                            <Pencil className="size-3" />
                            {line.target ? 'Modifier' : 'Fixer un objectif'}
                        </button>
                    )}
                </div>
            </div>

            {line.target ? (
                <>
                    {/* Barre : réalisé (plein) et projection de fin de mois (repère) */}
                    <div className="relative mt-3 h-2 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-motriks" style={{ width: `${percent}%` }} />
                        {projectionPercent > percent && (
                            <div
                                className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-slate-400"
                                style={{ left: `calc(${projectionPercent}% - 1px)` }}
                                title="Projection de fin de mois"
                            />
                        )}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        {number.format(Math.round((line.actual / line.target) * 100))} % réalisé · projection fin de mois{' '}
                        <span className="font-medium tabular-nums text-slate-700">{money(line.projection, currency)}</span>
                        {line.projection < line.target && line.actual < line.target && (
                            <> · il manque <span className="font-medium tabular-nums text-slate-700">{money(line.target - line.actual, currency)}</span></>
                        )}
                    </p>
                </>
            ) : (
                !editing && <p className="mt-1.5 text-xs text-slate-400">Pas d’objectif ce mois-ci · projection {money(line.projection, currency)}</p>
            )}

            {editing && (
                <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <TextInput
                            type="number"
                            min={0}
                            step={1000}
                            inputMode="numeric"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={`Montant (${currency})`}
                            className="w-48"
                            autoFocus
                        />
                        <ActionButton type="submit" size="sm" icon={<Check />} loading={saving}>Enregistrer</ActionButton>
                        <ActionButton type="button" size="sm" variant="ghost" icon={<X />} onClick={() => setEditing(false)}>Annuler</ActionButton>
                    </div>
                    <p className="text-xs text-slate-400">Laissez vide pour retirer l’objectif.</p>
                    <InputError message={error} />
                </form>
            )}
        </li>
    );
}

function SectionTitle({ children }: { children: string }) {
    return <li className="bg-slate-50/70 px-5 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{children}</li>;
}

export function TargetsPanel({ targets, currency, canEdit }: { targets: Targets; currency: string; canEdit: boolean }) {
    return (
        <Panel
            title={`Objectifs de ${monthName(targets.month).toLowerCase()}`}
            description={`Jour ${targets.days_elapsed} sur ${targets.days_in_month} · indépendamment des filtres.`}
            actions={<Target className="size-4 text-slate-300" />}
        >
            <ul className="divide-y divide-slate-100">
                {targets.global && (
                    <TargetRow label="Entreprise" line={targets.global} scope={{}} currency={currency} canEdit={canEdit} prominent />
                )}
                {targets.sites.length > 0 && <SectionTitle>Points de vente</SectionTitle>}
                {targets.sites.map((s) => (
                    <TargetRow key={`site-${s.site_id}`} label={s.name} line={s} scope={{ site_id: s.site_id }} currency={currency} canEdit={canEdit} />
                ))}
                {targets.hostesses.length > 0 && <SectionTitle>Hôtesses</SectionTitle>}
                {targets.hostesses.map((h) => (
                    <TargetRow key={`hostess-${h.user_id}`} label={h.name} line={h} scope={{ user_id: h.user_id }} currency={currency} canEdit={canEdit} />
                ))}
            </ul>
        </Panel>
    );
}
