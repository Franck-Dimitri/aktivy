import {
    Briefcase,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    KeyRound,
    LogIn,
    Phone,
    Shield,
    Smartphone,
    Sparkles,
    UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface DevAccount {
    id: string;
    name: string;
    roleLabel: string;
    roleType: 'admin' | 'manager' | 'agent' | 'staff';
    company: string;
    login: string;
    phone?: string;
    password: string;
    description: string;
    isPrimary?: boolean;
}

export const DEV_ACCOUNTS: DevAccount[] = [
    {
        id: 'franck-admin',
        name: 'Franck Dimitri',
        roleLabel: "Responsable d'entreprise",
        roleType: 'manager',
        company: 'Bennett Lynn Trading',
        login: 'franckdimitrio000@gmail.com',
        password: 'franckdimitrio000@gmail.com',
        description: 'Accès gestion entreprise, équipes, produits, sites & rapports',
        isPrimary: true,
    },
    {
        id: 'franck-hotesse',
        name: 'Franck Dimitri',
        roleLabel: 'Hôtesse de terrain',
        roleType: 'agent',
        company: 'Bennett Lynn Trading',
        login: 'franckdimitrio009@gmail.com',
        phone: '+237676383986',
        password: 'Lapersonne2020',
        description: 'Espace mobile hôtesse : ventes, stocks, rapports terrain',
        isPrimary: true,
    },
    {
        id: 'super-admin',
        name: 'Super Administrateur',
        roleLabel: 'Super Admin',
        roleType: 'admin',
        company: 'Plateforme Motriks',
        login: 'admin@aktivy.test',
        password: 'password',
        description: 'Administration globale du système Motriks',
        isPrimary: false,
    },
    {
        id: 'demo-gerant',
        name: 'Gérant Démo',
        roleLabel: 'Gérant Démo',
        roleType: 'manager',
        company: 'Démo Distribution',
        login: 'gerant@demo.test',
        password: 'password',
        description: 'Compte gérant de test sur Démo Distribution',
        isPrimary: false,
    },
    {
        id: 'demo-superviseur',
        name: 'Superviseur Démo',
        roleLabel: 'Superviseur',
        roleType: 'staff',
        company: 'Démo Distribution',
        login: 'superviseur@demo.test',
        password: 'password',
        description: 'Supervision des équipes terrain et validation rapports',
        isPrimary: false,
    },
    {
        id: 'demo-hotesse',
        name: 'Hôtesse Démo',
        roleLabel: 'Hôtesse',
        roleType: 'agent',
        company: 'Démo Distribution',
        login: '+237690000001',
        password: 'password',
        description: 'Connexion directe par téléphone terrain',
        isPrimary: false,
    },
    {
        id: 'demo-comptable',
        name: 'Comptable Démo',
        roleLabel: 'Comptable',
        roleType: 'staff',
        company: 'Démo Distribution',
        login: 'comptable@demo.test',
        password: 'password',
        description: 'Suivi financier et export des écritures',
        isPrimary: false,
    },
];

type Props = {
    onSelectAccount: (login: string, password: string, autoSubmit?: boolean) => void;
    currentLogin?: string;
};

export default function DevTestAccounts({
    onSelectAccount,
    currentLogin,
}: Props) {
    const [isOpen, setIsOpen] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        }
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSelect = (account: DevAccount, usePhone = false, autoSubmit = false) => {
        const loginVal = usePhone && account.phone ? account.phone : account.login;
        setSelectedId(account.id);
        onSelectAccount(loginVal, account.password, autoSubmit);
    };

    const primaryAccounts = DEV_ACCOUNTS.filter((acc) => acc.isPrimary);
    const otherAccounts = DEV_ACCOUNTS.filter((acc) => !acc.isPrimary);

    return (
        <section
            aria-label="Comptes de test"
            className="mb-6 overflow-hidden rounded-2xl border border-aktivy/30 bg-gradient-to-b from-aktivy/5 via-slate-50/50 to-white shadow-sm transition-all duration-200"
        >
            {/* Header bar */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/70 px-4 py-2.5 backdrop-blur-xs">
                <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-aktivy/20 text-aktivy-deep">
                        <Sparkles className="size-3.5" />
                    </span>
                    <span className="text-xs font-bold tracking-tight text-ink uppercase">
                        Comptes de test (Mode Dev)
                    </span>
                    <span className="rounded-full bg-aktivy/15 px-2 py-0.5 text-[10px] font-bold text-aktivy-deep">
                        1-clic
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-ink focus-visible:outline-none"
                    title={isOpen ? 'Replier le panneau' : 'Déplier le panneau'}
                >
                    <span>{isOpen ? 'Masquer' : 'Afficher'}</span>
                    {isOpen ? (
                        <ChevronUp className="size-3.5" />
                    ) : (
                        <ChevronDown className="size-3.5" />
                    )}
                </button>
            </div>

            {isOpen && (
                <div className="space-y-3 p-3.5">
                    <p className="text-[12px] leading-relaxed text-slate-600">
                        Cliquez sur un compte pour remplir automatiquement les champs ou lancez la connexion directement.
                    </p>

                    {/* Primary Dev Accounts (Franck Dimitri accounts) */}
                    <div className="grid gap-2.5">
                        {primaryAccounts.map((account) => {
                            const isSelected =
                                selectedId === account.id ||
                                (currentLogin &&
                                    (currentLogin === account.login ||
                                        (account.phone &&
                                            currentLogin === account.phone)));

                            return (
                                <div
                                    key={account.id}
                                    onClick={() => handleSelect(account, false, false)}
                                    className={cn(
                                        'group relative cursor-pointer rounded-xl border p-3 transition-all duration-150',
                                        isSelected
                                            ? 'border-aktivy bg-white shadow-md ring-2 ring-aktivy/20'
                                            : 'border-slate-200/90 bg-white hover:border-aktivy/60 hover:bg-slate-50/50 hover:shadow-xs',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="truncate text-xs font-bold text-ink">
                                                    {account.name}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                                                        account.roleType === 'manager'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-purple-100 text-purple-800',
                                                    )}
                                                >
                                                    {account.roleType === 'manager' ? (
                                                        <Briefcase className="mr-1 size-2.5" />
                                                    ) : (
                                                        <Smartphone className="mr-1 size-2.5" />
                                                    )}
                                                    {account.roleLabel}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    • {account.company}
                                                </span>
                                            </div>

                                            {/* Credentials details */}
                                            <div className="mt-2 space-y-1 text-[11px]">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="text-slate-500">
                                                        Identifiant :
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-800 select-all">
                                                            {account.login}
                                                        </code>
                                                        <button
                                                            type="button"
                                                            onClick={(e) =>
                                                                handleCopy(
                                                                    account.login,
                                                                    `${account.id}-login`,
                                                                    e,
                                                                )
                                                            }
                                                            className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-ink"
                                                            title="Copier l'identifiant"
                                                        >
                                                            {copiedId ===
                                                            `${account.id}-login` ? (
                                                                <Check className="size-3 text-aktivy-deep" />
                                                            ) : (
                                                                <Copy className="size-3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                {account.phone && (
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-slate-500">
                                                            Tél (terrain) :
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-800 select-all">
                                                                {account.phone}
                                                            </code>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelect(account, true, false);
                                                                }}
                                                                className="cursor-pointer rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 hover:bg-purple-100"
                                                                title="Utiliser le numéro de téléphone pour la connexion"
                                                            >
                                                                Par tél
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="text-slate-500">
                                                        Mot de passe :
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <code className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-900 select-all">
                                                            {account.password}
                                                        </code>
                                                        <button
                                                            type="button"
                                                            onClick={(e) =>
                                                                handleCopy(
                                                                    account.password,
                                                                    `${account.id}-pass`,
                                                                    e,
                                                                )
                                                            }
                                                            className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-ink"
                                                            title="Copier le mot de passe"
                                                        >
                                                            {copiedId ===
                                                            `${account.id}-pass` ? (
                                                                <Check className="size-3 text-aktivy-deep" />
                                                            ) : (
                                                                <Copy className="size-3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons inside card */}
                                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                                        <span className="text-[10px] text-slate-400">
                                            {account.description}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(account, false, false);
                                                }}
                                                className="cursor-pointer rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
                                            >
                                                Remplir
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(account, false, true);
                                                }}
                                                className="flex cursor-pointer items-center gap-1 rounded-lg bg-aktivy px-2.5 py-1 text-[11px] font-bold text-ink shadow-xs transition-colors hover:bg-[#46b52b] active:scale-95"
                                            >
                                                <LogIn className="size-3" />
                                                Connexion
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Collapsible toggle for other accounts (Super Admin, Demo accounts) */}
                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={() => setShowAll(!showAll)}
                            className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
                        >
                            <span className="flex items-center gap-1.5">
                                <KeyRound className="size-3.5 text-slate-400" />
                                {showAll
                                    ? 'Masquer les autres comptes de démo'
                                    : 'Voir les autres comptes de démo (Super Admin, Démo...)'}
                            </span>
                            {showAll ? (
                                <ChevronUp className="size-3.5" />
                            ) : (
                                <ChevronDown className="size-3.5" />
                            )}
                        </button>

                        {showAll && (
                            <div className="mt-2 space-y-2 border-t border-slate-200/60 pt-2">
                                {otherAccounts.map((account) => {
                                    const isSelected =
                                        selectedId === account.id ||
                                        (currentLogin &&
                                            currentLogin === account.login);

                                    return (
                                        <div
                                            key={account.id}
                                            onClick={() =>
                                                handleSelect(account, false, false)
                                            }
                                            className={cn(
                                                'flex cursor-pointer items-center justify-between rounded-lg border p-2 text-[11px] transition-all',
                                                isSelected
                                                    ? 'border-aktivy bg-white ring-1 ring-aktivy'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50',
                                            )}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-ink">
                                                        {account.name}
                                                    </span>
                                                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600">
                                                        {account.roleLabel}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 truncate text-[10px] text-slate-500">
                                                    <code>{account.login}</code> • mdp:{' '}
                                                    <code className="text-amber-800">
                                                        {account.password}
                                                    </code>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelect(
                                                            account,
                                                            false,
                                                            false,
                                                        );
                                                    }}
                                                    className="cursor-pointer rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
                                                >
                                                    Remplir
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelect(
                                                            account,
                                                            false,
                                                            true,
                                                        );
                                                    }}
                                                    className="flex cursor-pointer items-center gap-0.5 rounded bg-aktivy px-2 py-1 text-[10px] font-bold text-ink hover:bg-[#46b52b]"
                                                >
                                                    <LogIn className="size-2.5" />
                                                    Go
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
