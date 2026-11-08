import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, Lock, ShieldCheck } from 'lucide-react';
import { buttonClass } from '@/components/page/buttons';
import { Page } from '@/components/page/page';
import { contact } from '@/routes';
import { subscription as companySubscription } from '@/routes/company';
import { number } from '@/pages/reports/format';

type Props = {
    module: { label: string; description: string };
    plan?: { current: string; needed: string; price: number; highlights?: string[] };
};

/**
 * Page affichée à la place d'une fonction que le forfait ne comprend pas (lien verrouillé du menu) :
 * ce qu'elle apporte, le forfait qui la débloque et comment y passer.
 */
export default function ModuleLocked({ module, plan }: Props) {
    const { auth } = usePage().props;
    const isManager = auth.user.role === 'company_admin';
    const highlights = (plan?.highlights ?? []).slice(0, 5);

    return (
        <>
            <Head title={module.label} />

            <Page title={module.label}>
                <div className="mx-auto w-full max-w-3xl">
                    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                        {/* Ce que fait la fonction */}
                        <div className="relative bg-gradient-to-b from-green-50/80 to-white px-6 pt-10 pb-8 text-center sm:px-12">
                            <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-motriks-deep shadow-sm ring-1 ring-green-600/15">
                                <Lock className="size-6" />
                            </span>
                            {plan && (
                                <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-motriks-soft px-3 py-1 text-xs font-semibold text-motriks-deep ring-1 ring-green-600/15">
                                    Disponible avec {plan.needed}
                                </p>
                            )}
                            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-700">{module.description}</p>
                        </div>

                        {/* Le forfait qui la débloque */}
                        {plan && (
                            <div className="border-t border-slate-100 px-6 py-7 sm:px-12">
                                <div className="flex flex-wrap items-baseline justify-between gap-3">
                                    <p className="text-sm font-semibold text-ink">Avec {plan.needed}, vous avez aussi :</p>
                                    {plan.price > 0 && (
                                        <p className="text-sm text-slate-500">
                                            <span className="text-lg font-semibold text-ink tabular-nums">{number.format(plan.price)}</span> FCFA /
                                            mois
                                        </p>
                                    )}
                                </div>
                                {highlights.length > 0 && (
                                    <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                                        {highlights.map((h) => (
                                            <li key={h} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-motriks text-white">
                                                    <Check className="size-2.5" strokeWidth={3.5} />
                                                </span>
                                                {h}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Comment y passer */}
                        <div className="flex flex-col items-center gap-4 border-t border-slate-100 bg-slate-50/60 px-6 py-6 text-center sm:px-12">
                            {isManager ? (
                                <div className="flex flex-wrap justify-center gap-2.5">
                                    <Link href={companySubscription().url} className={buttonClass('primary')}>
                                        Voir les forfaits
                                        <ArrowRight />
                                    </Link>
                                    <Link href={contact().url} className={buttonClass('secondary')}>
                                        Nous contacter
                                    </Link>
                                </div>
                            ) : (
                                <p className="text-sm font-medium text-slate-700">
                                    Parlez-en à votre gérant : c’est lui qui choisit le forfait de l’entreprise.
                                </p>
                            )}
                            <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                <ShieldCheck className="size-3.5 text-motriks-deep" />
                                {plan ? `Votre entreprise est en ${plan.current}. ` : ''}Vos données sont conservées.
                            </p>
                        </div>
                    </section>
                </div>
            </Page>
        </>
    );
}
