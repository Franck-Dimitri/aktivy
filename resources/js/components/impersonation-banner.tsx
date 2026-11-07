import { router, usePage } from '@inertiajs/react';
import { Eye, LogOut } from 'lucide-react';
import { stop as impersonationStop } from '@/routes/impersonation';

/**
 * Bandeau affiché sur chaque page quand le super administrateur est connecté « en tant que »
 * un gérant : il sait toujours dans quel compte il agit, et revient à l'administration en un clic.
 */
export function ImpersonationBanner() {
    const { auth } = usePage().props;

    if (!auth.impersonator) return null;

    return (
        <div
            role="status"
            className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 md:mx-6 dark:border-violet-500/30 dark:bg-violet-500/10"
        >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                <Eye className="size-4" />
            </span>
            <p className="min-w-0 flex-1 text-sm text-violet-900 dark:text-violet-100">
                <strong>Connexion « en tant que » {auth.user.name}</strong>
                {auth.company ? ` · ${auth.company.name}` : ''}. Vos actions
                sont enregistrées à votre nom ({auth.impersonator.name}) dans le
                journal.
            </p>
            <button
                type="button"
                onClick={() => router.post(impersonationStop().url)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
            >
                <LogOut className="size-3.5" />
                Revenir à l’administration
            </button>
        </div>
    );
}
