import { Head, Link, usePage } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { buttonClass } from '@/components/page/buttons';
import { Page, Panel } from '@/components/page/page';
import { subscription as companySubscription } from '@/routes/company';
import { number } from '@/pages/reports/format';

type Props = {
    module: { label: string; description: string };
    plan?: { current: string; needed: string; price: number };
};

const fcfa = number;

/** Page affichée à la place d'une fonction que le forfait de l'entreprise ne comprend pas. */
export default function ModuleLocked({ module, plan }: Props) {
    const { auth } = usePage().props;
    const isManager = auth.user.role === 'company_admin';

    return (
        <>
            <Head title={module.label} />

            <Page title={module.label}>
                <Panel>
                    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <Lock className="size-5" />
                        </span>
                        <h2 className="text-lg font-semibold text-ink">
                            {plan
                                ? `Disponible à partir de ${plan.needed}`
                                : 'Non compris dans votre forfait'}
                        </h2>
                        <p className="max-w-md text-sm text-slate-600">
                            {module.description}
                        </p>
                        <p className="max-w-md text-sm text-slate-500">
                            {plan &&
                                `Votre entreprise est en ${plan.current}. `}
                            {isManager
                                ? `Vos données sont conservées.${plan && plan.price > 0 ? ` ${plan.needed} : ${fcfa.format(plan.price)} FCFA par mois.` : ''}`
                                : 'Vos données sont conservées. Parlez-en à votre gérant.'}
                        </p>
                        {isManager && (
                            <Link
                                href={companySubscription().url}
                                className={buttonClass('primary', 'md', 'mt-2')}
                            >
                                Voir les forfaits
                            </Link>
                        )}
                    </div>
                </Panel>
            </Page>
        </>
    );
}
