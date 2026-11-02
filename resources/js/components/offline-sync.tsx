import { router, usePage } from '@inertiajs/react';
import { CloudUpload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { queuedReports, unqueueReport } from '@/lib/offline';

/**
 * Envoie les rapports soumis sans réseau dès que la connexion revient, depuis n'importe quelle
 * page de l'hôtesse. Un rapport ne quitte la file que si le serveur l'a accepté ou refusé :
 * une coupure ou une session expirée le laisse en attente.
 */
export function OfflineSync() {
    const { auth } = usePage().props;
    const sending = useRef(false);
    const [waiting, setWaiting] = useState(0);
    const userId = auth.user?.id;

    useEffect(() => {
        if (auth.user?.role !== 'field_agent') return;

        const flush = () => {
            const mine = queuedReports().filter((q) => q.userId === userId);
            setWaiting(mine.length);

            const next = mine[0];
            if (!next || sending.current || !navigator.onLine) return;

            sending.current = true;
            router.post(next.url, next.payload as never, {
                preserveScroll: true,
                onSuccess: (page) => {
                    // Session expirée : on atterrit sur la connexion, le rapport n'est pas parti
                    if (!(page.props as { auth?: { user?: unknown } }).auth?.user) return;

                    unqueueReport(next.reportId);
                    window.localStorage.removeItem(`motriks:rapport:${next.reportId}`);
                    toast.success('Rapport envoyé', { description: `${next.siteName} : votre rapport est bien parti.` });
                },
                onError: () => {
                    unqueueReport(next.reportId);
                    toast.error('Rapport à corriger', { description: `${next.siteName} : rouvrez le rapport, le serveur a refusé une valeur.` });
                },
                onNetworkError: () => false,
                onHttpException: () => {
                    toast.error('Rapport en attente', { description: 'Reconnectez-vous : il sera envoyé ensuite.' });

                    return false;
                },
                onFinish: () => {
                    sending.current = false;
                    setWaiting(queuedReports().filter((q) => q.userId === userId).length);
                },
            });
        };

        flush();
        window.addEventListener('online', flush);

        return () => window.removeEventListener('online', flush);
    }, [auth.user?.role, userId]);

    if (waiting === 0) return null;

    return (
        <div role="status" className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 md:mx-6">
            <CloudUpload className="size-4 shrink-0" />
            {waiting > 1 ? `${waiting} rapports attendent` : 'Un rapport attend'} le retour du réseau pour partir. Vous n’avez rien à refaire.
        </div>
    );
}
