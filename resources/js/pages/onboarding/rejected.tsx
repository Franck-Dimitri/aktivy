import { Head, Link } from '@inertiajs/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logout } from '@/routes';
import { show as onboardingShow } from '@/routes/onboarding';

type Props = { rejection_reason?: string | null };

export default function OnboardingRejected({ rejection_reason }: Props) {
    const reason = rejection_reason;

    return (
        <>
            <Head title="Demande non approuvée" />

            <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-500/10">
                    <AlertCircle className="size-8 text-red-500" />
                </div>

                <h1 className="text-xl font-black text-ink">Demande non approuvée</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Votre dossier n'a pas pu être validé en l'état.
                </p>

                {reason && (
                    <div className="mt-6 w-full rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-left">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-red-400">Motif du refus</p>
                        <p className="text-sm leading-relaxed text-red-700">{reason}</p>
                    </div>
                )}

                <div className="mt-8 flex w-full flex-col gap-3">
                    <Link
                        href={onboardingShow().url}
                        className="flex items-center justify-center gap-2 rounded-xl bg-aktivy px-5 py-3 text-sm font-bold text-white transition hover:bg-aktivy/90"
                    >
                        <RefreshCw className="size-4" />
                        Soumettre un nouveau dossier
                    </Link>
                    <Link
                        href={logout().url}
                        method="post"
                        as="button"
                        className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition"
                    >
                        Se déconnecter
                    </Link>
                </div>
            </div>
        </>
    );
}

OnboardingRejected.layout = {
    title: 'Demande non approuvée',
    description: '',
    showcase: 'register',
};
