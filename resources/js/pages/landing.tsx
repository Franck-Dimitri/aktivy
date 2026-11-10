import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import LandingFooter from '@/components/landing/footer';
import { Seo } from '@/components/seo';
import MotriksLogo from '@/components/motriks-logo';
import MotriksMark from '@/components/motriks-mark';
import { AuthMobileActions, AuthNavActions } from '@/components/landing/auth-actions';
import { CONTACT } from '@/lib/contact';

/* ------------------------------------------------------------------ */
/*  Contenu modifiable (coordonnées : resources/js/lib/contact.ts)     */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
    { label: 'Fonctionnalités', href: '#fonctionnalites' },
    { label: 'Intelligence artificielle', href: '#ia' },
    { label: 'Tarifs', href: '#tarifs' },
    { label: 'FAQ', href: '#faq' },
];

const STATS = [
    { value: '< 2 min', label: 'pour saisir l\'activité du jour' },
    { value: '0', label: 'calcul manuel à faire' },
    { value: "Jusqu'à 5 h", label: 'de reporting en moins par semaine' },
    { value: 'Hors-ligne', label: 'saisie possible sans réseau' },
];

const PROBLEMS = [
    'Reporting par messages WhatsApp, erreurs et oublis',
    'Calculs faits à la main, stocks et ventes qui ne collent pas',
    'Compilation hebdomadaire de plusieurs heures',
    'Aucune visibilité en direct, ruptures découvertes trop tard',
    'Présences suivies de façon informelle, litiges fréquents',
];

const SOLUTIONS = [
    'Saisie structurée et contrôlée sur mobile',
    'Totaux, montants et soldes calculés automatiquement',
    'Rapports consolidés et exportés en un clic',
    'Tableau de bord et alertes en temps réel',
    'Pointage, historique et justificatifs d\'absence',
];

const FEATURES = [
    { icon: 'field', title: 'Suivi terrain', text: 'Prise de service, saisie rapide avec contrôles de cohérence, clôture journalière et mode hors-ligne.' },
    { icon: 'clock', title: 'Présences et pointage', text: 'Plannings par site, échanges de poste, retards et absences enregistrés automatiquement.' },
    { icon: 'box', title: 'Stocks et réassorts', text: 'Stock d\'ouverture repris de la veille, seuils critiques, bons de commande PDF en un clic.' },
    { icon: 'file', title: 'Rapports et documents', text: 'Exports PDF et Excel aux couleurs de votre entreprise, attestations et relevés générés instantanément.' },
    { icon: 'coin', title: 'Primes et commissions', text: 'Barèmes paramétrables, calcul automatique des primes, fiche de rémunération par hôtesse.' },
    { icon: 'bell', title: 'Alertes configurables', text: 'Seuils par site, notifications prioritaires par application, e-mail, SMS ou WhatsApp.' },
    { icon: 'camera', title: 'Preuves terrain', text: 'Photos du stand horodatées et géolocalisées, liste de contrôle de présentation.' },
    { icon: 'chat', title: 'Communication', text: 'Annonces à toute l\'équipe, rappels automatiques et messagerie interne, fini les groupes WhatsApp.' },
];

const AI_FEATURES = [
    { icon: 'spark', title: 'Synthèse automatique', text: 'Le résumé de votre semaine ou de votre mois, rédigé en langage clair, prêt à lire.' },
    { icon: 'alert', title: 'Détection d\'anomalies', text: 'Ventes anormales, absences répétées, incohérences : vous êtes prévenu avant la perte.' },
    { icon: 'trend', title: 'Prévisions', text: 'Anticipez les ventes, les besoins en personnel et les risques de rupture.' },
    { icon: 'chat', title: 'Assistant conversationnel', text: 'Posez une question comme « quel site a le mieux vendu ce mois-ci ? » et obtenez la réponse chiffrée.' },
];

const STEPS = [
    { icon: 'grid', tag: 'Quelques minutes', title: 'Créez votre espace', text: 'Ajoutez votre logo, vos couleurs, vos sites et votre équipe en quelques minutes.' },
    { icon: 'file', tag: 'Sans ressaisie', title: 'Importez votre Excel', text: 'Reprenez votre personnel, vos sites et vos produits existants sans tout ressaisir.' },
    { icon: 'trend', tag: 'En temps réel', title: 'Pilotez en direct', text: 'Vos équipes saisissent depuis leur téléphone, vous suivez tout en temps réel.' },
];

const PERSONAS = [
    { title: 'Gérant de PME', text: 'Voyez la performance de votre entreprise en un coup d\'œil, sans rien compiler.' },
    { title: 'Responsable commercial', text: 'Suivez l\'avancement du jour sur tous vos sites et anticipez les ruptures.' },
    { title: 'Agence d\'hôtesses', text: 'Gérez plannings, présences et facturation par client, avec portail client en marque blanche.' },
    { title: 'Comptable', text: 'Recevez des exports fiables, prêts pour la paie et la comptabilité, sans ressaisie.' },
];

const LOCAL = [
    { icon: 'offline', title: 'Mode hors-ligne', text: 'Les saisies sont conservées et synchronisées dès le retour du réseau.' },
    { icon: 'signal', title: 'Économie de données', text: 'Interface légère, pensée pour les connexions faibles et les forfaits limités.' },
    { icon: 'wallet', title: 'Mobile Money', text: 'Payez votre abonnement par Mobile Money ou carte bancaire.' },
    { icon: 'install', title: 'Installable', text: 'Application web installable sur Android, iOS et ordinateur, sans passer par une boutique.' },
];

/* Forfaits Motriks : mêmes prix et mêmes limites que l'application (App\Enums\Plan) */
const PLANS = [
    {
        name: 'Motriks Starter',
        price: 'Gratuit',
        unit: '',
        description: 'Pour découvrir Motriks avec une hôtesse.',
        features: ['1 hôtesse et 1 point de vente', 'Suivi terrain, même sans réseau', 'Rapports journaliers et chiffres du jour', 'Historique de 30 jours'],
        cta: 'Commencer gratuitement',
        highlight: false,
    },
    {
        name: 'Motriks Pro',
        price: '14 500',
        unit: 'FCFA / mois',
        description: 'Pour la PME qui pilote son réseau de vente.',
        features: ['7 hôtesses, 7 points de vente et 2 superviseurs', 'Stocks, rappels et notifications push', 'Ventes et objectifs par hôtesse', 'PDF à vos couleurs et exports Excel', '1 événement et 3 packs par mois'],
        cta: 'Essayer 7 jours',
        highlight: false,
    },
    {
        name: 'Motriks Business',
        price: '48 000',
        unit: 'FCFA / mois',
        description: 'Pour les agences et les marques en campagne.',
        features: ['35 hôtesses, 35 points de vente et 6 superviseurs', '3 événements et 10 packs par mois', '6 photos par rapport', 'Historique illimité', 'Mise en service offerte'],
        cta: 'Essayer 7 jours',
        highlight: true,
    },
    {
        name: 'Motriks Entreprise',
        price: '88 000',
        unit: 'FCFA / mois',
        description: 'Pour les grands réseaux et les groupes.',
        features: ['120 hôtesses et 120 points de vente', 'Superviseurs illimités', 'Événements et packs illimités', 'PDF et exports illimités', 'Interlocuteur dédié'],
        cta: 'Nous contacter',
        highlight: false,
    },
];

const FAQS = [
    { q: 'Mes données sont-elles protégées ?', a: 'Oui. Chaque entreprise dispose d\'un espace totalement isolé, les flux sont chiffrés (HTTPS), les sauvegardes sont quotidiennes et un journal d\'audit trace les actions sensibles.' },
    { q: 'Mes hôtesses ont-elles besoin d\'un smartphone récent ?', a: 'Non. L\'interface est légère et fonctionne sur un téléphone d\'entrée de gamme, même avec un réseau instable grâce au mode hors-ligne.' },
    { q: 'Puis-je essayer avant de payer ?', a: 'Oui. Motriks Starter est gratuit et sans engagement, et toute nouvelle entreprise essaie Motriks Business pendant 7 jours, sans carte bancaire.' },
    { q: 'Que se passe-t-il si mon abonnement expire ?', a: 'Votre entreprise passe automatiquement en Motriks Starter, le forfait gratuit. Vos données sont conservées : vous retrouvez tout dès que vous reprenez un forfait.' },
    { q: 'Puis-je récupérer mes données ?', a: 'Oui, à tout moment. Vous pouvez exporter l\'ensemble de vos données depuis la plateforme.' },
    { q: 'Puis-je importer mes fichiers Excel ?', a: 'Oui. L\'import reprend votre personnel, vos sites et vos produits pour démarrer en quelques minutes.' },
];

/* ------------------------------------------------------------------ */
/*  Petits composants                                                  */
/* ------------------------------------------------------------------ */

const ICON_PATHS = {
    field: 'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
    clock: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
    box: 'M21 8l-9-5-9 5m18 0v8l-9 5m9-13l-9 5m0 8l-9-5V8m9 13v-8M3 8l9 5',
    file: 'M7 3h7l5 5v13H7a1 1 0 01-1-1V4a1 1 0 011-1zm7 0v5h5M9 13h6M9 17h6',
    coin: 'M12 6v12m3-9.5c-.5-1-1.600-1.500-3-1.500-1.700 0-3 .8-3 2s1.300 1.700 3 2 3 .8 3 2-1.300 2-3 2c-1.400 0-2.500-.5-3-1.500M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bell: 'M15 17h5l-1.400-1.400A2 2 0 0118 14.200V11a6 6 0 10-12 0v3.200a2 2 0 01-.6 1.400L4 17h5m6 0a3 3 0 11-6 0',
    camera: 'M4 8h3l2-3h6l2 3h3v11H4V8zm8 9a4 4 0 100-8 4 4 0 000 8z',
    chat: 'M21 12a8 8 0 01-11.500 7.200L4 20l1-4.500A8 8 0 1121 12z',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    lock: 'M7 11V8a5 5 0 0110 0v3m-9 0h8a1 1 0 011 1v7a1 1 0 01-1 1H8a1 1 0 01-1-1v-7a1 1 0 011-1z',
    spark: 'M12 3l1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900L12 3zm7 12l.8 2.200L22 18l-2.200.8L19 21l-.8-2.200L16 18l2.200-.8L19 15z',
    alert: 'M12 9v4m0 4h.01M10.300 3.900L1.800 18a2 2 0 001.700 3h17a2 2 0 001.700-3L13.700 3.900a2 2 0 00-3.400 0z',
    trend: 'M3 17l6-6 4 4 8-8m0 0h-6m6 0v6',
    mail: 'M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm-1 1l9 6.500L21 7',
    offline: 'M3 3l18 18M8.5 16.500a5 5 0 017 0M5 12.900a10 10 0 015.200-2.800M19 12.900a10 10 0 00-2.300-1.600M2 8.800a15 15 0 014.200-2.600M22 8.800A15 15 0 0010.700 5M12 20h.01',
    signal: 'M5 20v-3M10 20v-7M15 20V9M20 20V4',
    wallet: 'M3 7a2 2 0 012-2h12v4M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2zm13 7h.01',
    install: 'M8 2h8a1 1 0 011 1v18a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1zm4 4v7m-3-3l3 3 3-3m-3 6.500h.01',
};

function Icon({ name, className = 'h-6 w-6' }: { name: string; className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d={ICON_PATHS[name as keyof typeof ICON_PATHS]} />
        </svg>
    );
}

function Check({ className = 'h-5 w-5 text-green-600' }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
        </svg>
    );
}

function Cross({ className = 'h-5 w-5 text-red-400' }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

/* Logo Motriks horizontal : vert sur fond clair, blanc sur fond sombre (light). */
function Logo({ light = false }: { light?: boolean }) {
    return (
        <Link href="/" aria-label="Motriks, accueil" className="flex items-center">
            <MotriksLogo variant={light ? 'white' : 'color'} className="h-7" />
        </Link>
    );
}

/* Une seule taille pour tous les titres de section (h2) de la page, CTA final compris */
const H2 = 'text-balance text-3xl font-bold tracking-[-0.03em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]';

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
    return <p className={`mb-4 text-sm font-medium ${dark ? 'text-green-400' : 'text-green-700'}`}>{children}</p>;
}

/* En-tête de section : titre à gauche, texte à droite sur ordinateur, l'un sous l'autre sur téléphone */
function SectionTitle({ eyebrow, title, text, dark = false }: { eyebrow?: string; title: string; text?: string; dark?: boolean }) {
    return (
        <div data-reveal className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-10">
            <div className="lg:col-span-7">
                {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
                <h2 className={`${H2} ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
            </div>
            {text && (
                <p className={`text-pretty text-base leading-relaxed sm:text-lg lg:col-span-5 lg:pb-1.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{text}</p>
            )}
        </div>
    );
}


/* Animation au défilement : les éléments marqués data-reveal apparaissent à chaque passage à l'écran */
const REVEAL_CSS = `
.rv{opacity:0;transform:translateY(32px) scale(.98);will-change:opacity,transform;
transition:opacity .8s cubic-bezier(.22,1,.36,1),transform .8s cubic-bezier(.22,1,.36,1),translate .3s ease,box-shadow .3s ease,border-color .3s ease,background-color .3s ease,color .3s ease;
transition-delay:var(--rv-delay,0ms)}
.rv.rv-in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.rv{opacity:1;transform:none;transition:none}}
@media (min-width:1024px){.hero-tilt{transform:perspective(2200px) rotateY(-17deg) rotateX(5deg) rotateZ(1.5deg);transform-origin:left center}}
`;

function useScrollReveal() {
    useLayoutEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            return;
        }

        const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
        const timers = new Map<HTMLElement, number>();

        // décalage progressif entre éléments frères (0, 90, 180, 270 ms)
        const counters = new Map<Element, number>();
        els.forEach((el) => {
            const parent = el.parentElement as Element;
            const i = counters.get(parent) ?? 0;
            counters.set(parent, i + 1);
            el.dataset.rvDelay = String(Math.min(i, 4) * 90);
            el.classList.add('rv');
        });

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const el = entry.target as HTMLElement;
                    window.clearTimeout(timers.get(el));
                    if (entry.isIntersecting) {
                        const delay = Number(el.dataset.rvDelay ?? 0);
                        el.style.setProperty('--rv-delay', `${delay}ms`);
                        el.classList.add('rv-in');
                        // le délai est retiré ensuite pour ne pas ralentir les effets au survol
                        timers.set(el, window.setTimeout(() => el.style.setProperty('--rv-delay', '0ms'), delay + 900));
                    } else {
                        el.style.setProperty('--rv-delay', '0ms');
                        el.classList.remove('rv-in');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
        );

        els.forEach((el) => io.observe(el));

        return () => {
            io.disconnect();
            timers.forEach((t) => window.clearTimeout(t));
            els.forEach((el) => {
                el.classList.remove('rv', 'rv-in');
                el.style.removeProperty('--rv-delay');
            });
        };
    }, []);
}

/* ------------------------------------------------------------------ */
/*  Timeline IA : ligne verte ondulée dessinée au rythme du défilement   */
/* ------------------------------------------------------------------ */

const TIMELINE_CSS = `
.tl-step{opacity:0;transform:translateY(14px);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}
.tl-step[data-on]{opacity:1;transform:none}
.tl-dot{transform:translate(-50%,-50%) scale(0);transition:transform .45s cubic-bezier(.34,1.56,.64,1),box-shadow .5s ease}
.tl-dot[data-on]{transform:translate(-50%,-50%) scale(1);box-shadow:0 0 0 4px rgba(34,197,94,.12)}
.tl-dot[data-active]{box-shadow:0 0 0 6px rgba(34,197,94,.18),0 0 18px 4px rgba(74,222,128,.45)}
.tl-line{filter:drop-shadow(0 0 3px rgba(74,222,128,.55))}
@media (max-width:639px){
.tl-line{filter:drop-shadow(0 0 2px rgba(74,222,128,.35))}
.tl-dot[data-active]{box-shadow:0 0 0 5px rgba(34,197,94,.15),0 0 10px 2px rgba(74,222,128,.3)}
}
@media (prefers-reduced-motion:reduce){.tl-step,.tl-dot{transition:none}}
`;

const TL_GUTTER = 56; // largeur de la zone où ondule la ligne
const TL_WAVE = [14, 42]; // positions horizontales alternées des points sur la courbe

type TlPoint = { x: number; y: number };
type TlGeometry = { height: number; points: TlPoint[]; d: string };

/* Courbe de Bézier passant exactement par chaque point (tangentes verticales : la ligne ondule sans jamais remonter) */
function buildWavePath(points: TlPoint[], height: number) {
    const mid = TL_GUTTER / 2;
    let prev: TlPoint = { x: mid, y: 0 };
    let d = `M ${mid} 0`;
    [...points, { x: mid, y: height }].forEach((p) => {
        const half = (p.y - prev.y) / 2;
        d += ` C ${prev.x} ${prev.y + half}, ${p.x} ${p.y - half}, ${p.x} ${p.y}`;
        prev = p;
    });
    return d;
}

function AiTimeline({ items }: { items: { icon: string; title: string; text: string }[] }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const anchorRefs = useRef<(HTMLElement | null)[]>([]);
    const stepRefs = useRef<(HTMLElement | null)[]>([]);
    const dotRefs = useRef<(HTMLElement | null)[]>([]);
    const lengthsRef = useRef<{ total: number; at: number[] }>({ total: 0, at: [] });
    const refreshRef = useRef<() => void>(() => {});
    const [geo, setGeo] = useState<TlGeometry | null>(null);

    // 1. Géométrie : mesurée au montage et au redimensionnement uniquement (jamais pendant le scroll)
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }

        const measure = () => {
            const points = anchorRefs.current.map((anchor, i) => {
                // offsetTop ignore les transformations CSS : la position reste exacte même pendant l'animation
                let y = 0;
                let el: HTMLElement | null = anchor;
                while (el && el !== root) {
                    y += el.offsetTop;
                    el = el.offsetParent as HTMLElement | null;
                }
                return { x: TL_WAVE[i % 2], y: Math.round(y + (anchor?.offsetHeight ?? 0) / 2) };
            });
            const height = root.offsetHeight;
            const d = buildWavePath(points, height);
            setGeo((prev) => (prev && prev.d === d ? prev : { height, points, d }));
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(root);
        return () => ro.disconnect();
    }, []);

    // 2. Longueurs le long de la courbe : où se trouve chaque point (recherche dichotomique, y est croissant)
    useLayoutEffect(() => {
        const path = pathRef.current;
        if (!geo || !path) {
            return;
        }
        const total = path.getTotalLength();
        const at = geo.points.map((p) => {
            let lo = 0;
            let hi = total;
            for (let k = 0; k < 22; k++) {
                const m = (lo + hi) / 2;
                if (path.getPointAtLength(m).y < p.y) {
                    lo = m;
                } else {
                    hi = m;
                }
            }
            return hi;
        });
        lengthsRef.current = { total, at };
        path.style.strokeDasharray = `${total}`;
        path.style.strokeDashoffset = `${total}`;
        refreshRef.current();
    }, [geo]);

    // 3. Synchronisation avec le défilement réel de la page
    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let frame = 0;
        let near = true;

        const apply = () => {
            frame = 0;
            const path = pathRef.current;
            const { total, at } = lengthsRef.current;
            if (!path || !total) {
                return;
            }

            let progress = 1;
            if (!reduce) {
                const r = root.getBoundingClientRect();
                const vh = window.innerHeight;
                // 0 quand le haut arrive à 80 % de l'écran, 1 quand le bas atteint 60 %
                progress = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.2)));
            }

            const drawn = progress * total;
            path.style.strokeDashoffset = `${total - drawn}`;

            let last = -1;
            at.forEach((len, i) => {
                const on = drawn >= len - 0.5;
                if (on) {
                    last = i;
                }
                stepRefs.current[i]?.toggleAttribute('data-on', on);
                dotRefs.current[i]?.toggleAttribute('data-on', on);
            });
            dotRefs.current.forEach((dot, i) => dot?.toggleAttribute('data-active', i === last));
        };

        const schedule = () => {
            if (!frame) {
                frame = window.requestAnimationFrame(apply);
            }
        };
        const onScroll = () => {
            if (near) {
                schedule();
            }
        };

        refreshRef.current = schedule;
        schedule();

        if (reduce) {
            return () => window.cancelAnimationFrame(frame);
        }

        // on n'écoute le scroll que lorsque la section est proche de l'écran
        const io = new IntersectionObserver(
            ([entry]) => {
                near = entry.isIntersecting;
                schedule();
            },
            { rootMargin: '30% 0px 30% 0px' },
        );
        io.observe(root);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);

        return () => {
            window.cancelAnimationFrame(frame);
            io.disconnect();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            refreshRef.current = () => {};
        };
    }, []);

    return (
        <>
            <style>{TIMELINE_CSS}</style>
            <div
                ref={rootRef}
                className="relative flex flex-col gap-10 py-2 lg:h-full lg:justify-between lg:gap-0 lg:py-6"
                style={{ paddingLeft: TL_GUTTER }}
            >
                <svg
                    className="pointer-events-none absolute left-0 top-0 overflow-visible"
                    width={TL_GUTTER}
                    height={geo?.height ?? 0}
                    aria-hidden="true"
                >
                    {geo && (
                        <>
                            <path d={geo.d} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="2" />
                            <path
                                ref={pathRef}
                                className="tl-line"
                                d={geo.d}
                                fill="none"
                                stroke="#12b76a"
                                strokeWidth="2.25"
                                strokeLinecap="round"
                            />
                        </>
                    )}
                </svg>

                {geo?.points.map((p, i) => (
                    <span
                        key={i}
                        ref={(el) => {
                            dotRefs.current[i] = el;
                        }}
                        className="tl-dot pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-green-400"
                        style={{ left: p.x, top: p.y }}
                        aria-hidden="true"
                    />
                ))}

                {items.map((it, i) => (
                    <div
                        key={it.title}
                        ref={(el) => {
                            stepRefs.current[i] = el;
                        }}
                        className="tl-step flex items-start gap-4"
                    >
                        <span
                            ref={(el) => {
                                anchorRefs.current[i] = el;
                            }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10 text-green-400"
                        >
                            <Icon name={it.icon} className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 pt-0.5">
                            <h3 className="text-base font-semibold text-white">{it.title}</h3>
                            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">{it.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Grille des fonctionnalités : cases séparées par des filets fins      */
/* ------------------------------------------------------------------ */

function FeatureGrid() {
    return (
        <div data-reveal className="mt-14 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map((f) => (
                    <div key={f.title} className="bg-white p-7 transition-colors duration-200 hover:bg-slate-50/70 sm:p-8">
                        <Icon name={f.icon} className="h-5 w-5 text-green-600" />
                        <h3 className="mt-5 text-base font-semibold tracking-tight text-slate-900 sm:mt-8">{f.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* Tableau de bord du hero : fenêtre d'application avec barre latérale */
function HeroDashboard() {
    const nav = [
        { icon: 'grid', label: "Vue d'ensemble", active: true },
        { icon: 'field', label: 'Sites' },
        { icon: 'clock', label: 'Présences' },
        { icon: 'box', label: 'Stocks' },
        { icon: 'file', label: 'Rapports' },
    ];
    const rows = [
        { icon: 'field', name: 'Carrefour Bastos', code: 'site_8f21c4', amount: '1 245 000', status: 'Ouvert', tone: 'bg-green-100 text-green-700' },
        { icon: 'field', name: 'Mvog-Ada', code: 'site_3b09de', amount: '860 000', status: 'Ouvert', tone: 'bg-green-100 text-green-700' },
        { icon: 'field', name: 'Mokolo', code: 'site_c71a55', amount: '0', status: 'Pas ouvert', tone: 'bg-amber-100 text-amber-700' },
        { icon: 'field', name: 'Essos', code: 'site_5e4402', amount: '415 000', status: 'Ouvert', tone: 'bg-green-100 text-green-700' },
        { icon: 'field', name: 'Bonamoussadi', code: 'site_a93f10', amount: '730 000', status: 'Ouvert', tone: 'bg-green-100 text-green-700' },
        { icon: 'field', name: 'Biyem-Assi', code: 'site_2d7c68', amount: '392 000', status: 'Ouvert', tone: 'bg-green-100 text-green-700' },
    ];

    return (
        <div
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white"
            style={{
                WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 42%, rgba(0,0,0,0.55) 68%, transparent 96%)',
                maskImage: 'linear-gradient(to bottom, #000 0%, #000 42%, rgba(0,0,0,0.55) 68%, transparent 96%)',
            }}
        >
            <div className="flex">
                <aside className="hidden w-56 shrink-0 border-r border-slate-100 bg-slate-50/80 p-5 sm:block">
                    <div className="flex items-center gap-3">
                        <MotriksMark className="size-9 rounded-full" />
                        <p className="text-sm font-semibold leading-tight text-slate-900">
                            Motriks
                            <span className="block text-xs font-normal text-slate-500">Démo Distribution</span>
                        </p>
                    </div>
                    <nav className="mt-8 space-y-1">
                        {nav.map((n) => (
                            <div
                                key={n.label}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                                    n.active ? 'bg-green-100/80 font-medium text-green-700' : 'text-slate-500'
                                }`}
                            >
                                <Icon name={n.icon} className="h-4 w-4" />
                                {n.label}
                            </div>
                        ))}
                    </nav>
                </aside>

                <div className="min-w-0 flex-1">
                    <div className="border-b border-slate-100 px-4 py-4 text-sm text-slate-500 sm:px-6">
                        Espace entreprise · Démo Distribution
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {[
                                { label: 'Ventes du jour', value: '2 480 000', unit: 'FCFA' },
                                { label: 'Hôtesses actives', value: '24 / 26', unit: '' },
                                { label: 'Sites ouverts', value: '9 / 10', unit: '' },
                            ].map((k) => (
                                <div key={k.label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
                                    <p className="text-xs text-slate-500">{k.label}</p>
                                    <p className="mt-2 text-base font-semibold tracking-tight text-slate-900 sm:text-xl">
                                        {k.value} <span className="text-xs font-medium text-slate-400">{k.unit}</span>
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
                            <p className="border-b border-slate-100 px-4 py-3.5 text-sm font-semibold text-slate-900 sm:px-5">Activité des sites</p>
                            {rows.map((r) => (
                                <div key={r.code} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 last:border-b-0 sm:gap-4 sm:px-5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        <Icon name={r.icon} className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 sm:w-36 sm:flex-none sm:shrink-0">{r.name}</span>
                                    <span className="hidden w-28 shrink-0 font-mono text-xs text-slate-400 md:block">{r.code}</span>
                                    <span className="hidden flex-1 text-sm text-slate-600 sm:block">{r.amount} FCFA</span>
                                    <span className={`ml-auto shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.tone}`}>{r.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Démo animée de l'assistant : une conversation qui se joue en boucle  */
/* ------------------------------------------------------------------ */

type DemoCard = 'sales' | 'absences' | 'pdf';
type DemoStep = { role: 'user' | 'bot'; text: string; card?: DemoCard; source?: string };
type DemoMsg = DemoStep & { id: number; done: boolean };

const DEMO_STEPS: DemoStep[] = [
    { role: 'user', text: 'Quel site a le mieux vendu ce mois-ci ?' },
    {
        role: 'bot',
        text: 'Carrefour Bastos arrive en tête avec 4 820 000 FCFA, soit +12 % par rapport au mois dernier.',
        card: 'sales',
        source: 'Source : ventes validées du 1er au 30 du mois',
    },
    { role: 'user', text: 'Quelles hôtesses ont été absentes plusieurs fois ?' },
    {
        role: 'bot',
        text: 'Deux hôtesses cumulent 3 absences ce mois-ci. Aucune n\'a de justificatif enregistré.',
        card: 'absences',
        source: 'Source : pointages du 1er au 30 du mois',
    },
    { role: 'user', text: 'Prépare-moi le rapport en PDF.' },
    { role: 'bot', text: 'Voilà, votre rapport est prêt.', card: 'pdf' },
];

function DemoCardView({ card }: { card: DemoCard }) {
    const [go, setGo] = useState(false);

    useEffect(() => {
        const t = window.setTimeout(() => setGo(true), 80);
        return () => window.clearTimeout(t);
    }, []);

    if (card === 'sales') {
        const rows = [
            { n: 'Carrefour Bastos', v: '4 820 000', p: 100 },
            { n: 'Mvog-Ada', v: '3 960 000', p: 82 },
            { n: 'Mokolo', v: '2 310 000', p: 48 },
        ];
        return (
            <div className="mt-2 space-y-3 rounded-2xl bg-slate-900/60 p-4">
                {rows.map((r, i) => (
                    <div key={r.n}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-200">{r.n}</span>
                            <span className="text-slate-400">{r.v} FCFA</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                            <div
                                className="h-full rounded-full bg-green-500 transition-[width] duration-1000 ease-out"
                                style={{ width: go ? `${r.p}%` : '0%', transitionDelay: `${i * 150}ms` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (card === 'absences') {
        const rows = [
            { n: 'Sandrine M.', site: 'Carrefour Bastos' },
            { n: 'Ruth E.', site: 'Mvog-Ada' },
        ];
        return (
            <div className="mt-2 space-y-2 rounded-2xl bg-slate-900/60 p-3">
                {rows.map((r) => (
                    <div key={r.n} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">{r.n[0]}</span>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-slate-100">{r.n}</p>
                            <p className="text-[11px] text-slate-400">{r.site}</p>
                        </div>
                        <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300">3 absences</span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-slate-900/60 p-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
                <Icon name="file" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">Rapport_absences_octobre.pdf</p>
                <p className="text-[11px] text-slate-400">2 pages · 84 Ko</p>
            </div>
            <span className="rounded-full bg-green-500 px-4 py-2 text-xs font-semibold text-white">Télécharger</span>
        </div>
    );
}

function AssistantDemo() {
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [messages, setMessages] = useState<DemoMsg[]>([]);
    const [typing, setTyping] = useState(false);
    const [draft, setDraft] = useState('');

    // la démo démarre quand elle arrive à l'écran, et repart du début à chaque retour
    useEffect(() => {
        const el = rootRef.current;
        if (!el) {
            return;
        }
        const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.4 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!active) {
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setMessages(DEMO_STEPS.map((st, i) => ({ ...st, id: i, done: true })));
            return;
        }

        let cancelled = false;
        const wait = (ms: number) =>
            new Promise<void>((resolve, reject) => {
                window.setTimeout(() => (cancelled ? reject(new Error('stop')) : resolve()), ms);
            });

        (async () => {
            try {
                while (!cancelled) {
                    setMessages([]);
                    setTyping(false);
                    setDraft('');
                    await wait(700);

                    for (let i = 0; i < DEMO_STEPS.length; i++) {
                        const st = DEMO_STEPS[i];

                        if (st.role === 'user') {
                            for (let c = 1; c <= st.text.length; c++) {
                                setDraft(st.text.slice(0, c));
                                await wait(32);
                            }
                            await wait(350);
                            setDraft('');
                            setMessages((prev) => [...prev, { ...st, id: i, done: true }]);
                            await wait(500);
                        } else {
                            setTyping(true);
                            await wait(1100);
                            setTyping(false);

                            const words = st.text.split(' ');
                            setMessages((prev) => [...prev, { ...st, text: '', id: i, done: false }]);
                            for (let w = 1; w <= words.length; w++) {
                                const part = words.slice(0, w).join(' ');
                                setMessages((prev) => prev.map((m) => (m.id === i ? { ...m, text: part } : m)));
                                await wait(55);
                            }
                            setMessages((prev) => prev.map((m) => (m.id === i ? { ...m, done: true } : m)));
                            await wait(1300);
                        }
                    }

                    await wait(5000);
                }
            } catch {
                /* démo interrompue : l'utilisateur est sorti de l'écran */
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [active]);

    // garde le bas de la conversation visible
    useEffect(() => {
        const el = listRef.current;
        if (el) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, typing]);

    return (
        <div
            ref={rootRef}
            className="flex h-[520px] flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-800 shadow-2xl shadow-black/30 lg:h-[560px]"
        >
            {/* en-tête */}
            <div className="flex items-center gap-3 border-b border-slate-700/80 px-5 py-4">
                <MotriksMark className="size-10 rounded-full" />
                <div className="leading-tight">
                    <p className="text-sm font-semibold text-white">Assistant Motriks</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                        En ligne
                    </p>
                </div>
            </div>

            {/* conversation */}
            <div
                ref={listRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {messages.length === 0 && !typing && (
                    <p className="pt-16 text-center text-sm text-slate-500">Posez une question sur vos équipes, vos stocks ou vos ventes.</p>
                )}

                {messages.map((m) =>
                    m.role === 'user' ? (
                        <div key={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-green-600 px-4 py-2.5 text-sm text-white">
                            {m.text}
                        </div>
                    ) : (
                        <div key={m.id} className="flex max-w-[92%] items-start gap-2.5">
                            <MotriksMark className="mt-0.5 size-7 rounded-full" />
                            <div className="min-w-0 flex-1">
                                <div className="w-fit rounded-2xl rounded-tl-md bg-slate-700/80 px-4 py-2.5 text-sm leading-relaxed text-slate-100">
                                    {m.text}
                                </div>
                                {m.done && m.card && <DemoCardView card={m.card} />}
                                {m.done && m.source && <p className="mt-2 text-[11px] text-slate-500">{m.source}</p>}
                            </div>
                        </div>
                    ),
                )}

                {typing && (
                    <div className="flex items-start gap-2.5">
                        <MotriksMark className="size-7 rounded-full" />
                        <div className="flex gap-1.5 rounded-2xl rounded-tl-md bg-slate-700/80 px-4 py-3.5">
                            {[0, 1, 2].map((d) => (
                                <span
                                    key={d}
                                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300"
                                    style={{ animationDelay: `${d * 140}ms` }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* zone de saisie */}
            <div className="p-4 pt-2">
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/70 py-2 pl-5 pr-2">
                    <span className="flex-1 truncate text-sm">
                        {draft ? (
                            <span className="text-white">
                                {draft}
                                <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-green-400" />
                            </span>
                        ) : (
                            <span className="text-slate-500">Posez votre question...</span>
                        )}
                    </span>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors ${draft ? 'bg-green-500' : 'bg-slate-700'}`}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 19V5m-6 6l6-6 6 6" />
                        </svg>
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

/* Données structurées schema.org : l'éditeur, le site, le logiciel et la FAQ */
// Données structurées propres à l'accueil : la FAQ (organisation, site et application : PublicPages, côté serveur)
const FAQ_JSON_LD = [
    {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    },
];

export default function Landing({ paymentLogos }: { paymentLogos?: { name: string; url: string }[] }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);
    useScrollReveal();

    // Arrivée depuis un lien du type /accueil#tarifs : on descend jusqu'à la section
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (!id) {
            return;
        }
        const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 120);
        return () => window.clearTimeout(timer);
    }, []);
    const [scrolled, setScrolled] = useState(false);
    const [active, setActive] = useState('');

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        setActive(e.target.id);
                    }
                });
            },
            { rootMargin: '-40% 0px -55% 0px' },
        );
        NAV_LINKS.forEach((l) => {
            const el = document.getElementById(l.href.slice(1));
            if (el) {
                observer.observe(el);
            }
        });
        return () => observer.disconnect();
    }, []);

    return (
        <>
            <Seo jsonLd={FAQ_JSON_LD} />

            <div className="min-h-screen scroll-smooth bg-white font-sans text-slate-900 antialiased">
                <style>{REVEAL_CSS}</style>
                {/* ------------------------------ Navbar ------------------------------ */}
                <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
                    <div
                        className={`relative mx-auto flex items-center justify-between max-w-6xl rounded-full border px-2.5 backdrop-blur-xl transition-[background-color,box-shadow,border-color,padding] duration-300 ${
                            scrolled
                                ? 'border-slate-200/80 bg-white/90 py-1.5 shadow-xl shadow-slate-900/[0.08]'
                                : 'border-white/70 bg-white/60 py-2 shadow-lg shadow-green-900/5'
                        }`}
                    >
                        <div className="pl-2">
                            <Logo />
                        </div>

                        <nav className="hidden items-center gap-0.5 xl:flex">
                            {NAV_LINKS.map((l) => {
                                const isActive = active === l.href.slice(1);
                                return (
                                    <a
                                        key={l.href}
                                        href={l.href}
                                        className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${
                                            isActive
                                                ? 'bg-green-50 text-green-700'
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                    >
                                        {l.label}
                                    </a>
                                );
                            })}
                        <Link
                                href="/contact"
                                className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                                Contact
                            </Link>
                        </nav>

                        <AuthNavActions />

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
                                        <a
                                            key={l.href}
                                            href={l.href}
                                            onClick={() => setMenuOpen(false)}
                                            className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-700"
                                        >
                                            {l.label}
                                        </a>
                                    ))}
                                <Link
                                        href="/contact"
                                        className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-700"
                                    >
                                        Contact
                                    </Link>
                                </nav>
                                <AuthMobileActions />
                            </div>
                        )}
                    </div>
                </header>

                {/* ------------------------------- Hero ------------------------------- */}
                <section className="relative overflow-hidden bg-white">
                    {/* décor : grande courbe douce à gauche et disque vert en haut à droite */}
                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                        <svg className="absolute left-0 top-0 h-[640px] w-[min(720px,100%)]" viewBox="0 0 720 640" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="heroSweep" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0" stopColor="#9fe0bd" />
                                    <stop offset="0.55" stopColor="#d6f1e3" />
                                    <stop offset="1" stopColor="#ffffff" />
                                </linearGradient>
                            </defs>
                            <path d="M0 0H640C580 240 340 490 0 640Z" fill="url(#heroSweep)" />
                        </svg>
                    </div>

                    <div className="relative mx-auto grid max-w-[90rem] items-start gap-12 px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10 lg:px-10 lg:pt-36">
                        <div>
                            <h1 data-reveal className="text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-950 min-[390px]:text-5xl sm:text-6xl lg:text-[3.6rem]">
                                Pilotez vos équipes terrain en temps réel, sans saisie manuelle
                            </h1>
                            <p data-reveal className="mt-7 max-w-xl text-lg leading-relaxed text-slate-600">
                                Motriks remplace les messages WhatsApp, les tableurs éparpillés et les rapports papier par un seul outil, et laisse l'intelligence artificielle vous dire où agir.
                            </p>
                            <div data-reveal className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Link
                                    href="/register"
                                    className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-green-600 pl-6 pr-1.5 text-sm font-semibold text-white shadow-lg shadow-green-600/30 ring-1 ring-inset ring-white/10 transition hover:bg-green-700"
                                >
                                    Commencer gratuitement
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-green-700 transition-transform group-hover:translate-x-0.5">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M5 12h14m-6-6l6 6-6 6" />
                                        </svg>
                                    </span>
                                </Link>
                                <a
                                    href="#fonctionnalites"
                                    className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-6 text-sm font-semibold text-slate-800 backdrop-blur transition hover:border-green-300 hover:bg-white hover:text-green-700"
                                >
                                    Découvrir les fonctionnalités
                                </a>
                            </div>
                            <ul data-reveal className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                                <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-600" /> Sans carte bancaire</li>
                                <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-600" /> Essai de 7 jours</li>
                                <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-600" /> Fonctionne hors-ligne</li>
                            </ul>

                            <dl data-reveal className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200/70 pt-5 sm:grid-cols-4">
                                {STATS.map((st) => (
                                    <div key={st.label}>
                                        <dt className="text-base font-bold text-green-700/70">{st.value}</dt>
                                        <dd className="mt-0.5 text-[11px] leading-tight text-slate-400">{st.label}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        {/* la fenêtre d'application est inclinée et déborde à droite de l'écran */}
                        <div data-reveal className="lg:-mr-[30vw] lg:-mt-2">
                            <div className="hero-tilt w-full lg:w-[920px]">
                                <HeroDashboard />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ------------------------- Problème / solution ----------------------- */}
                <section className="relative overflow-hidden bg-slate-50 py-20 lg:py-28">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <SectionTitle
                            eyebrow="Pourquoi Motriks"
                            title="Fini le chaos des messages et des tableurs"
                            text="Ce qui vous fait perdre du temps aujourd'hui, Motriks le règle automatiquement."
                        />

                        <div className="relative mt-14 grid gap-5 lg:grid-cols-2 lg:gap-8">
                            {/* avant */}
                            <div data-reveal className="rounded-[1.75rem] border border-slate-200 bg-white/60 p-7 sm:p-9">
                                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                    Aujourd'hui
                                </span>
                                <h3 className="mt-4 text-xl font-bold text-slate-400">Sans Motriks</h3>
                                <ul className="mt-7 space-y-3">
                                    {PROBLEMS.map((p) => (
                                        <li key={p} className="flex min-h-[3.25rem] items-center gap-3.5 rounded-2xl px-1 text-slate-500">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400">
                                                <Cross className="h-3.5 w-3.5" />
                                            </span>
                                            <span className="leading-snug">{p}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* pastille centrale */}
                            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block" aria-hidden="true">
                                <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-50 bg-green-600 text-white shadow-xl shadow-green-600/30">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M5 12h14m-6-6l6 6-6 6" />
                                    </svg>
                                </span>
                            </div>

                            {/* après */}
                            <div data-reveal className="rounded-[1.75rem] bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 p-px shadow-2xl shadow-green-700/15">
                                <div className="relative h-full overflow-hidden rounded-[calc(1.75rem-1px)] bg-white p-7 sm:p-9">
                                    <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-green-100/70 blur-3xl" aria-hidden="true" />
                                    <div className="relative">
                                        <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-700">
                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                                            Avec Motriks
                                        </span>
                                        <h3 className="mt-4 text-xl font-bold text-slate-900">Tout est automatique</h3>
                                        <ul className="mt-7 space-y-3">
                                            {SOLUTIONS.map((sol) => (
                                                <li
                                                    key={sol}
                                                    className="flex min-h-[3.25rem] items-center gap-3.5 rounded-2xl px-1 font-medium text-slate-800 transition hover:bg-green-50/70"
                                                >
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-md shadow-green-600/25">
                                                        <Check className="h-3.5 w-3.5 text-white" />
                                                    </span>
                                                    <span className="leading-snug">{sol}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------------------------- Fonctionnalités ------------------------ */}
                <section id="fonctionnalites" className="scroll-mt-24 py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionTitle
                            eyebrow="Fonctionnalités"
                            title="Tout ce qu'il faut pour gérer le terrain"
                            text="Chaque forfait ajoute des fonctions : du suivi terrain gratuit jusqu'aux campagnes et au reporting complet."
                        />
                        <FeatureGrid />
                    </div>
                </section>

                {/* --------------------------------- IA -------------------------------- */}
                <section id="ia" className="scroll-mt-24 bg-slate-900 py-20 text-white">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionTitle
                            dark
                            eyebrow="Intelligence artificielle"
                            title="Une IA utile, qui vous dit où agir"
                            text="L'IA s'appuie sur les données déjà collectées : aucune saisie supplémentaire. Chaque recommandation indique les données sur lesquelles elle repose, et la décision finale reste la vôtre."
                        />

                        {/* à gauche la timeline ondulée, à droite la démo : même hauteur sur ordinateur */}
                        <div className="mt-14 grid items-stretch gap-12 lg:mt-16 lg:grid-cols-2 lg:gap-10">
                            <AiTimeline items={AI_FEATURES} />

                            <div data-reveal>
                                <AssistantDemo />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------------------- Démarrage et publics visés -------------------- */}
                <section className="py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionTitle
                            eyebrow="Démarrage"
                            title="Opérationnel en trois étapes"
                            text="Pensé pour les gérants, les responsables commerciaux, les agences d'hôtesses et leurs comptables."
                        />
                        {/* étapes : un filet en haut de chaque colonne, l'étape en cours marquée d'un trait vert */}
                        <ol data-reveal className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
                            {STEPS.map((st, i) => (
                                <li key={st.title} className="relative border-t border-slate-200 pt-6">
                                    <span className="absolute -top-px left-0 h-px w-12 bg-green-600" aria-hidden="true" />
                                    <div className="flex items-baseline justify-between gap-4 text-xs">
                                        <span className="font-semibold text-green-700">Étape {i + 1}</span>
                                        <span className="text-slate-400">{st.tag}</span>
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{st.title}</h3>
                                    <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{st.text}</p>
                                </li>
                            ))}
                        </ol>

                        <div data-reveal className="mt-16 rounded-2xl bg-slate-50 p-7 sm:p-10">
                            <p className="text-sm font-medium text-slate-500">Conçu pour</p>
                            <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
                                {PERSONAS.map((p) => (
                                    <div key={p.title}>
                                        <h3 className="text-[15px] font-semibold text-slate-900">{p.title}</h3>
                                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{p.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ------------------------------ Atouts locaux ------------------------ */}
                <section className="py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionTitle
                            eyebrow="Adapté à votre réalité"
                            title="Pensé pour le terrain africain"
                            text="Connexion variable, téléphones d'entrée de gamme, paiement mobile : Motriks a été conçu avec ces contraintes."
                        />
                        {/* quatre colonnes séparées par des filets verticaux, sans cartes */}
                        <div data-reveal className="mt-14 grid gap-y-10 border-t border-slate-200 pt-10 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-slate-200">
                            {LOCAL.map((l) => (
                                <div key={l.title} className="lg:px-8 lg:first:pl-0 lg:last:pr-0">
                                    <Icon name={l.icon} className="h-5 w-5 text-green-600" />
                                    <h3 className="mt-6 text-base font-semibold tracking-tight text-slate-900">{l.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{l.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --------------------------------- Tarifs ---------------------------- */}
                <section id="tarifs" className="scroll-mt-24 bg-slate-50 py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionTitle
                            eyebrow="Tarifs"
                            title="Un forfait à la taille de votre réseau"
                            text="Commencez gratuitement avec Motriks Starter, passez au forfait supérieur quand votre équipe grandit."
                        />

                        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                            {PLANS.map((p) => (
                                <div
                                    key={p.name}
                                    data-reveal
                                    className={`flex flex-col rounded-2xl p-8 ${
                                        p.highlight
                                            ? 'border-2 border-green-600 bg-white shadow-xl shadow-green-600/10'
                                            : 'border border-slate-200 bg-white'
                                    }`}
                                >
                                    {p.highlight && (
                                        <span className="mb-4 w-fit rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
                                            Recommandé
                                        </span>
                                    )}
                                    <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                                    <p className="mt-2 text-sm text-slate-600">{p.description}</p>
                                    <p className="mt-6">
                                        <span className="text-4xl font-extrabold text-slate-900">{p.price}</span>
                                        {p.unit && (
                                            <span className="ml-2 text-sm text-slate-500">
                                                {p.unit}
                                            </span>
                                        )}
                                    </p>
                                    <ul className="mt-6 flex-1 space-y-3">
                                        {p.features.map((f) => (
                                            <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                                                <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href="/register"
                                        className={`mt-8 rounded-full px-5 py-3 text-center text-sm font-semibold transition ${
                                            p.highlight
                                                ? 'bg-green-600 text-white hover:bg-green-700'
                                                : 'border border-slate-200 text-slate-700 hover:border-green-300 hover:text-green-700'
                                        }`}
                                    >
                                        {p.cta}
                                    </Link>
                                </div>
                            ))}
                        </div>

                        <p className="mt-8 text-center text-sm text-slate-500">
                            Packs d’extension : +5 hôtesses et +5 points de vente pour 11 500 FCFA par mois, +1 superviseur pour 1 500 FCFA par mois. Paiement à l’année : 10 mois payés pour 12.
                        </p>
                    </div>
                </section>

                {/* ---------------------------------- FAQ ------------------------------ */}
                <section id="faq" className="scroll-mt-24 py-20 lg:py-28">
                    <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
                        {/* colonne gauche : titre et contact, fixe pendant le défilement */}
                        <div className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
                            <div data-reveal>
                                <Eyebrow>FAQ</Eyebrow>
                                <h2 className={`${H2} text-slate-950`}>Les réponses à vos questions</h2>
                                <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
                                    Sécurité, essai, abonnement, données : l'essentiel pour démarrer sereinement avec Motriks.
                                </p>
                            </div>

                            <div data-reveal className="mt-10 max-w-md border-t border-slate-200 pt-8">
                                <p className="text-[15px] font-semibold text-slate-900">Vous ne trouvez pas votre réponse ?</p>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                                    Notre équipe vous répond directement, en général dans la journée.
                                </p>
                                <div className="mt-5 flex flex-wrap gap-2.5">
                                    <a
                                        href={`https://wa.me/${CONTACT.whatsapp}`}
                                        className="inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                                    >
                                        Écrire sur WhatsApp
                                    </a>
                                    <Link
                                        href="/contact"
                                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                                    >
                                        Nous contacter
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* colonne droite : accordéon */}
                        <div data-reveal className="divide-y divide-slate-200 border-y border-slate-200 lg:col-span-7">
                            {FAQS.map((f, i) => {
                                const open = openFaq === i;
                                return (
                                    <div key={f.q}>
                                        <button
                                            type="button"
                                            id={`faq-q-${i}`}
                                            onClick={() => setOpenFaq(open ? -1 : i)}
                                            aria-expanded={open}
                                            aria-controls={`faq-a-${i}`}
                                            className="group flex w-full items-center gap-6 py-6 text-left"
                                        >
                                            <span className={`flex-1 text-base font-medium transition-colors sm:text-[17px] ${open ? 'text-slate-950' : 'text-slate-700 group-hover:text-slate-950'}`}>
                                                {f.q}
                                            </span>
                                            <svg
                                                className={`h-4 w-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-45 text-slate-900' : 'text-slate-400 group-hover:text-slate-700'}`}
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <path d="M12 5v14M5 12h14" />
                                            </svg>
                                        </button>
                                        {/* ouverture fluide : la hauteur s'anime via grid-template-rows */}
                                        <div
                                            id={`faq-a-${i}`}
                                            role="region"
                                            aria-labelledby={`faq-q-${i}`}
                                            className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
                                                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                            }`}
                                        >
                                            <div className="overflow-hidden">
                                                <p className="max-w-2xl pb-6 pr-10 text-[15px] leading-relaxed text-slate-500">{f.a}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* --------------------------------- CTA final ------------------------- */}
                {/* Encadré clair aligné sur la grille de la page : titre à gauche, boutons à droite */}
                <section id="contact" className="scroll-mt-24 pb-20 lg:pb-28">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div data-reveal className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 sm:px-10 sm:py-14 lg:px-14">
                            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
                                <div className="lg:col-span-7">
                                    <Eyebrow>Démarrer</Eyebrow>
                                    <h2 className={`${H2} text-slate-950`}>Essayez Motriks avec votre équipe</h2>
                                    <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">
                                        Votre espace est prêt en quelques minutes, sans carte bancaire. Vous préférez en parler d'abord ? Écrivez-nous, on vous répond dans la journée.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
                                    <Link
                                        href="/register"
                                        className="inline-flex h-12 items-center justify-center rounded-full bg-green-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                                    >
                                        Créer mon espace
                                    </Link>
                                    <a
                                        href={`https://wa.me/${CONTACT.whatsapp}`}
                                        className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:text-slate-950"
                                    >
                                        Écrire sur WhatsApp
                                    </a>
                                </div>
                            </div>

                            <p className="mt-10 border-t border-slate-200 pt-6 text-sm leading-relaxed text-slate-500">
                                <span className="font-medium text-slate-700">Entreprises pilotes :</span> nous configurons votre espace et formons vos équipes gratuitement, en échange de vos retours sur le produit.
                            </p>
                        </div>
                    </div>
                </section>

                <LandingFooter paymentLogos={paymentLogos} />
            </div>
        </>
    );
}

/* Pas de sidebar : la landing s'affiche sans le layout de l'application */
Landing.layout = (page: ReactNode) => page;