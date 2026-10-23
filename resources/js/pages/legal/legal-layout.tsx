import { useEffect, useState, type ReactNode } from 'react';
import { Head, Link } from '@inertiajs/react';
import LandingFooter from '@/components/landing/footer';

/* ------------------------------------------------------------------ */
/*  Informations légales : à compléter UNE seule fois ici               */
/*  (elles sont reprises dans les Conditions et la Confidentialité)     */
/* ------------------------------------------------------------------ */

export const LEGAL_INFO = {
    product: 'Motriks',
    company: '[Raison sociale de la société éditrice]',
    legalForm: '[Forme juridique, ex. SARL]',
    rccm: '[Numéro RCCM]',
    niu: '[Numéro d\'identifiant unique (NIU)]',
    address: '[Adresse du siège, ville, Cameroun]',
    email: 'contact@motriks.com',
    privacyEmail: 'contact@motriks.com',
    website: 'motriks.com',
    hosting: '[Nom de l\'hébergeur et pays des serveurs]',
    paymentProvider: '[Prestataire de paiement, ex. agrégateur Mobile Money]',
    aiProvider: '[Fournisseur du modèle d\'IA utilisé]',
    city: '[Ville du tribunal compétent, ex. Yaoundé]',
    updatedAt: '14 octobre 2026',
    homeUrl: '/',
};

export type LegalSection = { id: string; title: string; body: ReactNode };

/* Petits éléments de mise en forme du texte juridique */
export function P({ children }: { children: ReactNode }) {
    return <p className="mt-4 leading-relaxed text-slate-600">{children}</p>;
}

export function List({ items }: { items: ReactNode[] }) {
    return (
        <ul className="mt-4 space-y-2.5">
            {items.map((it, i) => (
                <li key={i} className="flex gap-3 leading-relaxed text-slate-600">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
                    <span>{it}</span>
                </li>
            ))}
        </ul>
    );
}

export function Strong({ children }: { children: ReactNode }) {
    return <strong className="font-semibold text-slate-900">{children}</strong>;
}

type PaymentLogo = { name: string; url: string };

export default function LegalLayout({
    title,
    metaDescription,
    intro,
    sections,
    otherLink,
    paymentLogos,
}: {
    title: string;
    metaDescription: string;
    intro: ReactNode;
    sections: LegalSection[];
    otherLink: { href: string; label: string };
    paymentLogos?: PaymentLogo[];
}) {
    const [current, setCurrent] = useState(sections[0]?.id ?? '');

    // met en évidence, dans le sommaire, la partie en cours de lecture
    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        setCurrent(e.target.id);
                    }
                });
            },
            { rootMargin: '-20% 0px -70% 0px' },
        );
        sections.forEach((s) => {
            const el = document.getElementById(s.id);
            if (el) {
                io.observe(el);
            }
        });
        return () => io.disconnect();
    }, [sections]);

    return (
        <>
            <Head title={`${title} - ${LEGAL_INFO.product}`}>
                <meta name="description" content={metaDescription} />
                <meta name="robots" content="index,follow" />
            </Head>

            <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
                {/* en-tête */}
                <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
                        <Link href={LEGAL_INFO.homeUrl} className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-lg font-extrabold text-white">M</span>
                            <span className="text-xl font-extrabold tracking-tight text-slate-900">{LEGAL_INFO.product}</span>
                        </Link>
                        <Link
                            href={LEGAL_INFO.homeUrl}
                            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M19 12H5m6-6l-6 6 6 6" />
                            </svg>
                            Retour à l'accueil
                        </Link>
                    </div>
                </header>

                {/* titre */}
                <div className="border-b border-slate-100 bg-gradient-to-b from-green-50/70 to-white">
                    <div className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-16">
                        <p className="text-sm font-semibold uppercase tracking-wider text-green-600">Informations légales</p>
                        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
                        <p className="mt-4 text-sm text-slate-500">Dernière mise à jour : {LEGAL_INFO.updatedAt}</p>
                        <div className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">{intro}</div>
                    </div>
                </div>

                <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                    {/* sommaire */}
                    <aside className="hidden lg:block">
                        <nav className="sticky top-24">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sommaire</p>
                            <ol className="mt-4 space-y-1 border-l border-slate-200">
                                {sections.map((s, i) => (
                                    <li key={s.id}>
                                        <a
                                            href={`#${s.id}`}
                                            className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm transition ${
                                                current === s.id
                                                    ? 'border-green-600 font-medium text-green-700'
                                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                                            }`}
                                        >
                                            {i + 1}. {s.title}
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </aside>

                    {/* contenu */}
                    <main className="min-w-0 max-w-3xl">
                        {sections.map((s, i) => (
                            <section key={s.id} id={s.id} className="mt-10 scroll-mt-24 border-b border-slate-100 pb-10 first:mt-0 last:border-b-0">
                                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                    <span className="mr-2 text-green-600">{i + 1}.</span>
                                    {s.title}
                                </h2>
                                {s.body}
                            </section>
                        ))}

                        <div className="mt-12 rounded-2xl border border-green-200 bg-green-50 p-6">
                            <p className="font-semibold text-slate-900">Une question ?</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                                Écrivez-nous à{' '}
                                <a href={`mailto:${LEGAL_INFO.email}`} className="font-medium text-green-700 underline-offset-2 hover:underline">
                                    {LEGAL_INFO.email}
                                </a>
                                . Consultez aussi notre{' '}
                                <Link href={otherLink.href} className="font-medium text-green-700 underline-offset-2 hover:underline">
                                    {otherLink.label}
                                </Link>
                                .
                            </p>
                        </div>
                    </main>
                </div>

                <LandingFooter paymentLogos={paymentLogos} />
            </div>
        </>
    );
}
