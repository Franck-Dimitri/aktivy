import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/landing/primitives';

/* ------------------------------------------------------------------ */
/*  Timeline IA : ligne verte ondulée dessinée au rythme du défilement   */
/* ------------------------------------------------------------------ */

const TIMELINE_CSS = `
.tl-step{opacity:0;transform:translateY(14px);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}
.tl-step[data-on]{opacity:1;transform:none}
.tl-dot{transform:translate(-50%,-50%) scale(0);transition:transform .45s cubic-bezier(.34,1.56,.64,1),box-shadow .5s ease}
.tl-dot[data-on]{transform:translate(-50%,-50%) scale(1);box-shadow:0 0 0 4px rgba(34,197,94,.12)}
.tl-dot[data-active]{box-shadow:0 0 0 6px rgba(34,197,94,.18),0 0 18px 4px rgba(74,222,128,.45)}
.tl-line{filter:drop-shadow(0 0 3px rgba(74,222,128,.55))}
@media (max-width:639px){
.tl-line{filter:drop-shadow(0 0 2px rgba(74,222,128,.35))}
.tl-dot[data-active]{box-shadow:0 0 0 5px rgba(34,197,94,.15),0 0 10px 2px rgba(74,222,128,.3)}
}
@media (prefers-reduced-motion:reduce){.tl-step,.tl-dot{transition:none}}
`;

const TL_GUTTER = 56; // largeur de la zone où ondule la ligne
const TL_WAVE = [14, 42]; // positions horizontales alternées des points sur la courbe

type TlPoint = { x: number; y: number };
type TlGeometry = { height: number; points: TlPoint[]; d: string };

/* Courbe de Bézier passant exactement par chaque point (tangentes verticales : la ligne ondule sans jamais remonter) */
function buildWavePath(points: TlPoint[], height: number) {
    const mid = TL_GUTTER / 2;
    let prev: TlPoint = { x: mid, y: 0 };
    let d = `M ${mid} 0`;
    [...points, { x: mid, y: height }].forEach((p) => {
        const half = (p.y - prev.y) / 2;
        d += ` C ${prev.x} ${prev.y + half}, ${p.x} ${p.y - half}, ${p.x} ${p.y}`;
        prev = p;
    });
    return d;
}

export function AiTimeline({
    items,
}: {
    items: { icon: string; title: string; text: string }[];
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const anchorRefs = useRef<(HTMLElement | null)[]>([]);
    const stepRefs = useRef<(HTMLElement | null)[]>([]);
    const dotRefs = useRef<(HTMLElement | null)[]>([]);
    const lengthsRef = useRef<{ total: number; at: number[] }>({
        total: 0,
        at: [],
    });
    const refreshRef = useRef<() => void>(() => {});
    const [geo, setGeo] = useState<TlGeometry | null>(null);

    // 1. Géométrie : mesurée au montage et au redimensionnement uniquement (jamais pendant le scroll)
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }

        const measure = () => {
            const points = anchorRefs.current.map((anchor, i) => {
                // offsetTop ignore les transformations CSS : la position reste exacte même pendant l'animation
                let y = 0;
                let el: HTMLElement | null = anchor;
                while (el && el !== root) {
                    y += el.offsetTop;
                    el = el.offsetParent as HTMLElement | null;
                }
                return {
                    x: TL_WAVE[i % 2],
                    y: Math.round(y + (anchor?.offsetHeight ?? 0) / 2),
                };
            });
            const height = root.offsetHeight;
            const d = buildWavePath(points, height);
            setGeo((prev) =>
                prev && prev.d === d ? prev : { height, points, d },
            );
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(root);
        return () => ro.disconnect();
    }, []);

    // 2. Longueurs le long de la courbe : où se trouve chaque point (recherche dichotomique, y est croissant)
    useLayoutEffect(() => {
        const path = pathRef.current;
        if (!geo || !path) {
            return;
        }
        const total = path.getTotalLength();
        const at = geo.points.map((p) => {
            let lo = 0;
            let hi = total;
            for (let k = 0; k < 22; k++) {
                const m = (lo + hi) / 2;
                if (path.getPointAtLength(m).y < p.y) {
                    lo = m;
                } else {
                    hi = m;
                }
            }
            return hi;
        });
        lengthsRef.current = { total, at };
        path.style.strokeDasharray = `${total}`;
        path.style.strokeDashoffset = `${total}`;
        refreshRef.current();
    }, [geo]);

    // 3. Synchronisation avec le défilement réel de la page
    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }
        const reduce = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        let frame = 0;
        let near = true;

        const apply = () => {
            frame = 0;
            const path = pathRef.current;
            const { total, at } = lengthsRef.current;
            if (!path || !total) {
                return;
            }

            let progress = 1;
            if (!reduce) {
                const r = root.getBoundingClientRect();
                const vh = window.innerHeight;
                // 0 quand le haut arrive à 80 % de l'écran, 1 quand le bas atteint 60 %
                progress = Math.min(
                    1,
                    Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.2)),
                );
            }

            const drawn = progress * total;
            path.style.strokeDashoffset = `${total - drawn}`;

            let last = -1;
            at.forEach((len, i) => {
                const on = drawn >= len - 0.5;
                if (on) {
                    last = i;
                }
                stepRefs.current[i]?.toggleAttribute('data-on', on);
                dotRefs.current[i]?.toggleAttribute('data-on', on);
            });
            dotRefs.current.forEach((dot, i) =>
                dot?.toggleAttribute('data-active', i === last),
            );
        };

        const schedule = () => {
            if (!frame) {
                frame = window.requestAnimationFrame(apply);
            }
        };
        const onScroll = () => {
            if (near) {
                schedule();
            }
        };

        refreshRef.current = schedule;
        schedule();

        if (reduce) {
            return () => window.cancelAnimationFrame(frame);
        }

        // on n'écoute le scroll que lorsque la section est proche de l'écran
        const io = new IntersectionObserver(
            ([entry]) => {
                near = entry.isIntersecting;
                schedule();
            },
            { rootMargin: '30% 0px 30% 0px' },
        );
        io.observe(root);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);

        return () => {
            window.cancelAnimationFrame(frame);
            io.disconnect();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            refreshRef.current = () => {};
        };
    }, []);

    return (
        <>
            <style>{TIMELINE_CSS}</style>
            <div
                ref={rootRef}
                className="relative flex flex-col gap-10 py-2 lg:h-full lg:justify-between lg:gap-0 lg:py-6"
                style={{ paddingLeft: TL_GUTTER }}
            >
                <svg
                    className="pointer-events-none absolute top-0 left-0 overflow-visible"
                    width={TL_GUTTER}
                    height={geo?.height ?? 0}
                    aria-hidden="true"
                >
                    {geo && (
                        <>
                            <path
                                d={geo.d}
                                fill="none"
                                stroke="rgba(148,163,184,0.16)"
                                strokeWidth="2"
                            />
                            <path
                                ref={pathRef}
                                className="tl-line"
                                d={geo.d}
                                fill="none"
                                stroke="#12b76a"
                                strokeWidth="2.25"
                                strokeLinecap="round"
                            />
                        </>
                    )}
                </svg>

                {geo?.points.map((p, i) => (
                    <span
                        key={i}
                        ref={(el) => {
                            dotRefs.current[i] = el;
                        }}
                        className="tl-dot pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-green-400"
                        style={{ left: p.x, top: p.y }}
                        aria-hidden="true"
                    />
                ))}

                {items.map((it, i) => (
                    <div
                        key={it.title}
                        ref={(el) => {
                            stepRefs.current[i] = el;
                        }}
                        className="tl-step flex items-start gap-4"
                    >
                        <span
                            ref={(el) => {
                                anchorRefs.current[i] = el;
                            }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10 text-green-400"
                        >
                            <Icon name={it.icon} className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 pt-0.5">
                            <h3 className="text-base font-semibold text-white">
                                {it.title}
                            </h3>
                            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
                                {it.text}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
