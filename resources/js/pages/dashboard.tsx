import { Head, usePage } from '@inertiajs/react';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { StatusBadge } from '@/components/page/status-badge';
import { dashboard } from '@/routes';

const firstSteps = [
    {
        title: 'Personnaliser votre entreprise',
        text: 'Logo, couleur et coordonnées, repris sur vos rapports.',
    },
    {
        title: 'Ajouter votre équipe',
        text: 'Superviseurs, hôtesses et comptable, chacun avec son rôle.',
    },
    {
        title: 'Créer vos sites',
        text: 'Les magasins et points de vente où travaillent vos hôtesses.',
    },
    {
        title: 'Affecter vos hôtesses',
        text: 'Qui travaille où, à quelles dates et sur quel créneau.',
    },
];

export default function Dashboard() {
    const { auth } = usePage().props;
    const firstName = auth.user.name.split(' ')[0];
    const isAdmin = auth.user.role === 'company_admin';

    return (
        <>
            <Head title="Tableau de bord" />

            <Page
                title={`Bonjour ${firstName}`}
                description={
                    auth.company
                        ? `Voici l’activité de ${auth.company.name} aujourd’hui.`
                        : undefined
                }
            >
                {isAdmin && (
                    <Panel
                        title="Premiers pas"
                        description="Quatre étapes pour que votre équipe commence à saisir sur le terrain."
                    >
                        <ol className="divide-y divide-slate-100 dark:divide-sidebar-border">
                            {firstSteps.map((step, index) => (
                                <li
                                    key={step.title}
                                    className="flex items-center gap-4 px-5 py-4"
                                >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-sm font-bold text-slate-500 tabular-nums">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-ink dark:text-white">
                                            {step.title}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {step.text}
                                        </p>
                                    </div>
                                    <span className="hidden sm:block">
                                        <StatusBadge tone="neutral">
                                            Bientôt
                                        </StatusBadge>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </Panel>
                )}

                <Panel title="Activité du jour">
                    <EmptyState
                        icon={ClipboardList}
                        title="Aucune saisie pour l’instant"
                        description="Les ventes et les clôtures de vos hôtesses apparaîtront ici dès qu’elles prendront leur poste."
                    />
                </Panel>
            </Page>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Tableau de bord',
            href: dashboard(),
        },
    ],
};
