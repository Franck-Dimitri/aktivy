import { useEffect, useRef, useState } from 'react';
import MotriksMark from '@/components/motriks-mark';
import { Icon } from '@/components/landing/primitives';

/* ------------------------------------------------------------------ */
/*  Démo animée de l'assistant : une conversation qui se joue en boucle  */
/* ------------------------------------------------------------------ */

type DemoCard = 'sales' | 'absences' | 'pdf';
type DemoStep = {
    role: 'user' | 'bot';
    text: string;
    card?: DemoCard;
    source?: string;
};
type DemoMsg = DemoStep & { id: number; done: boolean };

const DEMO_STEPS: DemoStep[] = [
    { role: 'user', text: 'Quel site a le mieux vendu ce mois-ci ?' },
    {
        role: 'bot',
        text: 'Carrefour Bastos arrive en tête avec 4 820 000 FCFA, soit +12 % par rapport au mois dernier.',
        card: 'sales',
        source: 'Source : ventes validées du 1er au 30 du mois',
    },
    {
        role: 'user',
        text: 'Quelles hôtesses ont été absentes plusieurs fois ?',
    },
    {
        role: 'bot',
        text: "Deux hôtesses cumulent 3 absences ce mois-ci. Aucune n'a de justificatif enregistré.",
        card: 'absences',
        source: 'Source : pointages du 1er au 30 du mois',
    },
    { role: 'user', text: 'Prépare-moi le rapport en PDF.' },
    { role: 'bot', text: 'Voilà, votre rapport est prêt.', card: 'pdf' },
];

function DemoCardView({ card }: { card: DemoCard }) {
    const [go, setGo] = useState(false);

    useEffect(() => {
        const t = window.setTimeout(() => setGo(true), 80);
        return () => window.clearTimeout(t);
    }, []);

    if (card === 'sales') {
        const rows = [
            { n: 'Carrefour Bastos', v: '4 820 000', p: 100 },
            { n: 'Mvog-Ada', v: '3 960 000', p: 82 },
            { n: 'Mokolo', v: '2 310 000', p: 48 },
        ];
        return (
            <div className="mt-2 space-y-3 rounded-2xl bg-slate-900/60 p-4">
                {rows.map((r, i) => (
                    <div key={r.n}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-200">
                                {r.n}
                            </span>
                            <span className="text-slate-500">{r.v} FCFA</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                            <div
                                className="h-full rounded-full bg-green-500 transition-[width] duration-1000 ease-out"
                                style={{
                                    width: go ? `${r.p}%` : '0%',
                                    transitionDelay: `${i * 150}ms`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (card === 'absences') {
        const rows = [
            { n: 'Sandrine M.', site: 'Carrefour Bastos' },
            { n: 'Ruth E.', site: 'Mvog-Ada' },
        ];
        return (
            <div className="mt-2 space-y-2 rounded-2xl bg-slate-900/60 p-3">
                {rows.map((r) => (
                    <div
                        key={r.n}
                        className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                            {r.n[0]}
                        </span>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-slate-100">
                                {r.n}
                            </p>
                            <p className="text-[11px] text-slate-500">
                                {r.site}
                            </p>
                        </div>
                        <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300">
                            3 absences
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-slate-900/60 p-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
                <Icon name="file" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">
                    Rapport_absences_octobre.pdf
                </p>
                <p className="text-[11px] text-slate-500">2 pages · 84 Ko</p>
            </div>
            <span className="rounded-full bg-green-500 px-4 py-2 text-xs font-semibold text-white">
                Télécharger
            </span>
        </div>
    );
}

export function AssistantDemo() {
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [messages, setMessages] = useState<DemoMsg[]>([]);
    const [typing, setTyping] = useState(false);
    const [draft, setDraft] = useState('');

    // la démo démarre quand elle arrive à l'écran, et repart du début à chaque retour
    useEffect(() => {
        const el = rootRef.current;
        if (!el) {
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => setActive(entry.isIntersecting),
            { threshold: 0.4 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!active) {
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setMessages(
                DEMO_STEPS.map((st, i) => ({ ...st, id: i, done: true })),
            );
            return;
        }

        let cancelled = false;
        const wait = (ms: number) =>
            new Promise<void>((resolve, reject) => {
                window.setTimeout(
                    () => (cancelled ? reject(new Error('stop')) : resolve()),
                    ms,
                );
            });

        // Boucle de démonstration : elle tourne seule, les erreurs (arrêt demandé) sont gérées à l'intérieur
        void (async () => {
            try {
                while (!cancelled) {
                    setMessages([]);
                    setTyping(false);
                    setDraft('');
                    await wait(700);

                    for (let i = 0; i < DEMO_STEPS.length; i++) {
                        const st = DEMO_STEPS[i];

                        if (st.role === 'user') {
                            for (let c = 1; c <= st.text.length; c++) {
                                setDraft(st.text.slice(0, c));
                                await wait(32);
                            }
                            await wait(350);
                            setDraft('');
                            setMessages((prev) => [
                                ...prev,
                                { ...st, id: i, done: true },
                            ]);
                            await wait(500);
                        } else {
                            setTyping(true);
                            await wait(1100);
                            setTyping(false);

                            const words = st.text.split(' ');
                            setMessages((prev) => [
                                ...prev,
                                { ...st, text: '', id: i, done: false },
                            ]);
                            for (let w = 1; w <= words.length; w++) {
                                const part = words.slice(0, w).join(' ');
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === i ? { ...m, text: part } : m,
                                    ),
                                );
                                await wait(55);
                            }
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === i ? { ...m, done: true } : m,
                                ),
                            );
                            await wait(1300);
                        }
                    }

                    await wait(5000);
                }
            } catch {
                /* démo interrompue : l'utilisateur est sorti de l'écran */
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [active]);

    // garde le bas de la conversation visible
    useEffect(() => {
        const el = listRef.current;
        if (el) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, typing]);

    return (
        <div
            ref={rootRef}
            className="flex h-[520px] flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-800 shadow-2xl shadow-black/30 lg:h-[560px]"
        >
            {/* en-tête */}
            <div className="flex items-center gap-3 border-b border-slate-700/80 px-5 py-4">
                <MotriksMark className="size-10 rounded-full" />
                <div className="leading-tight">
                    <p className="text-sm font-semibold text-white">
                        Assistant Motriks
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                        En ligne
                    </p>
                </div>
            </div>

            {/* conversation */}
            <div
                ref={listRef}
                className="min-h-0 flex-1 [scrollbar-width:none] space-y-4 overflow-y-auto px-5 py-5 [&::-webkit-scrollbar]:hidden"
            >
                {messages.length === 0 && !typing && (
                    <p className="pt-16 text-center text-sm text-slate-500">
                        Posez une question sur vos équipes, vos stocks ou vos
                        ventes.
                    </p>
                )}

                {messages.map((m) =>
                    m.role === 'user' ? (
                        <div
                            key={m.id}
                            className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-green-600 px-4 py-2.5 text-sm text-white"
                        >
                            {m.text}
                        </div>
                    ) : (
                        <div
                            key={m.id}
                            className="flex max-w-[92%] items-start gap-2.5"
                        >
                            <MotriksMark className="mt-0.5 size-7 rounded-full" />
                            <div className="min-w-0 flex-1">
                                <div className="w-fit rounded-2xl rounded-tl-md bg-slate-700/80 px-4 py-2.5 text-sm leading-relaxed text-slate-100">
                                    {m.text}
                                </div>
                                {m.done && m.card && (
                                    <DemoCardView card={m.card} />
                                )}
                                {m.done && m.source && (
                                    <p className="mt-2 text-[11px] text-slate-500">
                                        {m.source}
                                    </p>
                                )}
                            </div>
                        </div>
                    ),
                )}

                {typing && (
                    <div className="flex items-start gap-2.5">
                        <MotriksMark className="size-7 rounded-full" />
                        <div className="flex gap-1.5 rounded-2xl rounded-tl-md bg-slate-700/80 px-4 py-3.5">
                            {[0, 1, 2].map((d) => (
                                <span
                                    key={d}
                                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300"
                                    style={{ animationDelay: `${d * 140}ms` }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* zone de saisie */}
            <div className="p-4 pt-2">
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/70 py-2 pr-2 pl-5">
                    <span className="flex-1 truncate text-sm">
                        {draft ? (
                            <span className="text-white">
                                {draft}
                                <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-green-400" />
                            </span>
                        ) : (
                            <span className="text-slate-500">
                                Posez votre question...
                            </span>
                        )}
                    </span>
                    <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors ${draft ? 'bg-green-500' : 'bg-slate-700'}`}
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="M12 19V5m-6 6l6-6 6 6" />
                        </svg>
                    </span>
                </div>
            </div>
        </div>
    );
}
