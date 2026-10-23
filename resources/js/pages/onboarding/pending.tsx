import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Clock, Mail } from 'lucide-react';
import { logout } from '@/routes';

export default function OnboardingPending() {
    return (
        <>
            <Head title="Demande en cours d'examen" />

            <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                    <div className="flex size-16 items-center justify-center rounded-full bg-aktivy-soft ring-8 ring-aktivy/10">
                        <CheckCircle2 className="size-8 text-aktivy" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-amber-100 ring-2 ring-white">
                        <Clock className="size-3.5 text-amber-500" />
                    </div>
                </div>

                <h1 className="text-xl font-black text-ink">Demande reçue !</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Votre dossier est en cours d'examen par notre équipe.
                    Vous recevrez un e-mail dès que votre espace sera activé.
                </p>

                <div className="mt-8 w-full rounded-2xl bg-slate-50 px-5 py-4 text-left">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Ce qui se passe maintenant</p>
                    <ol className="flex flex-col gap-3">
                        {[
                            { icon: CheckCircle2, color: 'text-aktivy', label: 'Documents reçus', done: true },
                            { icon: Clock, color: 'text-amber-500', label: 'Vérification en cours (24–48h)', done: false },
                            { icon: Mail, color: 'text-blue-400', label: 'Notification par e-mail', done: false },
                        ].map(({ icon: Icon, color, label, done }) => (
                            <li key={label} className="flex items-center gap-3">
                                <Icon className={`size-4 shrink-0 ${color} ${done ? '' : 'opacity-40'}`} />
                                <span className={`text-sm ${done ? 'font-semibold text-ink' : 'text-slate-400'}`}>{label}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <Link
                    href={logout().url}
                    method="post"
                    as="button"
                    className="mt-8 text-sm font-semibold text-slate-400 hover:text-slate-600 transition"
                >
                    Se déconnecter
                </Link>
            </div>
        </>
    );
}

OnboardingPending.layout = {
    title: 'Demande en cours d\'examen',
    description: '',
    showcase: 'register',
};
