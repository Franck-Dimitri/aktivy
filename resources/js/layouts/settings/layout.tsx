import { Link } from '@inertiajs/react';
import { ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Page } from '@/components/page/page';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

type Item = { title: string; hint: string; href: ReturnType<typeof edit>; icon: LucideIcon };

const items: Item[] = [
    { title: 'Profil', hint: 'Nom et coordonnées', href: edit(), icon: UserRound },
    { title: 'Sécurité', hint: 'Mot de passe et connexion', href: editSecurity(), icon: ShieldCheck },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <Page title="Mon compte" description="Vos informations personnelles et la sécurité de votre accès.">
            <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
                <nav aria-label="Mon compte" className="lg:sticky lg:top-20">
                    {/* Téléphone : deux onglets côte à côte */}
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100/80 p-1 lg:hidden dark:bg-white/5">
                        {items.map((item) => {
                            const active = isCurrentOrParentUrl(item.href);
                            return (
                                <Link
                                    key={toUrl(item.href)}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors',
                                        active ? 'bg-white text-ink shadow-sm dark:bg-card' : 'text-slate-500 hover:text-ink',
                                    )}
                                >
                                    <item.icon className={cn('size-4', active ? 'text-motriks' : 'text-slate-400')} />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Ordinateur : colonne avec une ligne d'aide par rubrique */}
                    <ul className="hidden flex-col gap-1 lg:flex">
                        {items.map((item) => {
                            const active = isCurrentOrParentUrl(item.href);
                            return (
                                <li key={toUrl(item.href)}>
                                    <Link
                                        href={item.href}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                                            active ? 'bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-card dark:ring-sidebar-border' : 'hover:bg-slate-100/80 dark:hover:bg-white/5',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                                                active ? 'bg-motriks-soft text-motriks-deep' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600 dark:bg-white/5',
                                            )}
                                        >
                                            <item.icon className="size-4" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className={cn('block text-sm font-medium', active ? 'text-ink' : 'text-slate-600')}>{item.title}</span>
                                            <span className="block truncate text-xs text-slate-400">{item.hint}</span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="flex min-w-0 flex-col gap-6">{children}</div>
            </div>
        </Page>
    );
}
