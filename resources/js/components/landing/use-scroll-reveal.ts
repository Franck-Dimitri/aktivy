import { useLayoutEffect } from 'react';

/* Animation au défilement : les éléments marqués data-reveal apparaissent à chaque passage à l'écran */
export const REVEAL_CSS = `
.rv{opacity:0;transform:translateY(32px) scale(.98);will-change:opacity,transform;
transition:opacity .8s cubic-bezier(.22,1,.36,1),transform .8s cubic-bezier(.22,1,.36,1),translate .3s ease,box-shadow .3s ease,border-color .3s ease,background-color .3s ease,color .3s ease;
transition-delay:var(--rv-delay,0ms)}
.rv.rv-in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.rv{opacity:1;transform:none;transition:none}}
@media (min-width:1024px){.hero-tilt{transform:perspective(2200px) rotateY(-17deg) rotateX(5deg) rotateZ(1.5deg);transform-origin:left center}}
`;

export function useScrollReveal() {
    useLayoutEffect(() => {
        if (
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            !('IntersectionObserver' in window)
        ) {
            return;
        }

        const els = Array.from(
            document.querySelectorAll<HTMLElement>('[data-reveal]'),
        );
        const timers = new Map<HTMLElement, number>();

        // décalage progressif entre éléments frères (0, 90, 180, 270 ms)
        const counters = new Map<Element, number>();
        els.forEach((el) => {
            const parent = el.parentElement as Element;
            const i = counters.get(parent) ?? 0;
            counters.set(parent, i + 1);
            el.dataset.rvDelay = String(Math.min(i, 4) * 90);
            el.classList.add('rv');
        });

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const el = entry.target as HTMLElement;
                    window.clearTimeout(timers.get(el));
                    if (entry.isIntersecting) {
                        const delay = Number(el.dataset.rvDelay ?? 0);
                        el.style.setProperty('--rv-delay', `${delay}ms`);
                        el.classList.add('rv-in');
                        // le délai est retiré ensuite pour ne pas ralentir les effets au survol
                        timers.set(
                            el,
                            window.setTimeout(
                                () => el.style.setProperty('--rv-delay', '0ms'),
                                delay + 900,
                            ),
                        );
                    } else {
                        el.style.setProperty('--rv-delay', '0ms');
                        el.classList.remove('rv-in');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
        );

        els.forEach((el) => io.observe(el));

        return () => {
            io.disconnect();
            timers.forEach((t) => window.clearTimeout(t));
            els.forEach((el) => {
                el.classList.remove('rv', 'rv-in');
                el.style.removeProperty('--rv-delay');
            });
        };
    }, []);
}
