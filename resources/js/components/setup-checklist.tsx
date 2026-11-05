import { Link } from '@inertiajs/react';
import { CheckCircle2, Circle, Rocket, X } from 'lucide-react';
import { useState } from 'react';
import { index as activityIndex } from '@/routes/activity';
import { index as affectationsIndex } from '@/routes/affectations';
import { index as importIndex } from '@/routes/company/import';
import { edit as settingsEdit } from '@/routes/company/settings';
import { index as personnelIndex } from '@/routes/personnel';
import { index as productsIndex } from '@/routes/products';
import { index as sitesIndex } from '@/routes/sites';

export type SetupState = {
    identity: boolean;
    sites: boolean;
    products: boolean;
    staff: boolean;
    affectations: boolean;
    inventory: boolean;
    report: boolean;
};

const HIDDEN_KEY = 'motriks:assistant-masque';

const steps: { key: keyof SetupState; title: string; text: string; href: string }[] = [
    { key: 'identity', title: 'Votre identité', text: 'Logo et couleur, repris sur vos rapports.', href: settingsEdit().url },
    { key: 'sites', title: 'Vos points de vente', text: 'Créez-les ou importez votre liste Excel.', href: sitesIndex().url },
    { key: 'products', title: 'Vos produits et prix', text: 'Le catalogue que vos hôtesses vendent.', href: productsIndex().url },
    { key: 'staff', title: 'Vos hôtesses', text: 'Leurs comptes, avec téléphone pour se connecter.', href: personnelIndex().url },
    { key: 'affectations', title: 'Les affectations', text: 'Qui travaille sur quel point de vente, et quand.', href: affectationsIndex().url },
    { key: 'inventory', title: 'Le stock des sites', text: 'Sur la fiche de chaque site, onglet Inventaire.', href: sitesIndex().url },
    { key: 'report', title: 'Un premier rapport', text: 'Une hôtesse prend son service et envoie son rapport.', href: activityIndex().url },
];

/** Assistant de démarrage du gérant : les étapes de mise en route, cochées au fur et à mesure. */
export function SetupChecklist({ setup }: { setup: SetupState }) {
    const [hidden, setHidden] = useState(() => {
        try {
            return window.localStorage.getItem(HIDDEN_KEY) === '1';
        } catch {
            return false;
        }
    });

    const done = steps.filter((s) => setup[s.key]).length;

    if (hidden || done === steps.length) return null;

    const hide = () => {
        setHidden(true);
        try {
            window.localStorage.setItem(HIDDEN_KEY, '1');
        } catch {
            // préférence non gardée : l'assistant reviendra au prochain chargement
        }
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-green-200 bg-white">
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-motriks-soft text-motriks-deep">
                        <Rocket className="size-4" />
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold text-ink">Bien démarrer</h2>
                        <p className="text-sm text-slate-500">
                            {done} étape{done > 1 ? 's' : ''} sur {steps.length}.{' '}
                            <Link href={importIndex().url} className="font-semibold text-motriks-deep hover:underline">
                                Gagnez du temps en important vos fichiers Excel
                            </Link>
                            .
                        </p>
                    </div>
                </div>
                <button type="button" onClick={hide} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Masquer l’assistant">
                    <X className="size-4" />
                </button>
            </header>
            <div className="h-1 bg-slate-100">
                <div className="h-full bg-motriks" style={{ width: `${(done / steps.length) * 100}%` }} />
            </div>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((s) => (
                    <li key={s.key} className="border-b border-slate-100 sm:border-r">
                        <Link href={s.href} className="flex h-full gap-3 px-5 py-4 hover:bg-green-50/40">
                            {setup[s.key] ? (
                                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-motriks" aria-label="Fait" />
                            ) : (
                                <Circle className="mt-0.5 size-5 shrink-0 text-slate-300" aria-label="À faire" />
                            )}
                            <span>
                                <span className={setup[s.key] ? 'text-sm font-semibold text-slate-400 line-through' : 'text-sm font-semibold text-ink'}>{s.title}</span>
                                <span className="block text-xs text-slate-500">{s.text}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ol>
        </section>
    );
}
