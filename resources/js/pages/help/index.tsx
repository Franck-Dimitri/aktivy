import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, ChevronDown, Mail, MessageCircle, MessageSquarePlus, Search, Send, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { ActionButton, buttonClass } from '@/components/page/buttons';
import { cn } from '@/lib/utils';
import { help as helpRoute } from '@/routes';
import { index as terrainTickets } from '@/routes/terrain/tickets';
import { topicsFor, type Guide } from './guides';
import { SupportModal, type SupportTopic } from './support-modal';

type Props = {
    support: { email: string | null; whatsapp: string | null; topics: SupportTopic[] };
};

/** Minuscules, sans accents : « Événement » et « evenement » se retrouvent. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Une question de l'accordéon : une seule ouverte à la fois sur toute la page. */
function Question({ guide, open, onToggle }: { guide: Guide; open: boolean; onToggle: () => void }) {
    const id = useId();

    return (
        <div className="border-b border-slate-100 last:border-0 dark:border-sidebar-border">
            <h3>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-controls={id}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/70 focus-visible:bg-slate-50 focus-visible:outline-none sm:px-6 dark:hover:bg-white/[0.02]"
                >
                    <span className={cn('text-sm font-semibold transition-colors', open ? 'text-motriks-deep' : 'text-ink')}>{guide.question}</span>
                    <ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180 text-motriks')} />
                </button>
            </h3>
            {/* Hauteur animée sans mesure : grille 0fr → 1fr */}
            <div id={id} role="region" className={cn('grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden" inert={!open}>
                    <div className="px-5 pb-5 sm:px-6">
                        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{guide.answer}</p>
                        {guide.link && (
                            <Link href={guide.link.href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-motriks-deep hover:underline">
                                {guide.link.label}
                                <ArrowRight className="size-3.5" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function HelpIndex({ support }: Props) {
    const { auth } = usePage().props;
    const role = auth.user.role;
    const isHostess = role === 'field_agent';
    // « rosnel » → « Rosnel »
    const rawFirst = auth.user.name?.trim().split(/\s+/)[0] ?? '';
    const firstName = rawFirst ? rawFirst.charAt(0).toLocaleUpperCase('fr-FR') + rawFirst.slice(1) : '';

    const topics = useMemo(() => topicsFor(role, auth.modules ?? []), [role, auth.modules]);
    const [query, setQuery] = useState('');
    const [topicId, setTopicId] = useState<string | null>(null);
    const [writing, setWriting] = useState<string | false>(false);
    const [openQuestion, setOpenQuestion] = useState<string | null>(null);

    const q = fold(query.trim());
    const shown = useMemo(
        () =>
            topics
                .filter((t) => !topicId || t.id === topicId)
                .map((t) => ({ ...t, guides: q ? t.guides.filter((g) => fold(`${g.question} ${g.answer}`).includes(q)) : t.guides }))
                .filter((t) => t.guides.length > 0),
        [topics, topicId, q],
    );
    const results = shown.reduce((n, t) => n + t.guides.length, 0);
    const hasTickets = (auth.modules ?? []).includes('demandes');

    return (
        <>
            <Head title="Aide" />

            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* En-tête */}
                <header className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.65rem]">Centre d’aide</h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            {firstName ? `Bonjour ${firstName}, ` : ''}
                            {isHostess ? 'trouvez une réponse ou demandez à votre responsable.' : 'trouvez une réponse ou écrivez-nous directement.'}
                        </p>
                    </div>
                    <div className="relative max-w-2xl">
                        <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={isHostess ? 'Rechercher : réseau, photo, objectif…' : 'Rechercher : stock, objectifs, export Excel…'}
                            aria-label="Rechercher dans l’aide"
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white pr-11 pl-11 text-base text-ink shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-slate-300 focus:border-motriks focus:ring-4 focus:ring-motriks/10 sm:text-sm dark:border-sidebar-border dark:bg-card [&::-webkit-search-cancel-button]:hidden"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche" className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5">
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                </header>

                {/* Thèmes */}
                {topics.length > 1 && (
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Thèmes">
                        {[{ id: null, title: 'Tout', icon: null }, ...topics].map((t) => {
                            const active = topicId === t.id;
                            const Icon = t.icon;
                            return (
                                <button
                                    key={t.id ?? 'all'}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setTopicId(t.id)}
                                    className={cn(
                                        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-medium ring-1 transition-colors',
                                        active ? 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white' : 'bg-white text-slate-600 ring-slate-200 hover:text-ink hover:ring-slate-300 dark:bg-card dark:text-slate-300 dark:ring-sidebar-border',
                                    )}
                                >
                                    {Icon && <Icon className="size-4" />}
                                    {t.title}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    {/* Questions */}
                    <div className="flex flex-col gap-5">
                        {q && (
                            <p className="text-sm text-slate-500" role="status">
                                {results ? `${results} réponse${results > 1 ? 's' : ''} pour « ${query.trim()} »` : `Aucune réponse pour « ${query.trim()} »`}
                            </p>
                        )}

                        {shown.length === 0 ? (
                            <section className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center dark:border-sidebar-border dark:bg-card">
                                <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
                                    <Search className="size-5" />
                                </span>
                                <p className="mt-4 text-sm font-semibold text-ink">Pas encore de réponse à cette question</p>
                                <p className="mt-1 max-w-xs text-sm text-slate-500">{isHostess ? 'Demandez à votre responsable : il vous répondra rapidement.' : 'Posez-la directement au support, nous vous répondons sous 24 h.'}</p>
                                {!isHostess ? (
                                    <ActionButton icon={<Send />} className="mt-5" onClick={() => setWriting('question')}>
                                        Écrire au support
                                    </ActionButton>
                                ) : (
                                    hasTickets && (
                                        <Link href={terrainTickets().url} className={buttonClass('primary', 'md', 'mt-5')}>
                                            <MessageSquarePlus />
                                            Écrire à mon responsable
                                        </Link>
                                    )
                                )}
                            </section>
                        ) : (
                            shown.map((t) => {
                                const Icon = t.icon;
                                return (
                                    <section key={t.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                                        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-sidebar-border">
                                            <span className="flex size-9 items-center justify-center rounded-xl bg-motriks-soft text-motriks-deep">
                                                <Icon className="size-[18px]" />
                                            </span>
                                            <h2 className="text-[15px] font-semibold text-ink">{t.title}</h2>
                                            <span className="ml-auto text-xs text-slate-400 tabular-nums">{t.guides.length}</span>
                                        </header>
                                        {t.guides.map((g) => (
                                            <Question
                                                key={g.question}
                                                guide={g}
                                                open={openQuestion === g.question || (!!q && results === 1)}
                                                onToggle={() => setOpenQuestion((cur) => (cur === g.question ? null : g.question))}
                                            />
                                        ))}
                                    </section>
                                );
                            })
                        )}
                    </div>

                    {/* Contact */}
                    <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
                        {isHostess ? (
                            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                                <span className="flex size-10 items-center justify-center rounded-xl bg-motriks-soft text-motriks-deep">
                                    <MessageCircle className="size-5" />
                                </span>
                                <h2 className="mt-4 text-[15px] font-semibold text-ink">Une question ?</h2>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                    {hasTickets ? 'Votre responsable est là pour vous aider. Écrivez-lui, vous serez prévenue dès qu’il répond.' : 'Votre responsable est là pour vous aider : contactez-le directement.'}
                                </p>
                                {hasTickets && (
                                    <Link href={terrainTickets().url} className={buttonClass('primary', 'md', 'mt-4 w-full')}>
                                        <MessageSquarePlus />
                                        Écrire à mon responsable
                                    </Link>
                                )}
                            </section>
                        ) : (
                            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-sidebar-border dark:bg-card">
                                <div className="p-5">
                                    <div className="flex items-center gap-3">
                                        <span className="relative flex size-10 items-center justify-center rounded-xl bg-motriks-soft text-motriks-deep">
                                            <MessageCircle className="size-5" />
                                            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-card" />
                                        </span>
                                        <div>
                                            <h2 className="text-[15px] font-semibold text-ink">Besoin d’un coup de main ?</h2>
                                            <p className="text-xs text-slate-500">Réponse sous 24 h</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm leading-relaxed text-slate-500">Une question, un souci ou une idée : l’équipe Motriks vous répond directement, sans que vous ayez à ressaisir vos coordonnées.</p>
                                    <ActionButton icon={<Send />} className="mt-4 w-full" onClick={() => setWriting('question')}>
                                        Écrire au support
                                    </ActionButton>
                                </div>

                                {(support.whatsapp || support.email) && (
                                    <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-100 dark:divide-sidebar-border dark:border-sidebar-border">
                                        {support.whatsapp && (
                                            <a href={`https://wa.me/${support.whatsapp}`} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                                <span className="flex size-8 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#128C7E]">
                                                    <MessageCircle className="size-4" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-ink">WhatsApp</span>
                                                    <span className="block text-xs text-slate-500">Le plus rapide</span>
                                                </span>
                                                <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                                            </a>
                                        )}
                                        {support.email && (
                                            <a href={`mailto:${support.email}`} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                                <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5">
                                                    <Mail className="size-4" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-ink">E-mail</span>
                                                    <span className="block truncate text-xs text-slate-500">{support.email}</span>
                                                </span>
                                                <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </section>
                        )}

                        {!isHostess && role === 'company_admin' && (
                            <button
                                type="button"
                                onClick={() => setWriting('billing')}
                                className="rounded-2xl border border-dashed border-slate-200 px-5 py-4 text-left text-sm text-slate-500 transition-colors hover:border-motriks/40 hover:text-ink dark:border-sidebar-border"
                            >
                                <span className="font-semibold text-ink">Activer un module ?</span> Écrivez-nous, nous l’activons pour vous.
                            </button>
                        )}
                    </aside>
                </div>
            </div>

            {writing && <SupportModal topics={support.topics} initialTopic={writing} onClose={() => setWriting(false)} />}
        </>
    );
}

HelpIndex.layout = {
    breadcrumbs: [{ title: 'Aide', href: helpRoute().url }],
};
