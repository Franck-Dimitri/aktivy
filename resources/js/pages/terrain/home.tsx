import { Head, usePage } from '@inertiajs/react';

export default function TerrainHome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Ma journée" />
            <div className="flex flex-col gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">Bonjour,</p>
                    <h1 className="text-2xl font-semibold">{auth.user.name}</h1>
                </div>
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Votre prise de service et votre saisie du jour apparaîtront
                    ici.
                </div>
            </div>
        </>
    );
}
