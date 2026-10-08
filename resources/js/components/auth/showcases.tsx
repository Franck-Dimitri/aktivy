import type { ReactNode } from 'react';
import {
    AuditLogIllustration,
    CompanySpaceIllustration,
    EmailSentIllustration,
    FieldEntryIllustration,
    LiveSitesIllustration,
    ModulesIllustration,
    ReportsIllustration,
    SecurityIllustration,
    TeamIllustration,
    TodayOverviewIllustration,
    TwoFactorIllustration,
} from '@/components/auth/illustrations';

export type ShowcaseName =
    | 'login'
    | 'register'
    | 'security'
    | 'verify'
    | 'two-factor';

export type ShowcaseSlide = {
    title: string;
    text: string;
    illustration: ReactNode;
};

type Showcase = {
    background: string;
    decoration: ReactNode;
    slides: ShowcaseSlide[];
};

const decorations = {
    sun: (
        <div className="absolute -top-40 -right-40 size-[640px] rounded-full bg-white/15" />
    ),
    steps: (
        <>
            <div className="absolute -top-24 right-[-8%] h-80 w-[46%] rotate-[-14deg] rounded-[48px] bg-white/12" />
            <div className="absolute top-40 right-[-14%] h-80 w-[40%] rotate-[-14deg] rounded-[48px] bg-white/10" />
        </>
    ),
    rings: (
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[360, 560, 760].map((size) => (
                <div
                    key={size}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20"
                    style={{ width: size, height: size }}
                />
            ))}
        </div>
    ),
    drop: (
        <div className="absolute -bottom-56 -left-40 size-[620px] rounded-full bg-white/15" />
    ),
    dots: (
        <svg className="absolute inset-0 h-full w-full text-ink/10">
            <defs>
                <pattern
                    id="auth-dots"
                    width="28"
                    height="28"
                    patternUnits="userSpaceOnUse"
                >
                    <circle cx="2" cy="2" r="2" fill="currentColor" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-dots)" />
        </svg>
    ),
};

export const showcases: Record<ShowcaseName, Showcase> = {
    login: {
        background: 'bg-[#4fc031]',
        decoration: decorations.sun,
        slides: [
            {
                title: 'Votre journée commence ici.',
                text: 'Dès la connexion, vous voyez les saisies reçues sur chaque site et les clôtures qui attendent votre validation.',
                illustration: <TodayOverviewIllustration />,
            },
            {
                title: 'Vos hôtesses saisissent leur journée en moins de 2 minutes.',
                text: 'Des compteurs + et −, des totaux calculés tout seuls, et une saisie qui tient même quand le réseau coupe.',
                illustration: <FieldEntryIllustration />,
            },
            {
                title: 'Suivez chaque point de vente en direct.',
                text: 'Vous voyez quels sites ont envoyé leur saisie et lesquels sont en retard, sans relancer personne sur WhatsApp.',
                illustration: <LiveSitesIllustration />,
            },
        ],
    },
    register: {
        background: 'bg-[#46b52b]',
        decoration: decorations.steps,
        slides: [
            {
                title: 'Votre espace prêt en deux minutes.',
                text: 'Un nom, un logo, une couleur : vos rapports et vos documents portent l’identité de votre entreprise.',
                illustration: <CompanySpaceIllustration />,
            },
            {
                title: 'Chacun à sa place dans votre équipe.',
                text: 'Gérant, superviseur, hôtesse, comptable : chaque rôle ne voit que ce qui le concerne.',
                illustration: <TeamIllustration />,
            },
            {
                title: 'Commencez gratuitement.',
                text: 'Le socle et les statistiques de base sont gratuits. Les modules payants s’essaient 14 jours, sans carte bancaire.',
                illustration: <ModulesIllustration />,
            },
            {
                title: 'Vos rapports sont prêts sans rien compiler.',
                text: 'Ventes, présences et écarts consolidés chaque semaine, exportables en PDF et Excel aux couleurs de votre entreprise.',
                illustration: <ReportsIllustration />,
            },
        ],
    },
    security: {
        background: 'bg-[#3fa524]',
        decoration: decorations.rings,
        slides: [
            {
                title: 'Vos données restent dans votre espace.',
                text: 'Chaque entreprise est isolée : personne d’autre ne voit vos sites, vos équipes ni vos chiffres.',
                illustration: <SecurityIllustration />,
            },
            {
                title: 'Chaque action sensible est tracée.',
                text: 'Connexions, exports et changements de droits sont enregistrés dans le journal d’audit de votre entreprise.',
                illustration: <AuditLogIllustration />,
            },
        ],
    },
    verify: {
        background: 'bg-[#58c83a]',
        decoration: decorations.drop,
        slides: [
            {
                title: 'Plus qu’un clic.',
                text: 'Ouvrez l’e-mail que nous venons de vous envoyer et confirmez votre adresse pour accéder à votre espace.',
                illustration: <EmailSentIllustration />,
            },
        ],
    },
    'two-factor': {
        background: 'bg-[#3fa524]',
        decoration: decorations.dots,
        slides: [
            {
                title: 'Une seconde vérification, pour plus de sécurité.',
                text: 'Même si votre mot de passe circule, personne n’entre sans le code affiché sur votre téléphone.',
                illustration: <TwoFactorIllustration />,
            },
        ],
    },
};
