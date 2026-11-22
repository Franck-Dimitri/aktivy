import { FEATURES } from '@/components/landing/content';
import { Icon } from '@/components/landing/primitives';

/* ------------------------------------------------------------------ */
/*  Grille des fonctionnalités : cases séparées par des filets fins      */
/* ------------------------------------------------------------------ */

export function FeatureGrid() {
    return (
        <div
            data-reveal
            className="mt-14 overflow-hidden rounded-2xl border border-slate-200"
        >
            <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map((f) => (
                    <div
                        key={f.title}
                        className="bg-white p-7 transition-colors duration-200 hover:bg-slate-50/70 sm:p-8"
                    >
                        <Icon
                            name={f.icon}
                            className="h-5 w-5 text-green-600"
                        />
                        <h3 className="mt-5 text-base font-semibold tracking-tight text-slate-900 sm:mt-8">
                            {f.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                            {f.text}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
