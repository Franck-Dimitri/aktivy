import { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    AuthMobileActions,
    AuthNavActions,
} from '@/components/landing/auth-actions';
import { NAV_LINKS } from '@/components/landing/content';
import { Logo } from '@/components/landing/primitives';

/* Barre de navigation flottante : se densifie au défilement et suit la section visible */
export function LandingNavbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [active, setActive] = useState('');

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        setActive(e.target.id);
                    }
                });
            },
            { rootMargin: '-40% 0px -55% 0px' },
        );
        NAV_LINKS.forEach((l) => {
            const el = document.getElementById(l.href.slice(1));
            if (el) {
                observer.observe(el);
            }
        });
        return () => observer.disconnect();
    }, []);

    return (
        <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
            <div
                className={`relative mx-auto flex max-w-6xl items-center justify-between rounded-full border px-2.5 backdrop-blur-xl transition-[background-color,box-shadow,border-color,padding] duration-300 ${
                    scrolled
                        ? 'border-slate-200/80 bg-white/90 py-1.5 shadow-xl shadow-slate-900/[0.08]'
                        : 'border-white/70 bg-white/60 py-2 shadow-lg shadow-green-900/5'
                }`}
            >
                <div className="pl-2">
                    <Logo />
                </div>

                <nav className="hidden items-center gap-0.5 xl:flex">
                    {NAV_LINKS.map((l) => {
                        const isActive = active === l.href.slice(1);
                        return (
                            <a
                                key={l.href}
                                href={l.href}
                                className={`rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                                    isActive
                                        ? 'bg-green-50 text-green-700'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                {l.label}
                            </a>
                        );
                    })}
                    <Link
                        href="/contact"
                        className="rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                        Contact
                    </Link>
                </nav>

                <AuthNavActions />

                <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="rounded-full bg-slate-100 p-2.5 text-slate-700 transition hover:bg-slate-200 xl:hidden"
                    aria-label="Ouvrir le menu"
                >
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        viewBox="0 0 24 24"
                    >
                        {menuOpen ? (
                            <path d="M6 6l12 12M18 6L6 18" />
                        ) : (
                            <path d="M4 7h16M4 12h16M4 17h16" />
                        )}
                    </svg>
                </button>

                {menuOpen && (
                    <div className="absolute inset-x-0 top-full mt-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl xl:hidden">
                        <nav className="flex flex-col">
                            {NAV_LINKS.map((l) => (
                                <a
                                    key={l.href}
                                    href={l.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-700"
                                >
                                    {l.label}
                                </a>
                            ))}
                            <Link
                                href="/contact"
                                className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-700"
                            >
                                Contact
                            </Link>
                        </nav>
                        <AuthMobileActions />
                    </div>
                )}
            </div>
        </header>
    );
}
