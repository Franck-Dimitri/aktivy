import { Head } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { dashboard } from '@/routes/admin';

export default function AdminDashboard() {
    return (
        <>
            <Head title="Administration" />

            <Page
                title="Administration de la plateforme"
                description="Entreprises clientes, abonnements et supervision."
            >
                <Panel title="Entreprises clientes">
                    <EmptyState
                        icon={Building2}
                        title="La liste des entreprises arrive bientôt"
                        description="Vous pourrez y suivre les inscriptions, suspendre ou réactiver un espace client."
                    />
                </Panel>
            </Page>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Administration',
            href: dashboard(),
        },
    ],
};
