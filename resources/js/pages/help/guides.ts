import { BarChart3, ClipboardCheck, CreditCard, Package, Rocket, Smartphone, Sun, Target, Users, WifiOff, type LucideIcon } from 'lucide-react';
import { dashboard } from '@/routes';
import { index as activityIndex } from '@/routes/activity';
import { subscription as companySubscription } from '@/routes/company';
import { index as companyImport } from '@/routes/company/import';
import { index as dailyReportsIndex } from '@/routes/daily-reports';
import { index as reportsIndex, objectives as reportsObjectives } from '@/routes/reports';
import { index as stockAlertsIndex } from '@/routes/stock-alerts';
import { home as terrainHome } from '@/routes/terrain';
import { index as terrainTickets } from '@/routes/terrain/tickets';
import { index as ticketsIndex } from '@/routes/tickets';
import type { Role } from '@/types/auth';

export type Guide = {
    question: string;
    answer: string;
    /** Lien vers l'écran concerné. */
    link?: { label: string; href: string };
    /** Module payant requis ; sans lui la question est masquée. */
    module?: string;
    /** Réservé à certains rôles (par défaut : tous ceux de la catégorie). */
    roles?: Role[];
};

export type Topic = { id: string; title: string; icon: LucideIcon; guides: Guide[] };

const managerTopics = (): Topic[] => [
    {
        id: 'demarrer',
        title: 'Bien démarrer',
        icon: Rocket,
        guides: [
            {
                question: 'Par où commencer ?',
                answer: 'Suivez l’assistant « Bien démarrer » du tableau de bord : identité de l’entreprise, points de vente, produits, hôtesses, affectations, stock de départ, puis un premier rapport envoyé. Chaque étape se coche toute seule une fois faite.',
                link: { label: 'Ouvrir le tableau de bord', href: dashboard().url },
                roles: ['company_admin'],
            },
            {
                question: 'Comment importer mes listes Excel ?',
                answer: 'Menu « Importer des fichiers » : sites, produits et personnel, depuis un Excel (.xlsx) ou un CSV. Téléchargez le modèle, remplissez-le, puis envoyez-le. Au moindre souci, rien n’est importé et chaque ligne à corriger est indiquée. Le personnel importé reçoit un mot de passe provisoire, à changer à la première connexion.',
                link: { label: 'Importer des fichiers', href: companyImport().url },
                roles: ['company_admin'],
            },
        ],
    },
    {
        id: 'terrain',
        title: 'Suivi du terrain',
        icon: ClipboardCheck,
        guides: [
            {
                question: 'Comment voir qui est en poste aujourd’hui ?',
                answer: '« Activité du jour » montre, pour chaque point de vente, les hôtesses attendues, celles en poste (depuis quand), celles qui ont terminé et celles qui n’ont pas pointé. La page se met à jour toute seule chaque minute.',
                link: { label: 'Activité du jour', href: activityIndex().url },
                module: 'terrain',
                roles: ['company_admin', 'supervisor'],
            },
            {
                question: 'Comment voir les rapports du jour ?',
                answer: '« Rapports journaliers » liste les rapports d’une date : envoyés, en cours, et les hôtesses affectées qui n’ont pas pointé. Ouvrez un rapport pour voir les ventes, le stock, les notes et les photos.',
                link: { label: 'Rapports journaliers', href: dailyReportsIndex().url },
                module: 'terrain',
            },
            {
                question: 'Comment corriger puis valider un rapport ?',
                answer: 'Ouvrez le rapport, « Corriger » pour modifier les quantités (le stock est réajusté et la correction est tracée), puis « Valider » : le rapport est alors figé.',
                module: 'terrain',
                roles: ['company_admin', 'supervisor'],
            },
            {
                question: 'Que se passe-t-il si une hôtesse ne pointe pas ?',
                answer: 'Vous êtes prévenu sous la cloche, et par e-mail si votre compte a une adresse, 30 minutes après le début de son créneau (à 10 h si aucun créneau n’est fixé). Chaque hôtesse n’est signalée qu’une fois par jour.',
                module: 'terrain',
                roles: ['company_admin', 'supervisor'],
            },
        ],
    },
    {
        id: 'stock',
        title: 'Stock',
        icon: Package,
        guides: [
            {
                question: 'Comment gérer le stock d’un point de vente ?',
                answer: 'Sur la fiche du site, rubrique Inventaire : « Réassort » pour enregistrer une livraison, le crayon pour un inventaire. Chaque mouvement est tracé. Les ventes des hôtesses sont retirées du stock automatiquement.',
                module: 'stocks',
                roles: ['company_admin', 'supervisor'],
            },
            {
                question: 'Comment être prévenu d’une rupture ?',
                answer: 'Fixez un seuil d’alerte et un seuil critique pour chaque produit d’un site. Sous le seuil, le produit apparaît dans « Alertes de stock » ; sous le seuil critique, vous recevez une notification.',
                link: { label: 'Alertes de stock', href: stockAlertsIndex().url },
                module: 'stocks',
                roles: ['company_admin', 'supervisor'],
            },
        ],
    },
    {
        id: 'ventes',
        title: 'Ventes & objectifs',
        icon: Target,
        guides: [
            {
                question: 'Comment fixer des objectifs ?',
                answer: 'Dans « Ventes & objectifs », onglet Objectifs : par semaine (bouton « Objectifs de la semaine ») ou par mois (entreprise, sites, hôtesses). Fixé une fois, un objectif reste en place jusqu’à ce que vous le changiez ou le retiriez. Si vous n’en fixez qu’un, l’autre est calculé automatiquement (environ 4,3 semaines par mois). L’onglet montre qui l’atteint, qui est en bonne voie et qui est en retard.',
                link: { label: 'Voir les objectifs', href: reportsObjectives().url },
                module: 'reporting',
                roles: ['company_admin', 'supervisor'],
            },
            {
                question: 'Comment exporter les ventes pour la comptabilité ?',
                answer: 'Dans « Ventes & objectifs », choisissez la période (et au besoin un site, une hôtesse ou un événement), puis « Exporter en Excel » : synthèse, détail ligne par ligne et évolution mois par mois.',
                link: { label: 'Ventes & objectifs', href: reportsIndex().url },
                module: 'reporting',
            },
            {
                question: 'Comment envoyer un rapport à une marque ?',
                answer: 'Bouton « PDF » sur un rapport journalier, ou « Synthèse PDF » dans « Ventes & objectifs » pour une période. Les documents reprennent votre logo, votre couleur et vos coordonnées (Paramètres de l’entreprise).',
                module: 'reporting',
            },
        ],
    },
    {
        id: 'equipe',
        title: 'Équipe',
        icon: Users,
        guides: [
            {
                question: 'Que voit un superviseur ?',
                answer: 'Uniquement les points de vente où il est affecté : leurs hôtesses, rapports, ventes, stocks, objectifs et demandes. La création d’événements et l’export des données restent au gérant.',
                roles: ['company_admin', 'supervisor'],
            },
            {
                question: 'Que voit le comptable ?',
                answer: 'Il consulte sans rien modifier : tableau de bord, rapports journaliers, ventes et exports Excel ou PDF.',
                roles: ['company_admin', 'accountant'],
            },
            {
                question: 'Comment répondre aux demandes des hôtesses ?',
                answer: '« Tickets » regroupe les demandes de votre équipe. Ouvrez-en une pour répondre : l’hôtesse est prévenue sous la cloche. « Envoyer et résoudre » clôt la demande en même temps.',
                link: { label: 'Tickets', href: ticketsIndex().url },
                module: 'demandes',
                roles: ['company_admin', 'supervisor'],
            },
        ],
    },
    {
        id: 'compte',
        title: 'Abonnement',
        icon: CreditCard,
        guides: [
            {
                question: 'Comment fonctionne l’abonnement ?',
                answer: 'Le socle (tableau de bord, sites, personnel, affectations, produits, import, export) est inclus. Les modules — suivi terrain, stocks, reporting, événements, photos, demandes — s’activent selon vos besoins. Une nouvelle entreprise les essaie tous pendant 7 jours ; vous êtes prévenu avant chaque échéance. Pour activer ou prolonger un module, écrivez-nous.',
                link: { label: 'Voir mon abonnement', href: companySubscription().url },
                roles: ['company_admin'],
            },
        ],
    },
];

const hostessTopics = (): Topic[] => [
    {
        id: 'journee',
        title: 'Ma journée',
        icon: Sun,
        guides: [
            { question: 'Comment commencer ma journée ?', answer: 'Sur votre accueil, appuyez sur « Prendre mon service » une fois arrivée sur le point de vente. Votre position est enregistrée si vous l’autorisez.', link: { label: 'Mon accueil', href: terrainHome().url } },
            { question: 'Comment saisir mes ventes ?', answer: 'Ouvrez « Saisir mes ventes » et utilisez + et − pour chaque produit. Les montants se calculent seuls. Enregistrez le brouillon quand vous voulez.' },
            { question: 'Comment terminer ma journée ?', answer: 'Appuyez sur « Réviser », comptez ce qu’il reste de chaque produit (indiquez le motif s’il y a un écart), puis « Soumettre le rapport ». Terminez ensuite votre service.' },
            { question: 'Je me suis trompée après avoir soumis.', answer: 'Dans votre rapport, appuyez sur « Signaler une erreur » et expliquez-la : votre responsable peut corriger les quantités.' },
            { question: 'Comment joindre une photo ?', answer: 'Dans votre rapport, rubrique Photos : stand, rayon, rupture… jusqu’à 6 photos, réduites automatiquement pour partir vite.', module: 'photos' },
        ],
    },
    {
        id: 'reseau',
        title: 'Sans réseau',
        icon: WifiOff,
        guides: [
            { question: 'Et si je n’ai plus de réseau ?', answer: 'Continuez votre saisie : elle reste sur votre téléphone. Si vous soumettez sans réseau, le rapport partira tout seul au retour de la connexion. La prise de service, elle, a besoin de réseau.' },
        ],
    },
    {
        id: 'objectifs',
        title: 'Mes objectifs',
        icon: BarChart3,
        guides: [
            { question: 'Où voir mon objectif ?', answer: 'Sur votre accueil : l’objectif de la semaine et celui du mois, quand votre responsable en a fixé, avec ce qu’il vous reste à réaliser par jour.', link: { label: 'Mon accueil', href: terrainHome().url } },
        ],
    },
    {
        id: 'responsable',
        title: 'Mon responsable',
        icon: Smartphone,
        guides: [
            { question: 'Comment poser une question à mon responsable ?', answer: '« Tickets » : écrivez votre demande (urgente si besoin). Vous êtes prévenue sous la cloche dès qu’il répond.', link: { label: 'Mes tickets', href: terrainTickets().url }, module: 'demandes' },
        ],
    },
];

/** Thèmes et questions pour ce rôle, sans celles des modules que l'entreprise n'a pas. */
export function topicsFor(role: Role, modules: string[]): Topic[] {
    const topics = role === 'field_agent' ? hostessTopics() : managerTopics();
    // Sans rôle précisé : les rôles d'une entreprise (pas le super-admin)
    const defaults: Role[] = role === 'field_agent' ? ['field_agent'] : ['company_admin', 'supervisor', 'accountant'];

    return topics
        .map((t) => ({
            ...t,
            guides: t.guides.filter((g) => (!g.module || modules.includes(g.module)) && (g.roles ?? defaults).includes(role)),
        }))
        .filter((t) => t.guides.length > 0);
}
