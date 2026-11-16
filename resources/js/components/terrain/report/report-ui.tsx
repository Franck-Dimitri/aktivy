import { TriangleAlert } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ─── Notice ─── */

export function Notice({
    tone,
    icon: Icon,
    children,
}: {
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
        <div
            className={cn(
                'flex items-start gap-3 rounded-2xl border p-4 text-sm',
                styles[tone],
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p>{children}</p>
        </div>
    );
}

/* ─── Progression : 3 fines barres ─── */

export function Steps({ current }: { current: 1 | 2 | 3 }) {
    const labels = ['Saisie', 'Révision', 'Envoyé'];
    return (
        <ol
            className="grid grid-cols-3 gap-2"
            aria-label="Progression du rapport"
        >
            {labels.map((label, i) => {
                const n = i + 1;
                return (
                    <li
                        key={label}
                        aria-current={n === current ? 'step' : undefined}
                    >
                        <div
                            className={cn(
                                'h-1 rounded-full transition-colors duration-500',
                                n <= current ? 'bg-motriks' : 'bg-slate-200',
                            )}
                        />
                        <p
                            className={cn(
                                'mt-2 text-xs font-medium transition-colors',
                                n === current
                                    ? 'text-motriks-deep'
                                    : n < current
                                      ? 'text-slate-600'
                                      : 'text-slate-500',
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

export function StockBar({ used, total }: { used: number; total: number }) {
    const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    const remaining = total - used;
    const tone =
        remaining === 0
            ? 'bg-red-400'
            : remaining <= total * 0.2
              ? 'bg-amber-400'
              : 'bg-motriks';

    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
                className={cn(
                    'h-full rounded-full transition-[width] duration-300',
                    tone,
                )}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}
