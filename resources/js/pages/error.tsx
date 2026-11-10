import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Clock,
    FileQuestion,
    Hourglass,
    LayoutDashboard,
    LockKeyhole,
    RefreshCw,
    TriangleAlert,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MotriksLogo from '@/components/motriks-logo';
import { buttonClass } from '@/components/page/buttons';

type Props = {
    status: number;
    title: string;
    message: string;
    home: string;
    signed_in: boolean;
};

const ICONS: Record<number, { icon: LucideIcon; tone: string }> = {
    403: {
        icon: LockKeyhole,
        tone: 'bg-amber-50 text-amber-600 ring-amber-200/70',
    },
    404: {
        icon: FileQuestion,
        tone: 'bg-slate-100 text-slate-500 ring-slate-200',
    },
    419: { icon: Clock, tone: 'bg-sky-50 text-sky-600 ring-sky-200/70' },
    429: { icon: Hourglass, tone: 'bg-sky-50 text-sky-600 ring-sky-200/70' },
    503: {
        icon: Wrench,
        tone: 'bg-motriks-soft text-motriks-deep ring-green-200/70',
    },
};

/**
 * Page d'erreur de Motriks (App\Support\HttpErrors) : accès refusé, page introuvable, session expirée,
 * maintenance… Affichée seule, sans la barre latérale : elle doit marcher même si la session manque.
 */
export default function ErrorPage({
    status,
    title,
    message,
    home,
    signed_in,
}: Props) {
    const { icon: Icon, tone } = ICONS[status] ?? {
        icon: TriangleAlert,
        tone: 'bg-red-50 text-red-600 ring-red-200/70',
    };
    // Session expirée ou maintenance : recharger suffit le plus souvent
    const reload = status === 419 || status === 503;

    const back = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = home;
        }
    };

    return (
        <>
            <Head title={title} />

            <main className="flex min-h-svh flex-col items-center bg-slate-50 px-4 py-10 dark:bg-background">
                <Link href={home} aria-label="Motriks">
                    <MotriksLogo className="h-7" />
                </Link>

                <div className="flex w-full flex-1 items-center justify-center py-10">
                    <section className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm shadow-slate-900/[0.04] dark:border-sidebar-border dark:bg-card">
                        <span
                            className={`mx-auto flex size-14 items-center justify-center rounded-2xl ring-1 ${tone}`}
                        >
                            <Icon className="size-6" />
                        </span>
                        <p className="mt-5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Erreur {status}
                        </p>
                        <h1 className="mt-1 text-xl font-bold text-ink">
                            {title}
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {message}
                        </p>

                        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                            {reload ? (
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className={buttonClass('primary', 'md')}
                                >
                                    <RefreshCw />
                                    Recharger la page
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={back}
                                        className={buttonClass(
                                            'secondary',
                                            'md',
                                        )}
                                    >
                                        <ArrowLeft />
                                        Revenir en arrière
                                    </button>
                                    <Link
                                        href={home}
                                        className={buttonClass('primary', 'md')}
                                    >
                                        <LayoutDashboard />
                                        {signed_in ? 'Mon espace' : 'Accueil'}
                                    </Link>
                                </>
                            )}
                        </div>
                    </section>
                </div>

                <p className="text-center text-xs text-slate-400">
                    Besoin d’aide ? Écrivez au support depuis le centre d’aide
                    de l’application.
                </p>
            </main>
        </>
    );
}
