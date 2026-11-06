import { AnimatePresence, animate, motion, useMotionValue, useTransform, type MotionValue, type Variants } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import MotriksMark from '@/components/motriks-mark';

/**
 * idle    : formulaire affiché
 * leaving : les champs disparaissent en cascade
 * morph   : panneau vide presque carré, biseaux marqués, logo qui pulse (la page suivante se charge)
 * reveal  : une onde part du centre et révèle le nouveau formulaire, dont les champs arrivent en cascade
 */
export type Phase = 'idle' | 'leaving' | 'morph' | 'reveal';

export const EASE = [0.22, 1, 0.36, 1] as const;

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10, filter: 'blur(0px)' },
    reveal: { opacity: 0, y: 10, filter: 'blur(0px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.38, ease: EASE } },
    leave: { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.18, ease: 'easeIn' } },
};

const contentVariants: Variants = {
    hidden: { clipPath: 'circle(150% at 50% 45%)' },
    reveal: { clipPath: 'circle(0% at 50% 45%)' },
    visible: {
        clipPath: 'circle(150% at 50% 45%)',
        transition: { clipPath: { duration: 0.65, ease: EASE }, staggerChildren: 0.045, delayChildren: 0.06 },
        transitionEnd: { clipPath: 'none' },
    },
    leave: { transition: { staggerChildren: 0.03 } },
};

/** Élément qui apparaît (fondu + montée de 10 px) et disparaît en cascade avec ses voisins. */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <motion.div variants={itemVariants} className={className}>
            {children}
        </motion.div>
    );
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Largeur de la fenêtre, tenue à jour (1024 au rendu serveur). */
function useViewportWidth() {
    const [vw, setVw] = useState(1024);
    useIsoLayoutEffect(() => {
        const onResize = () => setVw(window.innerWidth);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return vw;
}

/** Contour : biseau en haut à gauche (c) et en bas à droite (cb), les deux autres coins arrondis. */
function shapePath(w: number, h: number, c: number, cb: number, r = 16, inset = 0): string {
    if (w <= 0 || h <= 0) return '';
    const i = inset;
    const W = w - i;
    const H = h - i;
    const f = (n: number) => n.toFixed(2);
    return [
        `M ${f(i + c)} ${f(i)}`,
        `L ${f(W - r)} ${f(i)}`,
        `A ${r} ${r} 0 0 1 ${f(W)} ${f(i + r)}`,
        `L ${f(W)} ${f(H - cb)}`,
        `L ${f(W - cb)} ${f(H)}`,
        `L ${f(i + r)} ${f(H)}`,
        `A ${r} ${r} 0 0 1 ${f(i)} ${f(H - r)}`,
        `L ${f(i)} ${f(i + c)}`,
        'Z',
    ].join(' ');
}

/** Éclats de verre posés dans les coins coupés, à 6 px de la carte. */
function shardsPath(w: number, h: number, c: number, cb: number): string {
    if (w <= 0 || h <= 0) return '';
    const gap = 8.5; // 6 px perpendiculaires au biseau
    const a = Math.max(0, c - gap);
    const b = Math.max(0, cb - gap);
    return `M 0 0 L ${a.toFixed(2)} 0 L 0 ${a.toFixed(2)} Z M ${w} ${h} L ${(w - b).toFixed(2)} ${h} L ${w} ${(h - b).toFixed(2)} Z`;
}

function useShape(w: MotionValue<number>, h: MotionValue<number>, c: MotionValue<number>, cb: MotionValue<number>) {
    const clip = useTransform(() => {
        const d = shapePath(w.get(), h.get(), c.get(), cb.get());
        return d ? `path('${d}')` : 'none';
    });
    const border = useTransform(() => shapePath(w.get(), h.get(), c.get(), cb.get(), 16, 0.5));
    const shards = useTransform(() => shardsPath(w.get(), h.get(), c.get(), cb.get()));
    return { clip, border, shards };
}

type AuthCardProps = {
    phase: Phase;
    /** Change à chaque page : déclenche l'entrée du nouveau contenu. */
    contentKey: string;
    width?: number;
    children: ReactNode;
};

export function AuthCard({ phase, contentKey, width = 420, children }: AuthCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const w = useMotionValue(0);
    const h = useMotionValue(0);
    const c = useMotionValue(60);
    const cb = useMotionValue(28);
    const { clip, border, shards } = useShape(w, h, c, cb);

    const vw = useViewportWidth();
    const mobile = vw < 640;
    const morph = phase === 'morph';
    const morphSize = Math.min(340, vw * 0.92);
    // Le contenu est mis en page à sa largeur finale dès le départ : sa hauteur ne saute pas à la fin de l'onde
    const finalWidth = `min(${width}px, 92vw)`;

    // Mesure réelle de la carte (sans les transformations) : le contour suit la taille pendant l'animation
    useIsoLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => {
            w.set(el.offsetWidth);
            h.set(el.offsetHeight);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [w, h]);

    // Taille pilotée au pixel : figée pendant la sortie des champs, réduite pour le panneau,
    // puis étendue jusqu'à la hauteur réelle du nouveau contenu
    const height = useMotionValue<number | string>('auto');
    const maxWidth = useMotionValue(width);
    useEffect(() => {
        const a = animate(maxWidth, morph ? morphSize : width, { duration: 0.55, ease: EASE });
        return () => a.stop();
    }, [morph, morphSize, width, maxWidth]);

    useIsoLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (phase === 'leaving') {
            height.set(el.offsetHeight);
            return;
        }
        if (phase === 'morph') {
            if (height.get() === 'auto') height.set(el.offsetHeight);
            const a = animate(height, morphSize, { duration: 0.55, ease: EASE });
            return () => a.stop();
        }
        if (phase === 'reveal') {
            const target = contentRef.current?.offsetHeight;
            if (!target) return void height.set('auto');
            const a = animate(height, target, { duration: 0.55, ease: EASE, onComplete: () => height.set('auto') });
            return () => a.stop();
        }
        if (typeof height.get() === 'number' && !height.isAnimating()) height.set('auto');
    }, [phase, morphSize, height]);

    // Biseaux plus marqués pendant la métamorphose
    useEffect(() => {
        const base = mobile ? [44, 22] : [60, 28];
        const big = mobile ? [76, 40] : [96, 52];
        const [tc, tcb] = morph ? big : base;
        const a1 = animate(c, tc, { duration: 0.55, ease: EASE });
        const a2 = animate(cb, tcb, { duration: 0.55, ease: EASE });
        return () => {
            a1.stop();
            a2.stop();
        };
    }, [morph, mobile, c, cb]);

    return (
        <motion.div ref={ref} initial={false} animate={{ scale: morph ? 1.025 : 1 }} transition={{ duration: 0.55, ease: EASE }} style={{ height, maxWidth }} data-auth-card={phase} className="relative isolate mx-auto w-[92vw]">
            {/* Ombres : une grise pour décoller la carte, une verte très diffuse dessous */}
            <div aria-hidden="true" className="absolute inset-x-8 top-12 bottom-0 -z-10 translate-y-5 rounded-[40px] bg-slate-900/10 blur-2xl" />
            <div aria-hidden="true" className="absolute inset-x-12 top-1/2 -bottom-8 -z-10 rounded-[48px] bg-green-500/20 blur-[60px]" />

            {/* Verre dépoli blanc */}
            <motion.div
                aria-hidden="true"
                style={{ clipPath: clip }}
                className="absolute inset-0 rounded-2xl bg-[linear-gradient(150deg,rgba(255,255,255,0.9),rgba(255,255,255,0.74)_45%,rgba(255,255,255,0.86))] backdrop-blur-[24px] backdrop-saturate-[1.6]"
            >
                <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(18,183,106,0.08),transparent_60%)]" />
            </motion.div>

            {/* Bordure, reflet vert qui glisse dessus, éclats détachés */}
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <defs>
                    <linearGradient id="auth-card-border" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#039855" stopOpacity="0.45" />
                        <stop offset="0.3" stopColor="#cbd5e1" stopOpacity="0.9" />
                        <stop offset="0.65" stopColor="#e2e8f0" stopOpacity="0.9" />
                        <stop offset="1" stopColor="#12b76a" stopOpacity="0.45" />
                    </linearGradient>
                    <linearGradient id="auth-card-shard" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="0.6" stopColor="#d1fadf" stopOpacity="0.8" />
                        <stop offset="1" stopColor="#ffffff" stopOpacity="0.6" />
                    </linearGradient>
                </defs>
                <motion.path d={shards} fill="url(#auth-card-shard)" stroke="#039855" strokeOpacity="0.35" strokeWidth="1" strokeLinejoin="round" />
                <motion.path d={border} fill="none" stroke="url(#auth-card-border)" strokeWidth="1" />
                <motion.path
                    d={border}
                    pathLength={1}
                    fill="none"
                    stroke="#12b76a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeDasharray="0.1 0.9"
                    className="auth-thread"
                    style={{ ['--auth-thread-duration' as string]: '7s', filter: 'drop-shadow(0 0 4px rgba(18,183,106,0.7))' }}
                />
            </svg>

            {/* Contenu */}
            <motion.div className="relative flex h-full items-start justify-center" style={{ clipPath: phase === 'idle' ? 'none' : clip }}>
                <AnimatePresence mode="popLayout">
                    {morph ? (
                        <motion.div
                            key="logo"
                            data-auth-logo
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.3, filter: 'blur(6px)', transition: { duration: 0.3 } }}
                            transition={{ duration: 0.4, ease: EASE }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <span className="relative">
                                <motion.span
                                    aria-hidden="true"
                                    className="absolute -inset-8 rounded-full bg-green-400/40 blur-2xl"
                                    animate={{ opacity: [0.35, 0.9, 0.4], scale: [0.8, 1.15, 0.92] }}
                                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <MotriksMark className="relative size-16 drop-shadow-[0_8px_18px_rgba(3,152,85,0.35)]" />
                            </span>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={contentKey}
                            ref={contentRef}
                            variants={contentVariants}
                            initial={phase === 'reveal' ? 'reveal' : 'hidden'}
                            animate={phase === 'leaving' ? 'leave' : 'visible'}
                            exit={{ opacity: 0, transition: { duration: 0.18 } }}
                            style={{ width: finalWidth }}
                            className="relative shrink-0 px-5 py-6 sm:px-8 sm:py-7"
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Onde circulaire qui révèle le nouveau formulaire */}
            <AnimatePresence>
                {phase === 'reveal' && (
                    <motion.div key="wave" aria-hidden="true" style={{ clipPath: clip }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                        <motion.span
                            initial={{ scale: 0.15, opacity: 1 }}
                            animate={{ scale: 5.5, opacity: 0 }}
                            transition={{ duration: 0.85, ease: [0.2, 0.7, 0.3, 1] }}
                            className="absolute size-32 rounded-full backdrop-blur-[7px]"
                            style={{ maskImage: 'radial-gradient(circle, transparent 50%, #000 63%, transparent 72%)', WebkitMaskImage: 'radial-gradient(circle, transparent 50%, #000 63%, transparent 72%)' }}
                        />
                        <motion.span
                            initial={{ scale: 0.15, opacity: 0.95 }}
                            animate={{ scale: 5.5, opacity: 0 }}
                            transition={{ duration: 0.85, ease: [0.2, 0.7, 0.3, 1] }}
                            className="absolute size-32 rounded-full border-2 border-green-500/60 shadow-[0_0_30px_rgba(18,183,106,0.35),inset_0_0_24px_rgba(18,183,106,0.2)]"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/** Titre et sous-titre au-dessus de la carte : ils s'effacent avec les champs et reviennent avec la nouvelle page. */
export function AuthHeading({ contentKey, title, description, away }: { contentKey: string; title?: string; description?: string; away: boolean }) {
    return (
        <AnimatePresence mode="wait" initial>
            <motion.div
                key={contentKey}
                initial={{ opacity: 0, y: 8 }}
                animate={away ? { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.2 } } : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="mb-5 px-4 text-center"
            >
                {title && <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-[26px]">{title}</h1>}
                {description && <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-pretty text-slate-500">{description}</p>}
            </motion.div>
        </AnimatePresence>
    );
}
