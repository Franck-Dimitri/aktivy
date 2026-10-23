import { Link } from '@inertiajs/react';

const CONTACT = {
    email: 'contact@motriks.com',
    whatsapp: '237000000000',
};

const ICON_PATHS = {
    chat: 'M21 12a8 8 0 01-11.500 7.200L4 20l1-4.500A8 8 0 1121 12z',
    mail: 'M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm-1 1l9 6.500L21 7',
    lock: 'M7 11V8a5 5 0 0110 0v3m-9 0h8a1 1 0 011 1v7a1 1 0 01-1 1H8a1 1 0 01-1-1v-7a1 1 0 011-1z',
};

function Icon({ name, className = 'h-4 w-4' }: { name: keyof typeof ICON_PATHS; className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d={ICON_PATHS[name]} />
        </svg>
    );
}

function Logo({ light = false }: { light?: boolean }) {
    return (
        <Link href="/" className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-extrabold ${light ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                M
            </span>
            <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
                Motriks
            </span>
        </Link>
    );
}

const NAV_COLS = [
    {
        title: 'Produit',
        links: [
            { label: 'Fonctionnalités', href: '/#fonctionnalites' },
            { label: 'Intelligence artificielle', href: '/#ia' },
            { label: 'Tarifs', href: '/#tarifs' },
            { label: 'FAQ', href: '/#faq' },
        ],
    },
    {
        title: 'Entreprise',
        links: [
            { label: 'Nous contacter', href: '/contact' },
            { label: 'Connexion', href: '/login' },
            { label: 'Créer un compte', href: '/register' },
        ],
    },
    {
        title: 'Légal',
        links: [
            { label: "Conditions d'utilisation", href: '/conditions' },
            { label: 'Confidentialité', href: '/confidentialite' },
        ],
    },
];

export default function LandingFooter({ paymentLogos }: { paymentLogos?: { name: string; url: string }[] }) {
    return (
        <footer className="relative overflow-hidden bg-slate-950 text-slate-400">
            <div
                className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[48rem] max-w-full -translate-x-1/2 rounded-full bg-green-500/10 blur-3xl"
                aria-hidden="true"
            />

            <div className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8 lg:pt-20">
                <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-10">
                    {/* marque */}
                    <div>
                        <Logo light />
                        <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
                            La plateforme qui aide les entreprises à piloter leurs équipes terrain en temps réel, avec l'appui de l'intelligence artificielle.
                        </p>
                        <div className="mt-6 flex items-center gap-2.5">
                            <a
                                href={`https://wa.me/${CONTACT.whatsapp}`}
                                aria-label="WhatsApp"
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-green-500/50 hover:bg-green-500/10 hover:text-green-400"
                            >
                                <Icon name="chat" />
                            </a>
                            <a
                                href={`mailto:${CONTACT.email}`}
                                aria-label="E-mail"
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-green-500/50 hover:bg-green-500/10 hover:text-green-400"
                            >
                                <Icon name="mail" />
                            </a>
                            <span className="ml-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                                Conçu au Cameroun
                            </span>
                        </div>
                    </div>

                    {/* colonnes de liens */}
                    {NAV_COLS.map((col) => (
                        <div key={col.title}>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{col.title}</h4>
                            <ul className="mt-5 space-y-3 text-sm">
                                {col.links.map((l) => (
                                    <li key={l.label}>
                                        <Link
                                            href={l.href}
                                            className="group inline-flex items-center gap-1.5 text-slate-300 transition hover:text-white"
                                        >
                                            {l.label}
                                            <svg className="h-3 w-3 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M7 17L17 7M9 7h8v8" />
                                            </svg>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* paiements */}
                {paymentLogos && paymentLogos.length > 0 && (
                    <div className="mt-14 flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                                <Icon name="lock" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-white">Paiements sécurisés</p>
                                <p className="text-xs text-slate-500">Mobile Money et carte bancaire</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            {paymentLogos.map((l) => (
                                <span key={l.url} className="flex h-10 items-center rounded-xl bg-white px-3 transition hover:-translate-y-0.5">
                                    <img src={l.url} alt={l.name} className="h-6 w-auto max-w-[80px] object-contain" />
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* barre du bas */}
                <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-white/10 py-7 text-xs text-slate-500 sm:flex-row">
                    <p>© {new Date().getFullYear()} Motriks. Tous droits réservés.</p>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                        Retour en haut
                        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 19V5m-6 6l6-6 6 6" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* grand nom de marque en filigrane */}
            <div className="pointer-events-none relative -mb-[0.22em] select-none text-center" aria-hidden="true">
                <span className="block bg-gradient-to-b from-white/[0.09] to-transparent bg-clip-text text-[26vw] font-extrabold leading-none tracking-tighter text-transparent lg:text-[19rem]">
                    Motriks
                </span>
            </div>
        </footer>
    );
}
