import { ArrowRight, Pencil, Target, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { WeeklyTargetsModal } from '@/components/weekly-targets-modal';

export type WeeklyTargetsSummary = { week_start: string; hostesses: number; with_target: number };

const dismissKey = (week: string) => `motriks:weekly-targets-dismissed:${week}`;

function isDismissed(week: string): boolean {
    try {
        return window.localStorage.getItem(dismissKey(week)) === '1';
    } catch {
        return false;
    }
}

/**
 * Invitation hebdomadaire à fixer les objectifs des hôtesses, sans obligation :
 * « Pas cette semaine » la masque jusqu'au lundi suivant. Une fois des objectifs fixés,
 * elle devient un rappel compact qui permet de les modifier.
 */
export function WeeklyTargetsPrompt({ summary }: { summary: WeeklyTargetsSummary | null | undefined }) {
    const [open, setOpen] = useState(false);
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        if (summary) setDismissed(isDismissed(summary.week_start));
    }, [summary]);

    if (!summary || summary.hostesses === 0) return null;

    const none = summary.with_target === 0;
    const modal = open && <WeeklyTargetsModal onClose={() => setOpen(false)} />;

    const dismiss = () => {
        try {
            window.localStorage.setItem(dismissKey(summary.week_start), '1');
        } catch {
            // Stockage indisponible (navigation privée) : masqué pour cette visite seulement
        }
        setDismissed(true);
    };

    if (none && dismissed) return modal || null;

    if (none) {
        return (
            <>
                <section className="relative overflow-hidden rounded-2xl border border-motriks/15 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6 dark:bg-card">
                    <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 size-56 rounded-full bg-motriks-soft blur-3xl" />
                    <button type="button" onClick={dismiss} aria-label="Masquer jusqu’à la semaine prochaine" className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5">
                        <X className="size-4" />
                    </button>
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-motriks text-white shadow-md shadow-green-900/15">
                            <Target className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1 pr-6">
                            <p className="text-[11px] font-semibold tracking-wider text-motriks-deep uppercase">Nouvelle semaine</p>
                            <h2 className="mt-0.5 text-[15px] font-semibold text-ink">Fixer un objectif à vos {summary.hostesses > 1 ? `${summary.hostesses} hôtesses` : 'hôtesse'} ?</h2>
                            <p className="mt-0.5 text-sm text-slate-500">Facultatif. Fixé une fois, il reste en place chaque semaine jusqu’à ce que vous le changiez, et s’affiche sur leur accueil avec leur progression.</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <ActionButton variant="ghost" onClick={dismiss}>
                                Pas cette semaine
                            </ActionButton>
                            <ActionButton icon={<ArrowRight />} onClick={() => setOpen(true)}>
                                Fixer les objectifs
                            </ActionButton>
                        </div>
                    </div>
                </section>
                {modal}
            </>
        );
    }

    return (
        <>
            <section className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-motriks-soft text-motriks-deep">
                    <Target className="size-4" />
                </span>
                <p className="min-w-0 flex-1 text-sm leading-snug text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-ink">Objectifs de la semaine</span>
                    {' · '}
                    <span className="tabular-nums">
                        {summary.with_target} hôtesse{summary.with_target > 1 ? 's' : ''} sur {summary.hostesses}
                    </span>
                    <span className="hidden text-slate-400 sm:inline"> · reconduits chaque semaine</span>
                </p>
                <ActionButton variant="secondary" size="sm" icon={<Pencil />} onClick={() => setOpen(true)}>
                    Modifier
                </ActionButton>
            </section>
            {modal}
        </>
    );
}
