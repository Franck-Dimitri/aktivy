import type { ReactNode } from 'react';
import LegalLayout, { LEGAL_INFO as L, List, P, Strong, type LegalSection } from './legal-layout';

const SECTIONS: LegalSection[] = [
    {
        id: 'responsable',
        title: 'Qui est responsable de vos données',
        body: (
            <>
                <P>
                    {L.product} est édité par <Strong>{L.company}</Strong>, {L.address}. Cette politique s'applique conformément à la loi
                    n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel au Cameroun.
                </P>
                <List
                    items={[
                        <>
                            Pour les comptes, la facturation et notre site : <Strong>{L.company} est responsable du traitement</Strong>.
                        </>,
                        <>
                            Pour les données que l'entreprise cliente saisit sur ses équipes (activité, présences, photos) :{' '}
                            <Strong>l'entreprise cliente est responsable du traitement</Strong> et {L.product} agit pour son compte, comme
                            sous-traitant. Les employés qui souhaitent exercer leurs droits peuvent s'adresser à leur employeur ou à nous.
                        </>,
                    ]}
                />
            </>
        ),
    },
    {
        id: 'donnees',
        title: 'Données collectées',
        body: (
            <List
                items={[
                    <>
                        <Strong>Compte</Strong> : nom, prénom, téléphone, e-mail, fonction, rôle, mot de passe (stocké chiffré).
                    </>,
                    <>
                        <Strong>Entreprise</Strong> : raison sociale, logo, sites, produits, barèmes de primes.
                    </>,
                    <>
                        <Strong>Activité terrain</Strong> : ventes, stocks, clôtures journalières, rapports.
                    </>,
                    <>
                        <Strong>Présences</Strong> : plannings, heures de pointage, retards, absences et justificatifs.
                    </>,
                    <>
                        <Strong>Preuves terrain</Strong> : photos du stand, avec date, heure et position GPS au moment de la prise.
                    </>,
                    <>
                        <Strong>Rémunération variable</Strong> : primes et commissions calculées.
                    </>,
                    <>
                        <Strong>Paiement</Strong> : offre souscrite, montants, statut et référence de transaction. Aucun numéro de carte ni code
                        Mobile Money n'est conservé par {L.product}.
                    </>,
                    <>
                        <Strong>Données techniques</Strong> : adresse IP, type d'appareil, journaux de connexion et journal d'audit des actions
                        sensibles.
                    </>,
                ]}
            />
        ),
    },
    {
        id: 'finalites',
        title: 'Pourquoi nous les utilisons',
        body: (
            <List
                items={[
                    'fournir le service : saisie, calculs, tableaux de bord, rapports, alertes ;',
                    'gérer les comptes, les abonnements et la facturation ;',
                    'assurer la sécurité, prévenir la fraude et tracer les actions sensibles ;',
                    'envoyer les notifications que vous avez configurées (application, e-mail, SMS, WhatsApp) ;',
                    'produire les analyses d\'intelligence artificielle demandées par l\'entreprise cliente ;',
                    'répondre aux demandes d\'assistance ;',
                    'améliorer le produit à partir de statistiques d\'usage agrégées.',
                ]}
            />
        ),
    },
    {
        id: 'bases',
        title: 'Bases légales',
        body: (
            <List
                items={[
                    <>
                        <Strong>L'exécution du contrat</Strong> avec l'entreprise cliente, pour fournir le service.
                    </>,
                    <>
                        <Strong>Les obligations légales</Strong>, notamment comptables et fiscales.
                    </>,
                    <>
                        <Strong>L'intérêt légitime</Strong>, pour la sécurité de la plateforme et l'amélioration du produit.
                    </>,
                    <>
                        <Strong>Le consentement</Strong>, lorsqu'il est requis, par exemple pour l'accès à la position GPS du téléphone.
                    </>,
                ]}
            />
        ),
    },
    {
        id: 'ia',
        title: 'Intelligence artificielle',
        body: (
            <>
                <P>
                    Les fonctionnalités d'IA traitent uniquement les données de l'espace de l'entreprise concernée. Pour cela, certaines
                    données peuvent être transmises à {L.aiProvider}, qui agit comme sous-traitant.
                </P>
                <List
                    items={[
                        'Les données d\'une entreprise ne sont jamais utilisées pour répondre à une autre entreprise.',
                        'Nous ne vendons pas vos données et ne les utilisons pas pour entraîner des modèles d\'IA publics.',
                        'Aucune décision concernant une personne n\'est prise automatiquement : les résultats de l\'IA sont des aides à la décision.',
                    ]}
                />
            </>
        ),
    },
    {
        id: 'destinataires',
        title: 'Qui peut y accéder',
        body: (
            <>
                <P>
                    Au sein d'une entreprise cliente, chaque utilisateur ne voit que ce que son rôle autorise. Chaque entreprise dispose d'un
                    espace isolé des autres.
                </P>
                <P>Nos prestataires, liés par des engagements de confidentialité et de sécurité, peuvent y accéder pour leur mission :</P>
                <List
                    items={[
                        <>Hébergement : {L.hosting}</>,
                        <>Paiement : {L.paymentProvider}</>,
                        <>Intelligence artificielle : {L.aiProvider}</>,
                        'Envoi des e-mails, SMS et messages WhatsApp de notification.',
                    ]}
                />
                <P>Nous ne vendons ni ne louons aucune donnée personnelle. Nous ne les communiquons aux autorités que si la loi l'exige.</P>
            </>
        ),
    },
    {
        id: 'transferts',
        title: 'Transferts hors du Cameroun',
        body: (
            <P>
                Certains prestataires peuvent héberger ou traiter des données hors du Cameroun. Dans ce cas, nous encadrons ces transferts
                avec les garanties prévues par la loi et ne retenons que des prestataires offrant un niveau de protection suffisant.
            </P>
        ),
    },
    {
        id: 'conservation',
        title: 'Durée de conservation',
        body: (
            <List
                items={[
                    'Historique accessible : rapports des dernières 24 heures (offre gratuite), 12 mois (modules payants), 24 mois (Premium).',
                    'Après expiration d\'un abonnement : données conservées 90 jours, puis supprimées ou anonymisées.',
                    'Après fermeture d\'un espace : suppression sous 90 jours, sauf données de facturation conservées pour les durées comptables légales.',
                    'Journaux techniques et de sécurité : 12 mois maximum.',
                ]}
            />
        ),
    },
    {
        id: 'securite',
        title: 'Sécurité',
        body: (
            <List
                items={[
                    'connexions chiffrées (HTTPS) et mots de passe stockés chiffrés ;',
                    'espace isolé pour chaque entreprise et droits d\'accès par rôle ;',
                    'sauvegardes quotidiennes ;',
                    'journal d\'audit des actions sensibles ;',
                    'données hors-ligne stockées sur le téléphone jusqu\'à leur synchronisation, puis effacées de la file d\'attente.',
                ]}
            />
        ),
    },
    {
        id: 'droits',
        title: 'Vos droits',
        body: (
            <>
                <P>Vous disposez des droits suivants sur vos données personnelles :</P>
                <List
                    items={[
                        'accès et copie de vos données ;',
                        'rectification des données inexactes ;',
                        'suppression, dans les limites des obligations légales ;',
                        'opposition et limitation de certains traitements ;',
                        'retrait de votre consentement à tout moment (par exemple pour la géolocalisation) ;',
                        'portabilité : export de vos données dans un format lisible.',
                    ]}
                />
                <P>
                    Pour les exercer, écrivez à <Strong>{L.privacyEmail}</Strong>. Nous répondons dans un délai d'un mois. Si la réponse ne vous
                    satisfait pas, vous pouvez saisir l'autorité camerounaise de protection des données à caractère personnel.
                </P>
            </>
        ),
    },
    {
        id: 'cookies',
        title: 'Cookies et stockage local',
        body: (
            <P>
                Nous utilisons uniquement les cookies et le stockage local nécessaires au fonctionnement : maintien de la connexion, sécurité
                des formulaires et conservation des saisies hors-ligne. Nous n'utilisons aucun cookie publicitaire.
            </P>
        ),
    },
    {
        id: 'mineurs',
        title: 'Mineurs',
        body: (
            <P>
                Le service est destiné aux entreprises et à leurs collaborateurs majeurs. Il ne s'adresse pas aux personnes de moins de 18 ans.
            </P>
        ),
    },
    {
        id: 'modifications',
        title: 'Modifications',
        body: (
            <P>
                Cette politique peut évoluer. La date de dernière mise à jour figure en haut de la page. Toute modification importante est
                annoncée par e-mail ou dans l'application.
            </P>
        ),
    },
];

export default function Confidentialite({ paymentLogos }: { paymentLogos?: { name: string; url: string }[] }) {
    return (
        <LegalLayout
            title="Politique de confidentialité"
            metaDescription={`Comment ${L.product} collecte, utilise et protège les données personnelles.`}
            intro={
                <p>
                    Quelles données {L.product} traite, pourquoi, avec qui elles sont partagées, combien de temps elles sont conservées et
                    comment exercer vos droits.
                </p>
            }
            sections={SECTIONS}
            otherLink={{ href: '/conditions', label: "Conditions d'utilisation" }}
            paymentLogos={paymentLogos}
        />
    );
}

/* Pas de sidebar : la page s'affiche sans le layout de l'application */
Confidentialite.layout = (page: ReactNode) => page;