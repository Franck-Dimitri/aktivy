import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import LandingFooter from '@/components/landing/footer';

/* ------------------------------------------------------------------ */
/*  Contenu modifiable                                                 */
/* ------------------------------------------------------------------ */

/* À remplacer par vos vraies coordonnées */
const CONTACT = {
    email: 'contact@aktivy.com',
    whatsappLabel: '+237 000 000 000',
    whatsappUrl: 'https://wa.me/237000000000',
    hours: 'Lundi - Samedi, 8h - 18h',
};

/* Les libellés sont envoyés tels quels au serveur : ne pas les modifier sans adapter la validation */
const SUBJECTS = [
    { label: 'Demande de démo' },
    { label: 'Devenir entreprise pilote' },
    { label: 'Tarifs et modules' },
    { label: 'Support technique' },
    { label: 'Autre' },
];

const NAV_LINKS = [
    { label: 'Accueil', href: '/' },
    { label: 'Fonctionnalités', href: '/#fonctionnalites' },
    { label: 'Intelligence artificielle', href: '/#ia' },
    { label: 'Tarifs', href: '/#tarifs' },
    { label: 'FAQ', href: '/#faq' },
];

const NEXT_STEPS = [
    { title: 'Nous vous répondons', text: 'Sous 24 h, par e-mail ou WhatsApp selon votre préférence.' },
    { title: 'Nous échangeons', text: 'Un court appel pour comprendre vos équipes, vos sites et vos besoins.' },
    { title: 'Vous démarrez', text: 'Espace configuré avec vous, équipes formées, premières saisies le jour même.' },
];

/* ------------------------------------------------------------------ */
/*  Petits composants                                                  */
/* ------------------------------------------------------------------ */

const ICONS = {
    mail: 'M3 7l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
    chat: 'M21 12a8 8 0 01-11.5 7.2L4 20l1-4.5A8 8 0 1121 12z',
    clock: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    check: 'M5 13l4 4L19 7',
    arrow: 'M5 12h14m-6-6l6 6-6 6',
    up: 'M12 19V5m-6 6l6-6 6 6',
};

type IconName = keyof typeof ICONS;

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d={ICONS[name]} />
        </svg>
    );
}

function Logo({ light = false }: { light?: boolean }) {
    return (
        <Link href="/" className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-extrabold ${light ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                A
            </span>
            <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>Motriks</span>
        </Link>
    );
}

const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700';

const inputClass = (error?: string) =>
    `w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:bg-white focus:ring-4 ${
        error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 hover:border-slate-300 focus:border-green-500 focus:ring-green-100'
    }`;

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }
    return <p className="mt-1.5 text-xs font-medium text-red-500">{message}</p>;
}

const PAGE_CSS = `
@keyframes ct-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.ct-up{animation:ct-up .8s cubic-bezier(.22,1,.36,1) both}
@keyframes ct-pop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
.ct-pop{animation:ct-pop .6s cubic-bezier(.34,1.56,.64,1) both}
@keyframes ct-draw{to{stroke-dashoffset:0}}
.ct-draw{stroke-dasharray:24;stroke-dashoffset:24;animation:ct-draw .5s .35s ease-out forwards}
@media (prefers-reduced-motion:reduce){.ct-up,.ct-pop{animation:none}.ct-draw{animation:none;stroke-dashoffset:0}}
`;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type PaymentLogo = { name: string; url: string };

export default function Contact({ formToken = '', paymentLogos }: { formToken?: string; paymentLogos?: PaymentLogo[] }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [sent, setSent] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: SUBJECTS[0].label,
        message: '',
        // anti-spam : champ piège (doit rester vide) et heure d'ouverture chiffrée par le serveur
        website: '',
        form_token: formToken,
    });

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // lien du type /contact?sujet=pilote : le sujet est présélectionné
    useEffect(() => {
        const wanted = new URLSearchParams(window.location.search).get('sujet')?.toLowerCase();
        if (!wanted) {
            return;
        }
        const match = SUBJECTS.find((s) => s.label.toLowerCase().includes(wanted));
        if (match) {
            setData('subject', match.label);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/contact', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setSent(true);
            },
        });
    };


    const channels = [
        { icon: 'chat' as const, title: 'WhatsApp', text: CONTACT.whatsappLabel, href: CONTACT.whatsappUrl, badge: 'Le plus rapide' },
        { icon: 'mail' as const, title: 'E-mail', text: CONTACT.email, href: `mailto:${CONTACT.email}` },
        { icon: 'clock' as const, title: 'Horaires', text: CONTACT.hours },
    ];

    return (
        <>
            <Head title="Nous contacter - Motriks">
                <meta name="description" content="Une question, une démo, un projet ? Contactez l'équipe Motriks, nous vous répondons sous 24 heures." />
            </Head>

            <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
                <style>{PAGE_CSS}</style>

                {/* ------------------------------ Navbar flottante ------------------------------ */}
                <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
                    <div
                        className={`relative mx-auto flex items-center justify-between max-w-6xl rounded-full border px-2.5 backdrop-blur-xl transition-[background-color,box-shadow,border-color,padding] duration-300 ${
                            scrolled ? 'border-slate-200/80 bg-white/90 py-1.5 shadow-xl shadow-slate-900/[0.08]' : 'border-white/70 bg-white/60 py-2 shadow-lg shadow-green-900/5'
                        }`}
                    >
                        <div className="pl-2">
                            <Logo />
                        </div>

                        <nav className="hidden items-center gap-0.5 xl:flex">
                            {NAV_LINKS.map((l) => (
                                <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                                    {l.label}
                                </Link>
                            ))}
                            <span className="rounded-full bg-green-50 px-3.5 py-2 text-sm font-medium text-green-700">Contact</span>
                        </nav>

                        <div className="hidden items-center gap-1 xl:flex">
                            <Link href="/login" className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                                Connexion
                            </Link>
                            <Link
                                href="/register"
                                className="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-600/30 transition hover:bg-green-700"
                            >
                                Essai gratuit
                                <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="rounded-full bg-slate-100 p-2.5 text-slate-700 transition hover:bg-slate-200 xl:hidden"
                            aria-label="Ouvrir le menu"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                            </svg>
                        </button>

                        {menuOpen && (
                            <div className="absolute inset-x-0 top-full mt-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl xl:hidden">
                                <nav className="flex flex-col">
                                    {NAV_LINKS.map((l) => (
                                        <Link key={l.href} href={l.href} className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-700">
                                            {l.label}
                                        </Link>
                                    ))}
                                    <span className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">Contact</span>
                                </nav>
                                <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                                    <Link href="/login" className="rounded-full border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700">
                                        Connexion
                                    </Link>
                                    <Link href="/register" className="rounded-full bg-green-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-green-600/30">
                                        Essai gratuit
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* ---------------------------------- En-tête ---------------------------------- */}
                <section className="relative overflow-hidden">
                    {/* décor : grille fine et halos verts */}
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_40%,transparent_100%)]"
                        aria-hidden="true"
                    />
                    <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[56rem] max-w-full -translate-x-1/2 rounded-full bg-green-300/30 blur-3xl" aria-hidden="true" />

                    <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-32 text-center sm:px-6 sm:pt-40">
                        <h1 className="ct-up text-4xl font-extrabold tracking-tight text-slate-950 [animation-delay:80ms] sm:text-6xl">
                            Parlons de{' '}
                            <span className="relative whitespace-nowrap text-green-600">
                                votre projet
                                <svg className="absolute -bottom-2 left-0 h-3 w-full text-green-300" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
                                    <path d="M2 9C50 3 150 3 198 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                </svg>
                            </span>
                        </h1>
                        <p className="ct-up mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 [animation-delay:160ms]">
                            Une démo, une question sur les tarifs, l'envie de rejoindre le programme pilote ? Écrivez-nous, une vraie personne vous répond.
                        </p>
                    </div>
                </section>

                {/* ---------------------------- Panneau contact + formulaire ---------------------------- */}
                <section className="relative pb-24">
                    <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-8">
                        {/* panneau clair : canaux et étapes */}
                        <aside className="ct-up rounded-[2rem] border border-slate-200/80 bg-slate-50/70 p-7 [animation-delay:220ms] sm:p-9">
                            <p className="text-sm font-semibold uppercase tracking-wider text-green-600">Nous joindre</p>
                            <h2 className="mt-2 text-2xl font-bold text-slate-900">Choisissez votre canal</h2>

                            <div className="mt-7 space-y-3">
                                {channels.map((c) => {
                                    const inner = (
                                        <>
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 transition group-hover:bg-green-600 group-hover:text-white">
                                                <Icon name={c.icon} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                                    {c.title}
                                                    {c.badge && (
                                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                                                            {c.badge}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="mt-0.5 block truncate text-sm text-slate-500">{c.text}</span>
                                            </span>
                                            {c.href && (
                                                <Icon name="arrow" className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-green-600" />
                                            )}
                                        </>
                                    );
                                    const base = 'group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3.5 transition';
                                    return c.href ? (
                                        <a key={c.title} href={c.href} className={`${base} hover:-translate-y-0.5 hover:border-green-300 hover:shadow-lg hover:shadow-slate-900/5`}>
                                            {inner}
                                        </a>
                                    ) : (
                                        <div key={c.title} className={base}>
                                            {inner}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* et ensuite ? */}
                            <div className="mt-9 border-t border-slate-200 pt-8">
                                <p className="text-sm font-semibold text-slate-900">Et ensuite ?</p>
                                <ol className="relative mt-5 space-y-6">
                                    <span className="absolute bottom-4 left-[15px] top-4 w-px bg-slate-200" aria-hidden="true" />
                                    {NEXT_STEPS.map((s, i) => (
                                        <li key={s.title} className="relative flex gap-4">
                                            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white ring-4 ring-slate-50">
                                                {i + 1}
                                            </span>
                                            <div className="pt-1">
                                                <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                                                <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.text}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </aside>

                        {/* formulaire (version d'origine, légèrement affinée) */}
                        <div id="formulaire" className="ct-up scroll-mt-28 [animation-delay:300ms]">
                            <div className="h-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-green-900/10 sm:p-8">
                                {sent ? (
                                    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                                        <span className="ct-pop flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                                            <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                                                <path className="ct-draw" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                        <h2 className="mt-6 text-2xl font-extrabold text-slate-900">Message envoyé</h2>
                                        <p className="mt-3 max-w-sm text-slate-600">Merci ! Nous avons bien reçu votre message et revenons vers vous très vite.</p>
                                        <button
                                            type="button"
                                            onClick={() => setSent(false)}
                                            className="mt-8 rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-green-300 hover:text-green-700"
                                        >
                                            Envoyer un autre message
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={submit} noValidate>
                                        {/* champ piège : hors écran, ignoré par les humains et les lecteurs d'écran, rempli par les robots */}
                                        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                                            <label htmlFor="website">Site web</label>
                                            <input
                                                id="website"
                                                name="website"
                                                type="text"
                                                tabIndex={-1}
                                                autoComplete="off"
                                                value={data.website}
                                                onChange={(e) => setData('website', e.target.value)}
                                            />
                                        </div>

                                        <h2 className="text-2xl font-extrabold text-slate-900">Envoyez-nous un message</h2>
                                        <p className="mt-2 text-sm text-slate-500">Les champs marqués d'une étoile sont obligatoires.</p>

                                        <fieldset className="mt-6">
                                            <legend className="text-sm font-semibold text-slate-700">Sujet</legend>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {SUBJECTS.map((s) => {
                                                    const active = data.subject === s.label;
                                                    return (
                                                        <button
                                                            key={s.label}
                                                            type="button"
                                                            onClick={() => setData('subject', s.label)}
                                                            aria-pressed={active}
                                                            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                                active
                                                                    ? 'border-green-600 bg-green-600 text-white shadow-md shadow-green-600/25'
                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:text-green-700'
                                                            }`}
                                                        >
                                                            {active && <Icon name="check" className="h-3.5 w-3.5" />}
                                                            {s.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <FieldError message={errors.subject} />
                                        </fieldset>

                                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="name" className={labelClass}>
                                                    Nom complet <span className="text-green-600">*</span>
                                                </label>
                                                <input
                                                    id="name"
                                                    type="text"
                                                    value={data.name}
                                                    onChange={(e) => setData('name', e.target.value)}
                                                    placeholder="Jean Dupont"
                                                    autoComplete="name"
                                                    className={inputClass(errors.name)}
                                                />
                                                <FieldError message={errors.name} />
                                            </div>
                                            <div>
                                                <label htmlFor="email" className={labelClass}>
                                                    E-mail professionnel <span className="text-green-600">*</span>
                                                </label>
                                                <input
                                                    id="email"
                                                    type="email"
                                                    value={data.email}
                                                    onChange={(e) => setData('email', e.target.value)}
                                                    placeholder="vous@entreprise.com"
                                                    autoComplete="email"
                                                    className={inputClass(errors.email)}
                                                />
                                                <FieldError message={errors.email} />
                                            </div>
                                            <div>
                                                <label htmlFor="phone" className={labelClass}>
                                                    Téléphone / WhatsApp
                                                </label>
                                                <input
                                                    id="phone"
                                                    type="tel"
                                                    value={data.phone}
                                                    onChange={(e) => setData('phone', e.target.value)}
                                                    placeholder="+237 6 00 00 00 00"
                                                    autoComplete="tel"
                                                    className={inputClass(errors.phone)}
                                                />
                                                <FieldError message={errors.phone} />
                                            </div>
                                            <div>
                                                <label htmlFor="company" className={labelClass}>
                                                    Entreprise
                                                </label>
                                                <input
                                                    id="company"
                                                    type="text"
                                                    value={data.company}
                                                    onChange={(e) => setData('company', e.target.value)}
                                                    placeholder="Nom de votre entreprise"
                                                    autoComplete="organization"
                                                    className={inputClass(errors.company)}
                                                />
                                                <FieldError message={errors.company} />
                                            </div>
                                        </div>

                                        <div className="mt-5">
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <label htmlFor="message" className="block text-sm font-semibold text-slate-700">
                                                    Message <span className="text-green-600">*</span>
                                                </label>
                                                <span className={`text-xs tabular-nums ${data.message.length > 3800 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    {data.message.length} / 4000
                                                </span>
                                            </div>
                                            <textarea
                                                id="message"
                                                rows={6}
                                                maxLength={4000}
                                                value={data.message}
                                                onChange={(e) => setData('message', e.target.value)}
                                                placeholder="Parlez-nous de votre équipe, de vos sites, de ce que vous souhaitez piloter..."
                                                className={`${inputClass(errors.message)} resize-none`}
                                            />
                                            <FieldError message={errors.message} />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-green-600/30 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {processing ? (
                                                <>
                                                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
                                                        <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                                    </svg>
                                                    Envoi en cours...
                                                </>
                                            ) : (
                                                <>
                                                    Envoyer le message
                                                    <Icon name="send" className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                                                </>
                                            )}
                                        </button>

                                        <p className="mt-4 text-center text-xs text-slate-400">
                                            Vos informations servent uniquement à répondre à votre demande.{' '}
                                            <Link href="/confidentialite" className="underline underline-offset-2 hover:text-green-700">
                                                En savoir plus
                                            </Link>
                                        </p>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <LandingFooter paymentLogos={paymentLogos} />
            </div>
        </>
    );
}

/* Pas de sidebar : la page s'affiche sans le layout de l'application */
Contact.layout = (page: ReactNode) => page;