import { router } from '@inertiajs/react';
import { CalendarRange, Eraser, History, Target, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Segmented } from '@/components/page/list-kit';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import { cn } from '@/lib/utils';
import { show as weeklyShow, store as weeklyStore } from '@/routes/weekly-targets';

type Week = 'current' | 'next';

type Row = {
    user_id: number;
    name: string;
    sites: string[];
    target: number | null;
    actual: number;
    last_target: number | null;
    last_actual: number;
};

type Payload = {
    week: Week;
    week_start: string;
    week_end: string;
    days_elapsed: number;
    currency: string;
    hostesses: Row[];
};

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const fmt = (n: number) => nf.format(Math.round(n)).replace(/ | /g, ' ');
const unit = (c: string) => (c === 'XAF' || c === 'XOF' ? 'FCFA' : c);

function dayMonth(iso: string, withMonth = true) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', withMonth ? { day: 'numeric', month: 'long' } : { day: 'numeric' });
}

function initials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

/** Saisie des objectifs de la semaine, facultatifs. À monter uniquement quand il est ouvert. */
export function WeeklyTargetsModal({ onClose, initialWeek = 'current' }: { onClose: () => void; initialWeek?: Week }) {
    const [week, setWeek] = useState<Week>(initialWeek);
    const [data, setData] = useState<Payload | null>(null);
    const [failed, setFailed] = useState(false);
    const [amounts, setAmounts] = useState<Record<number, string>>({});
    const [bulk, setBulk] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        setData(null);
        setFailed(false);
        fetch(`${weeklyShow().url}?week=${week}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((r) => (r.ok ? (r.json() as Promise<Payload>) : Promise.reject(r.status)))
            .then((json) => {
                if (!alive) return;
                setData(json);
                setAmounts(Object.fromEntries(json.hostesses.map((h) => [h.user_id, h.target ? String(h.target) : ''])));
            })
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [week]);

    const close = useCallback(() => {
        if (!saving) onClose();
    }, [saving, onClose]);

    const rows = data?.hostesses ?? [];
    const filled = rows.filter((h) => Number(amounts[h.user_id]) > 0).length;
    const total = rows.reduce((s, h) => s + (Number(amounts[h.user_id]) || 0), 0);
    const dirty = useMemo(() => rows.some((h) => (Number(amounts[h.user_id]) || 0) !== (h.target ?? 0)), [rows, amounts]);
    const canReuse = rows.some((h) => h.last_target);
    const cur = unit(data?.currency ?? 'XAF');

    const set = (id: number, v: string) => setAmounts((a) => ({ ...a, [id]: v.replace(/[^\d]/g, '') }));

    const reuseLastWeek = () => setAmounts((a) => Object.fromEntries(rows.map((h) => [h.user_id, h.last_target ? String(h.last_target) : (a[h.user_id] ?? '')])));
    const applyToAll = () => Number(bulk) > 0 && setAmounts(Object.fromEntries(rows.map((h) => [h.user_id, bulk])));
    const clearAll = () => setAmounts(Object.fromEntries(rows.map((h) => [h.user_id, ''])));

    const save = () => {
        if (!data) return;
        router.post(
            weeklyStore().url,
            { week_start: data.week_start, targets: rows.map((h) => ({ user_id: h.user_id, amount: Number(amounts[h.user_id]) || null })) },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onSuccess: () => {
                    toast.success('Objectifs enregistrés', {
                        description: filled ? `${filled} hôtesse${filled > 1 ? 's sont prévenues' : ' est prévenue'} sous la cloche.` : 'Aucun objectif cette semaine.',
                    });
                    onClose();
                },
                onError: toastFormError,
                onFinish: () => setSaving(false),
            },
        );
    };

    const period = data ? `Du lundi ${dayMonth(data.week_start, false)} au dimanche ${dayMonth(data.week_end)}` : 'Chargement…';

    return (
        <Modal onClose={close} title="Objectifs de la semaine" description={`${period} · facultatif`} size="lg" icon={<Target />}>
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-6 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-sidebar-border">
                    <Segmented
                        label="Semaine"
                        value={week}
                        onChange={(w) => !saving && setWeek(w)}
                        options={[
                            { value: 'current', label: 'Cette semaine' },
                            { value: 'next', label: 'Semaine prochaine' },
                        ]}
                    />
                    {rows.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <div className="relative">
                                <input
                                    value={bulk ? fmt(Number(bulk)) : ''}
                                    onChange={(e) => setBulk(e.target.value.replace(/[^\d]/g, ''))}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyToAll())}
                                    inputMode="numeric"
                                    placeholder="Même montant"
                                    aria-label="Montant à appliquer à toutes les hôtesses"
                                    className="h-8 w-32 rounded-lg border border-slate-200 bg-white pr-2 pl-2.5 text-xs text-ink tabular-nums outline-none placeholder:text-slate-400 focus:border-motriks focus:ring-4 focus:ring-motriks/10 dark:border-sidebar-border dark:bg-transparent"
                                />
                            </div>
                            <ActionButton variant="secondary" size="sm" icon={<Users />} disabled={!(Number(bulk) > 0)} onClick={applyToAll}>
                                À toutes
                            </ActionButton>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {failed ? (
                        <p className="px-6 py-12 text-center text-sm text-slate-500">Impossible de charger les hôtesses. Vérifiez la connexion et réessayez.</p>
                    ) : !data ? (
                        <ul aria-busy className="divide-y divide-slate-100 dark:divide-sidebar-border">
                            {[0, 1, 2].map((i) => (
                                <li key={i} className="flex items-center gap-3 px-6 py-4">
                                    <span className="size-9 animate-pulse rounded-full bg-slate-100 dark:bg-white/5" />
                                    <span className="h-3 flex-1 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                                    <span className="h-9 w-36 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                                </li>
                            ))}
                        </ul>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-12 text-center">
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
                                <Users className="size-5" />
                            </span>
                            <p className="mt-4 text-sm font-semibold text-ink">Aucune hôtesse affectée</p>
                            <p className="mt-1 max-w-xs text-xs text-slate-500">Affectez des hôtesses à vos points de vente pour pouvoir leur fixer un objectif.</p>
                        </div>
                    ) : (
                        <>
                            {canReuse && (
                                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-6 py-2.5 dark:border-sidebar-border dark:bg-white/[0.02]">
                                    <button type="button" onClick={reuseLastWeek} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-motriks-deep transition-colors hover:bg-motriks-soft">
                                        <History className="size-3.5" />
                                        Reprendre les objectifs de la semaine dernière
                                    </button>
                                    {filled > 0 && (
                                        <button type="button" onClick={clearAll} className="ml-auto inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink dark:hover:bg-white/5">
                                            <Eraser className="size-3.5" />
                                            Tout effacer
                                        </button>
                                    )}
                                </div>
                            )}
                            <ul className="divide-y divide-slate-100 dark:divide-sidebar-border">
                                {rows.map((h) => {
                                    const value = amounts[h.user_id] ?? '';
                                    const amount = Number(value) || 0;
                                    const pct = data.week === 'current' && amount > 0 ? Math.min(100, (h.actual / amount) * 100) : 0;
                                    const reached = amount > 0 && h.actual >= amount;

                                    return (
                                        <li key={h.user_id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 px-6 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_176px]">
                                            <span className={cn('flex size-9 items-center justify-center rounded-full text-[11px] font-bold', amount > 0 ? 'bg-motriks-soft text-motriks-deep' : 'bg-slate-100 text-slate-500 dark:bg-white/5')}>{initials(h.name)}</span>

                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-ink">{h.name}</p>
                                                <p className="truncate text-[11px] text-slate-400">
                                                    {h.sites.length ? h.sites.join(', ') : 'Sans point de vente'}
                                                    {' · '}sem. dernière {fmt(h.last_actual)} {cur}
                                                    {h.last_target ? ` / ${fmt(h.last_target)}` : ''}
                                                </p>
                                                {data.week === 'current' && amount > 0 && (
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                                            <div className={cn('h-full rounded-full', reached ? 'bg-motriks' : 'bg-motriks/70')} style={{ width: `${Math.max(pct, 2)}%` }} />
                                                        </div>
                                                        <span className={cn('shrink-0 text-[10px] font-semibold tabular-nums', reached ? 'text-motriks-deep' : 'text-slate-500')}>
                                                            {fmt(h.actual)} vendus
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative col-span-2 sm:col-span-1">
                                                <input
                                                    value={value ? fmt(amount) : ''}
                                                    onChange={(e) => set(h.user_id, e.target.value)}
                                                    inputMode="numeric"
                                                    placeholder={h.last_target ? fmt(h.last_target) : 'Aucun objectif'}
                                                    aria-label={`Objectif de ${h.name}`}
                                                    className={cn(
                                                        'h-10 w-full rounded-xl border bg-white pr-14 pl-3.5 text-right text-sm font-semibold text-ink tabular-nums outline-none transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-slate-300 focus:border-motriks focus:ring-4 focus:ring-motriks/10 dark:bg-transparent',
                                                        amount > 0 ? 'border-motriks/30' : 'border-slate-200 dark:border-sidebar-border',
                                                    )}
                                                />
                                                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[11px] font-medium text-slate-400">{cur}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>

                <footer className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-sidebar-border dark:bg-card">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                        <CalendarRange className="size-3.5 shrink-0 text-slate-400" />
                        {rows.length ? (
                            <span>
                                <span className="font-semibold text-ink tabular-nums">{filled}</span> objectif{filled > 1 ? 's' : ''} sur {rows.length} hôtesse{rows.length > 1 ? 's' : ''}
                                {total > 0 && (
                                    <>
                                        {' · '}total <span className="font-semibold text-ink tabular-nums">{fmt(total)} {cur}</span>
                                    </>
                                )}
                            </span>
                        ) : (
                            'Laissez vide pour ne pas fixer d’objectif.'
                        )}
                    </p>
                    <div className="flex justify-end gap-3">
                        <ActionButton variant="secondary" onClick={close} disabled={saving}>
                            {dirty ? 'Annuler' : 'Fermer'}
                        </ActionButton>
                        <ActionButton icon={<Target />} loading={saving} disabled={!data || !rows.length || !dirty} onClick={save}>
                            Enregistrer
                        </ActionButton>
                    </div>
                </footer>
            </div>
        </Modal>
    );
}
