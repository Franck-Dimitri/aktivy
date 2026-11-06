import { router } from '@inertiajs/react';
import { useReducedMotion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type MouseEvent } from 'react';
import type { Phase } from './auth-card';

/** Durées de la séquence (≈ 1,5 s au total quand la page suivante est préchargée). */
const LEAVE_MS = 380;
const MORPH_MIN_MS = 460;
const REVEAL_MS = 650;

type Ctx = { phase: Phase; go: (href: string) => void };

const AuthTransitionContext = createContext<Ctx>({ phase: 'idle', go: (href) => router.visit(href) });

export const useAuthTransition = () => useContext(AuthTransitionContext);
export const AuthTransitionProvider = AuthTransitionContext.Provider;

/** Pilote la séquence : cascade de sortie → panneau + logo (chargement de la page) → onde → cascade d'entrée. */
export function useAuthTransitionController(): Ctx {
    const [phase, setPhase] = useState<Phase>('idle');
    const reduced = useReducedMotion();
    const timers = useRef<number[]>([]);
    const busy = useRef(false);

    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

    const go = useCallback(
        (href: string) => {
            if (reduced) return router.visit(href);
            if (busy.current) return;
            busy.current = true;

            const done = () => {
                busy.current = false;
                setPhase('idle');
            };

            setPhase('leaving');
            later(() => {
                setPhase('morph');
                let loaded = false;
                let minDone = false;
                const reveal = () => {
                    if (!loaded || !minDone) return;
                    setPhase('reveal');
                    later(done, REVEAL_MS);
                };
                later(() => {
                    minDone = true;
                    reveal();
                }, MORPH_MIN_MS);

                // Inertia appelle onFinish avant onSuccess : on ne le prend pas pour un échec.
                // Échec réel = visite annulée, erreur, ou rien après 15 s (réseau coupé).
                const fail = () => {
                    if (!loaded) done();
                };
                later(fail, 15000);
                router.visit(href, {
                    onSuccess: () => {
                        loaded = true;
                        reveal();
                    },
                    onCancel: fail,
                    onError: fail,
                    onHttpException: fail,
                    onNetworkError: fail,
                });
            }, LEAVE_MS);
        },
        [reduced],
    );

    return { phase, go };
}

/** Lien entre pages de connexion : joue la transition (sauf Ctrl / clic molette) et précharge sa cible. */
export function TransitionLink({ href, onClick, ...props }: ComponentProps<'a'> & { href: string }) {
    const { go } = useAuthTransition();
    const prefetch = useCallback(() => router.prefetch(href, { method: 'get' }, { cacheFor: '1m' }), [href]);

    // Préchargement dès que le navigateur souffle ; avec les animations en continu il ne l'est presque jamais : 2 s au plus
    useEffect(() => {
        const schedule = window.requestIdleCallback ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2000 }) : (cb: () => void) => window.setTimeout(cb, 1500);
        const cancel = window.cancelIdleCallback ?? window.clearTimeout;
        const id = schedule(prefetch);
        return () => cancel(id);
    }, [prefetch]);

    return (
        <a
            href={href}
            onPointerEnter={prefetch}
            onTouchStart={prefetch}
            onFocus={prefetch}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                onClick?.(e);
                if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                go(href);
            }}
            {...props}
        />
    );
}
