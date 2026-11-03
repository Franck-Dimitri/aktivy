import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronDown, LifeBuoy, Mail } from 'lucide-react';
import { Page, Panel } from '@/components/page/page';
import { contact, help as helpRoute } from '@/routes';

type Guide = { question: string; answer: string };

const hostess: Guide[] = [
    { question: 'Comment commencer ma journée ?', answer: 'Sur votre tableau de bord, appuyez sur « Prendre mon service » une fois arrivée sur le point de vente. Votre position est enregistrée si vous l’autorisez.' },
    { question: 'Comment saisir mes ventes ?', answer: 'Ouvrez « Saisir mes ventes » et utilisez + et − pour chaque produit. Les montants se calculent seuls. Enregistrez le brouillon quand vous voulez.' },
    { question: 'Comment terminer ma journée ?', answer: 'Appuyez sur « Réviser », comptez ce qu’il reste de chaque produit (indiquez le motif s’il y a un écart), puis « Soumettre le rapport ». Terminez ensuite votre service.' },
    { question: 'Et si je n’ai plus de réseau ?', answer: 'Continuez votre saisie : elle reste sur votre téléphone. Si vous soumettez sans réseau, le rapport partira tout seul au retour de la connexion. La prise de service, elle, a besoin de réseau.' },
    { question: 'Je me suis trompée après avoir soumis.', answer: 'Dans votre rapport, appuyez sur « Signaler une erreur » et expliquez-la : votre responsable peut corriger les quantités.' },
    { question: 'Comment joindre une photo ?', answer: 'Dans votre rapport, rubrique Photos : stand, rayon, rupture… jusqu’à 6 photos.' },
];

const manager: Guide[] = [
    { question: 'Par où commencer ?', answer: 'Suivez l’assistant « Bien démarrer » du tableau de bord : identité, points de vente, produits, hôtesses, affectations, stock. Vous pouvez importer vos listes Excel (menu Entreprise › Import).' },
    { question: 'Comment voir les rapports du jour ?', answer: '« Activité du jour » montre qui est en poste en direct. « Rapports journaliers » liste les rapports d’une date, avec ceux qui n’ont pas pointé.' },
    { question: 'Comment corriger puis valider un rapport ?', answer: 'Ouvrez le rapport, « Corriger » pour modifier les quantités (le stock suit), puis « Valider » : le rapport est alors figé.' },
    { question: 'Comment gérer le stock ?', answer: 'Sur la fiche d’un site, onglet Inventaire : « Réassort » pour une livraison, le crayon pour un inventaire. Chaque mouvement est tracé. Les produits sous leur seuil sont dans « Alertes de stock ».' },
    { question: 'Comment fixer des objectifs ?', answer: 'Dans « Ventes & objectifs » : objectif mensuel de l’entreprise, de chaque site et de chaque hôtesse. L’hôtesse voit le sien sur son téléphone.' },
    { question: 'Comment envoyer un rapport à une marque ?', answer: 'Bouton « PDF » sur un rapport journalier, ou « Synthèse PDF » dans « Ventes & objectifs » pour une période. Ils sont aux couleurs de votre entreprise.' },
    { question: 'Que voit un superviseur ?', answer: 'Uniquement les points de vente où il est affecté : leurs hôtesses, rapports, ventes, stocks et demandes.' },
];

function Guides({ title, items }: { title: string; items: Guide[] }) {
    return (
        <Panel title={title}>
            <div className="divide-y divide-slate-100">
                {items.map((g) => (
                    <details key={g.question} className="group px-5 py-3.5">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                            {g.question}
                            <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{g.answer}</p>
                    </details>
                ))}
            </div>
        </Panel>
    );
}

export default function HelpIndex() {
    const { auth } = usePage().props;
    const isHostess = auth.user.role === 'field_agent';

    return (
        <>
            <Head title="Aide" />

            <Page title="Centre d’aide" description="Les réponses aux questions les plus fréquentes.">
                <div className="flex flex-col gap-6">
                    <Guides title={isHostess ? 'Sur le terrain' : 'Piloter votre équipe'} items={isHostess ? hostess : manager} />

                    <Panel>
                        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <span className="flex size-9 items-center justify-center rounded-xl bg-motriks-soft text-motriks-deep">
                                    <LifeBuoy className="size-4" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-ink">Vous ne trouvez pas la réponse ?</p>
                                    <p className="text-sm text-slate-500">
                                        {isHostess ? 'Demandez à votre responsable avec « Tickets ».' : 'Écrivez-nous, nous répondons sous 24 h.'}
                                    </p>
                                </div>
                            </div>
                            {!isHostess && (
                                <Link href={contact().url} className="inline-flex items-center gap-2 text-sm font-semibold text-motriks-deep hover:underline">
                                    <Mail className="size-4" />
                                    Contacter le support
                                </Link>
                            )}
                        </div>
                    </Panel>
                </div>
            </Page>
        </>
    );
}

HelpIndex.layout = {
    breadcrumbs: [{ title: 'Aide', href: helpRoute().url }],
};
