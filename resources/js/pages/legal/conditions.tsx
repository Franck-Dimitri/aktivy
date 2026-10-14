import type { ReactNode } from 'react';
import LegalLayout, { LEGAL_INFO as L, List, P, Strong, type LegalSection } from './legal-layout';

const SECTIONS: LegalSection[] = [
    {
        id: 'editeur',
        title: 'Éditeur du service',
        body: (
            <>
                <P>
                    {L.product} est édité par <Strong>{L.company}</Strong>, {L.legalForm}, immatriculée au RCCM sous le numéro {L.rccm},
                    NIU {L.niu}, dont le siège est situé {L.address}.
                </P>
                <P>Contact : {L.email}. Hébergement : {L.hosting}.</P>
            </>
        ),
    },
    {
        id: 'objet',
        title: 'Objet et acceptation',
        body: (
            <>
                <P>
                    Les présentes conditions encadrent l'accès et l'utilisation de la plateforme {L.product}, accessible sur {L.website} et
                    sous forme d'application web installable.
                </P>
                <P>
                    En créant un compte ou en utilisant le service, l'entreprise cliente (« le Client ») et chacun de ses utilisateurs
                    acceptent ces conditions sans réserve. La personne qui crée l'espace déclare avoir le pouvoir d'engager l'entreprise.
                </P>
            </>
        ),
    },
    {
        id: 'service',
        title: 'Description du service',
        body: (
            <>
                <P>{L.product} permet aux entreprises de piloter leurs équipes terrain, notamment :</P>
                <List
                    items={[
                        'la saisie de l\'activité journalière (ventes, stocks, clôtures), y compris hors connexion ;',
                        'le suivi des présences, plannings et pointages ;',
                        'la gestion des stocks, réassorts et bons de commande ;',
                        'la génération de rapports et documents (PDF, Excel) ;',
                        'le calcul des primes et commissions selon les barèmes définis par le Client ;',
                        'des alertes et une messagerie interne ;',
                        'des fonctionnalités d\'intelligence artificielle (synthèses, détection d\'anomalies, prévisions, assistant).',
                    ]}
                />
                <P>Les fonctionnalités disponibles dépendent de l'offre et des modules activés par le Client.</P>
            </>
        ),
    },
    {
        id: 'comptes',
        title: 'Comptes et accès',
        body: (
            <>
                <P>
                    Le Client crée son espace entreprise et invite ses utilisateurs. Il attribue les rôles et les droits d'accès, et reste
                    responsable des personnes à qui il donne accès.
                </P>
                <List
                    items={[
                        'Les identifiants sont personnels et confidentiels.',
                        'Toute action réalisée avec un identifiant est réputée effectuée par son titulaire.',
                        'Le Client signale sans délai toute utilisation non autorisée à ' + L.email + '.',
                    ]}
                />
            </>
        ),
    },
    {
        id: 'offres',
        title: 'Offres, essai et paiement',
        body: (
            <>
                <List
                    items={[
                        <>
                            <Strong>Offre gratuite</Strong> : sans engagement, avec les limites indiquées sur la page Tarifs, notamment un
                            accès limité aux rapports des dernières 24 heures et un nombre d'utilisateurs plafonné.
                        </>,
                        <>
                            <Strong>Modules payants</Strong> : activables à l'unité, avec un essai gratuit de 7 jours sans carte bancaire.
                        </>,
                        <>
                            <Strong>Premium</Strong> : proposé uniquement en abonnement annuel.
                        </>,
                    ]}
                />
                <P>
                    Les prix sont indiqués en francs CFA (FCFA) sur la page Tarifs. Le paiement s'effectue par Mobile Money ou par carte
                    bancaire, via {L.paymentProvider}. {L.product} ne conserve aucune donnée de carte bancaire ni code Mobile Money.
                </P>
                <P>
                    Les abonnements sont payables d'avance. Sauf disposition légale contraire, une période entamée n'est pas remboursée. Toute
                    évolution tarifaire est annoncée au moins 30 jours avant son application.
                </P>
            </>
        ),
    },
    {
        id: 'expiration',
        title: 'Fin d\'abonnement et résiliation',
        body: (
            <>
                <P>
                    À l'expiration d'un abonnement non renouvelé, l'espace repasse automatiquement sur l'offre gratuite. Les données liées aux
                    modules payants sont conservées 90 jours, pour laisser au Client le temps de renouveler ou d'exporter ses données.
                </P>
                <P>
                    Le Client peut fermer son espace à tout moment. {L.product} peut suspendre ou fermer un compte en cas de manquement grave
                    aux présentes conditions, après mise en demeure restée sans effet, sauf urgence (fraude, atteinte à la sécurité).
                </P>
            </>
        ),
    },
    {
        id: 'donnees',
        title: 'Données du Client',
        body: (
            <>
                <P>
                    Le Client reste propriétaire des données qu'il saisit dans la plateforme (activité, stocks, personnel, photos, documents).
                    Il peut les exporter à tout moment.
                </P>
                <P>
                    Pour les données personnelles de ses employés et collaborateurs, le Client agit en tant que responsable du traitement et{' '}
                    {L.product} en tant que sous-traitant, au sens de la loi n° 2024/017 du 23 décembre 2024 relative à la protection des
                    données à caractère personnel au Cameroun. Le Client s'engage notamment à informer ses équipes de l'utilisation de la
                    plateforme, du pointage et de la géolocalisation des photos terrain. Le détail figure dans la Politique de
                    confidentialité.
                </P>
            </>
        ),
    },
    {
        id: 'ia',
        title: 'Intelligence artificielle',
        body: (
            <>
                <P>
                    Les synthèses, alertes, prévisions et réponses de l'assistant sont produites automatiquement à partir des données du
                    Client. Elles indiquent les données sur lesquelles elles reposent, mais peuvent comporter des erreurs ou des
                    approximations.
                </P>
                <P>
                    Elles constituent une aide à la décision : les décisions restent celles du Client, en particulier celles qui concernent
                    les personnes (sanctions, paie, rupture de contrat). Le Client vérifie les informations importantes avant d'agir.
                </P>
            </>
        ),
    },
    {
        id: 'usage',
        title: 'Usages interdits',
        body: (
            <List
                items={[
                    'utiliser le service à des fins illégales ou frauduleuses ;',
                    'saisir des données fausses dans le but de tromper un tiers ;',
                    'tenter d\'accéder aux espaces d\'autres entreprises ou de contourner les mesures de sécurité ;',
                    'perturber le fonctionnement de la plateforme (surcharge, extraction automatisée massive, code malveillant) ;',
                    'revendre ou mettre le service à disposition de tiers sans accord écrit.',
                ]}
            />
        ),
    },
    {
        id: 'disponibilite',
        title: 'Disponibilité et responsabilité',
        body: (
            <>
                <P>
                    {L.product} met en œuvre les moyens raisonnables pour assurer un accès continu au service, des sauvegardes quotidiennes et
                    la sécurité des données. Des interruptions peuvent survenir pour maintenance, en cas de panne ou de problème réseau
                    indépendant de notre volonté.
                </P>
                <P>
                    {L.product} n'est pas responsable des dommages indirects (perte de chiffre d'affaires, de clientèle ou d'opportunité),
                    ni des conséquences de données erronées saisies par le Client ou ses utilisateurs. Dans tous les cas, la responsabilité de{' '}
                    {L.product} est limitée aux sommes payées par le Client au cours des 12 derniers mois.
                </P>
            </>
        ),
    },
    {
        id: 'propriete',
        title: 'Propriété intellectuelle',
        body: (
            <P>
                La plateforme, son code, son design, ses marques et ses contenus appartiennent à {L.company}. Le Client bénéficie d'un droit
                d'utilisation personnel et non exclusif pendant la durée de son compte. Le logo et les couleurs que le Client ajoute à son
                espace restent sa propriété.
            </P>
        ),
    },
    {
        id: 'modifications',
        title: 'Modification des conditions',
        body: (
            <P>
                Ces conditions peuvent évoluer. Toute modification importante est annoncée par e-mail ou dans l'application au moins 30 jours
                avant son entrée en vigueur. Continuer à utiliser le service après cette date vaut acceptation.
            </P>
        ),
    },
    {
        id: 'droit',
        title: 'Droit applicable et litiges',
        body: (
            <P>
                Les présentes conditions sont soumises au droit camerounais. En cas de litige, les parties recherchent d'abord une solution
                amiable. À défaut, le litige est porté devant les juridictions compétentes de {L.city}.
            </P>
        ),
    },
];

export default function Conditions() {
    return (
        <LegalLayout
            title="Conditions d'utilisation"
            metaDescription={`Conditions générales d'utilisation de la plateforme ${L.product}.`}
            intro={
                <p>
                    Les règles qui encadrent l'utilisation de {L.product} par votre entreprise et vos équipes : ce que nous fournissons, ce que
                    vous pouvez en attendre et vos engagements.
                </p>
            }
            sections={SECTIONS}
            otherLink={{ href: '/confidentialite', label: 'Politique de confidentialité' }}
        />
    );
}

/* Pas de sidebar : la page s'affiche sans le layout de l'application */
Conditions.layout = (page: ReactNode) => page;