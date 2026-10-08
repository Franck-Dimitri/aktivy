import { Link } from '@inertiajs/react';
import AktivyLogo from '@/components/aktivy-logo';
import AuthShowcase from '@/components/auth/auth-showcase';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthShowcaseLayout({
    children,
    title,
    description,
    showcase = 'login',
    headerLink,
}: AuthLayoutProps) {
    return (
        <div className="theme-light min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(440px,1fr)]">
            <aside className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-dvh">
                <AuthShowcase key={showcase} name={showcase} />
            </aside>

            <main className="flex min-h-dvh flex-col">
                <div className="h-1.5 bg-aktivy lg:hidden" />

                <div className="flex flex-1 flex-col px-6 py-8 sm:px-10 lg:px-12">
                    <header className="flex items-center justify-between gap-4">
                        <Link
                            href={home()}
                            className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:outline-none"
                        >
                            <AktivyLogo />
                        </Link>

                        {headerLink && (
                            <p className="text-right text-sm text-slate-500">
                                <span className="hidden sm:inline lg:hidden 2xl:inline">
                                    {headerLink.text}{' '}
                                </span>
                                <Link
                                    href={headerLink.href}
                                    className="font-semibold whitespace-nowrap text-aktivy-deep underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                                >
                                    {headerLink.label}
                                </Link>
                            </p>
                        )}
                    </header>

                    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
                        <div className="mb-8">
                            <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance text-ink">
                                {title}
                            </h1>
                            {description && (
                                <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
                                    {description}
                                </p>
                            )}
                        </div>

                        {children}
                    </div>

                    <p className="text-xs text-slate-400">
                        © {new Date().getFullYear()} Aktivy
                    </p>
                </div>
            </main>
        </div>
    );
}
