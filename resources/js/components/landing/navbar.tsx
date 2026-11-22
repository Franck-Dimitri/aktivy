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
        <header className="fixed inset-x-0 top-0 z-50">
            <div
                className={`relative mx-auto flex max-w-7xl items-center justify-between border-b px-4 backdrop-blur-xl transition-[background-color,box-shadow,border-color,padding] duration-300 sm:px-6 lg:px-8 ${
                    scrolled
                        ? 'border-slate-200 bg-white/95 py-2.5'
                        : 'border-transparent bg-white/80 py-4'
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
                                className={`border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap transition ${
                                    isActive
                                        ? 'border-green-700 text-slate-900'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {l.label}
                            </a>
                        );
                    })}
                    <Link
                        href="/contact"
                        className="border-b-2 border-transparent px-3 py-2 text-sm font-semibold whitespace-nowrap text-slate-600 transition hover:text-slate-900"
                    >
                        Contact
                    </Link>
                </nav>

                <AuthNavActions />

                <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:border-slate-900 xl:hidden"
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
                    <div className="absolute inset-x-0 top-full border-b border-slate-200 bg-white p-4 shadow-2xl xl:hidden">
                        <nav className="flex flex-col">
                            {NAV_LINKS.map((l) => (
                                <a
                                    key={l.href}
                                    href={l.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:text-green-700"
                                >
                                    {l.label}
                                </a>
                            ))}
                            <Link
                                href="/contact"
                                className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:text-green-700"
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
