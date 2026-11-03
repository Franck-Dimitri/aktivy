import { Head, Link, usePage } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { buttonClass } from '@/components/page/buttons';
import { Page, Panel } from '@/components/page/page';
import { subscription as companySubscription } from '@/routes/company';

/** Page affichée à la place d'une fonction dont le module payant n'est pas actif. */
export default function ModuleLocked({ module }: { module: { label: string; description: string } }) {
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
                        <h2 className="text-lg font-semibold text-ink">Ce module n’est pas actif pour votre entreprise</h2>
                        <p className="max-w-md text-sm text-slate-600">{module.description}</p>
                        <p className="max-w-md text-sm text-slate-500">
                            {isManager
                                ? 'Vos données sont conservées. Réactivez-le pour y accéder de nouveau.'
                                : 'Vos données sont conservées. Parlez-en à votre gérant.'}
                        </p>
                        {isManager && (
                            <Link href={companySubscription().url} className={buttonClass('primary', 'md', 'mt-2')}>
                                Voir mon abonnement
                            </Link>
                        )}
                    </div>
                </Panel>
            </Page>
        </>
    );
}
