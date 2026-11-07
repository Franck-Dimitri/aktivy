import { LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Compte de démonstration, fourni par le serveur en local uniquement (App\Support\Demo\DemoAccounts). */
export type DevAccount = {
    id: string;
    name: string;
    role: string;
    company: string | null;
    login: string;
    password: string;
    description: string;
};

/**
 * Comptes de test (environnement local) : un clic remplit le formulaire, « Entrer » connecte directement.
 * Aucun identifiant n'est écrit ici : la liste arrive du serveur, et seulement en local.
 */
export default function DevTestAccounts({
    accounts,
    currentLogin,
    onSelectAccount,
}: {
    accounts: DevAccount[];
    currentLogin?: string;
    onSelectAccount: (login: string, password: string, autoSubmit?: boolean) => void;
}) {
    return (
        <section aria-label="Comptes de test" className="flex flex-col gap-1">
            <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Comptes de test · mot de passe « password »</p>
            {accounts.map((a) => {
                const selected = currentLogin === a.login;
                return (
                    <div
                        key={a.id}
                        className={cn('group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors', selected ? 'bg-motriks-soft' : 'hover:bg-slate-50')}
                    >
                        <button type="button" onClick={() => onSelectAccount(a.login, a.password)} className="min-w-0 flex-1 cursor-pointer text-left">
                            <p className="truncate text-sm font-semibold text-ink">
                                {a.name}
                                <span className="ml-1.5 text-xs font-medium text-motriks-deep">{a.role}</span>
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                {a.login}
                                {a.company && ` · ${a.company}`}
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => onSelectAccount(a.login, a.password, true)}
                            aria-label={`Se connecter en tant que ${a.name}`}
                            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-motriks px-2.5 text-xs font-semibold text-white transition-colors hover:bg-motriks-deep"
                        >
                            <LogIn className="size-3.5" />
                            Entrer
                        </button>
                    </div>
                );
            })}
        </section>
    );
}
