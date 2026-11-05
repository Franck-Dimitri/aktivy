import { Flame, PartyPopper, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WeekTarget = { target: number; actual: number; day: number; days_left: number; week_end: string };

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const fmt = (n: number) => nf.format(Math.round(n));

/**
 * Objectif de la semaine fixé par le responsable : jauge, jours de la semaine
 * et montant à réaliser par jour restant pour l'atteindre.
 */
export function WeekTargetCard({ target }: { target: WeekTarget }) {
    const pct = Math.min(100, (target.actual / target.target) * 100);
    const reached = target.actual >= target.target;
    const remaining = Math.max(0, target.target - target.actual);
    // Jours restants en comptant aujourd'hui
    const daysToGo = target.days_left + 1;
    const perDay = remaining / daysToGo;
    // À ce stade de la semaine, la part attendue de l'objectif
    const expectedPct = (target.day / 7) * 100;
    const ahead = pct >= expectedPct;

    return (
        <section className="relative overflow-hidden rounded-2xl bg-[#04281a] p-5 text-white shadow-lg shadow-green-950/15">
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-motriks/40 blur-3xl" />

            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-green-300 uppercase">
                        <Target className="size-3.5" />
                        Objectif de la semaine
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
                        {fmt(target.actual)}
                        <span className="text-base font-medium text-green-200/60"> / {fmt(target.target)} FCFA</span>
                    </p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums', reached ? 'bg-green-400 text-[#04281a]' : 'bg-white/10 text-green-100')}>
                    {Math.round(pct)} %
                </span>
            </div>

            <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-300 transition-[width] duration-700" style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>

            {/* Lundi → dimanche */}
            <div className="relative mt-3 grid grid-cols-7 gap-1" aria-hidden>
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <span
                        key={i}
                        className={cn(
                            'flex h-6 items-center justify-center rounded-md text-[10px] font-semibold',
                            i + 1 < target.day ? 'bg-white/10 text-green-100/70' : i + 1 === target.day ? 'bg-green-400 text-[#04281a]' : 'text-green-100/40 ring-1 ring-white/10 ring-inset',
                        )}
                    >
                        {d}
                    </span>
                ))}
            </div>

            <p className="relative mt-4 flex items-start gap-2 text-sm leading-relaxed text-green-50/90">
                {reached ? (
                    <>
                        <PartyPopper className="mt-0.5 size-4 shrink-0 text-green-300" />
                        Objectif atteint, bravo ! Chaque vente en plus compte pour l’équipe.
                    </>
                ) : (
                    <>
                        <Flame className={cn('mt-0.5 size-4 shrink-0', ahead ? 'text-green-300' : 'text-amber-300')} />
                        <span>
                            Encore <strong className="font-semibold text-white tabular-nums">{fmt(remaining)} FCFA</strong>
                            {daysToGo > 1 ? (
                                <>
                                    {' '}
                                    en {daysToGo} jours, soit environ <strong className="font-semibold text-white tabular-nums">{fmt(perDay)} FCFA</strong> par jour.
                                </>
                            ) : (
                                ' aujourd’hui, dernier jour de la semaine.'
                            )}
                            {ahead && daysToGo > 1 && ' Vous êtes en avance.'}
                        </span>
                    </>
                )}
            </p>
        </section>
    );
}
