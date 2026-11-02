import { Head, Link } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { Page, Panel } from '@/components/page/page';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes/admin';
import { index as companiesIndex } from '@/routes/admin/companies';
import { index as onboardingIndex } from '@/routes/admin/onboarding';

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
                        title="Vos entreprises clientes"
                        description="Suivez les inscriptions, suspendez ou réactivez un espace client."
                        action={
                            <div className="flex flex-wrap justify-center gap-2">
                                <Button asChild>
                                    <Link href={companiesIndex()}>Voir les entreprises</Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href={onboardingIndex()}>Traiter les demandes d’inscription</Link>
                                </Button>
                            </div>
                        }
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
