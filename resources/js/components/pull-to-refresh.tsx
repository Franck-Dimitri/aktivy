import { router } from '@inertiajs/react';
import { ArrowDown, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { markUnstable } from '@/lib/connection';
import { haptic } from '@/lib/haptics';
import { isStandalone } from '@/lib/pwa';
import { retryNow } from '@/lib/sync';
import { cn } from '@/lib/utils';

/** Distance (après résistance) à partir de laquelle relâcher actualise la page. */
const THRESHOLD = 72;
const MAX = 120;
/** Le doigt descend de 2 px pour 1 px de rond : sensation de tirer sur un élastique. */
const resist = (dy: number) => Math.min(MAX, dy * 0.5);
/** Durée minimale du rond qui tourne : un écran rafraîchi en 80 ms paraîtrait n'avoir rien fait. */
const MIN_SPIN_MS = 600;

/** Le geste commence dans une zone qui défile pour son compte, ou dans une fenêtre ouverte : on laisse faire. */
function blocked(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return true;
    if (
        target.closest(
            '[role="dialog"], [role="alertdialog"], [role="menu"], [data-sans-actualisation], input[type="range"]',
        )
    )
        return true;
    if (document.body.style.overflow === 'hidden') return true;

    for (
        let el: Element | null = target;
        el && el !== document.body;
        el = el.parentElement
    ) {
        if (el.scrollTop > 0) {
            const overflow = getComputedStyle(el).overflowY;
            if (overflow === 'auto' || overflow === 'scroll') return true;
        }
    }

    return false;
}

/**
 * « Tirer pour actualiser » de l'application installée : Android et iPhone le retirent aux applications
 * web en plein écran, il est donc recréé ici. Tout en haut de la page, tirer vers le bas fait descendre
 * un rond sous l'en-tête ; relâché au-delà du seuil, la page recharge ses données (sans perdre la saisie),
 * et les actions gardées hors ligne repartent aussitôt. Sans réseau, un message le dit simplement.
 */
export function PullToRefresh() {
    const [pull, setPull] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const busy = useRef(false);

    useEffect(() => {
        if (
            typeof window === 'undefined' ||
            !window.matchMedia('(pointer: coarse)').matches ||
            !isStandalone()
        ) {
            return;
        }

        let startY: number | null = null;
        let startX = 0;
        let dragging = false;
        let distance = 0;
        let armed = false;

        const reset = () => {
            startY = null;
            dragging = false;
            distance = 0;
            armed = false;
        };

        const onStart = (event: TouchEvent) => {
            if (
                busy.current ||
                event.touches.length !== 1 ||
                window.scrollY > 0 ||
                blocked(event.target)
            )
                return;
            startY = event.touches[0].clientY;
            startX = event.touches[0].clientX;
        };

        const onMove = (event: TouchEvent) => {
            if (startY === null) return;
            const dy = event.touches[0].clientY - startY;
            const dx = event.touches[0].clientX - startX;

            if (!dragging) {
                // Geste vers le haut ou de côté (carrousel, glissement) : ce n'est pas pour nous
                if (dy < -4 || Math.abs(dx) > Math.abs(dy)) return reset();
                if (dy < 8) return;
                if (window.scrollY > 0) return reset();
                dragging = true;
            }

            distance = resist(Math.max(0, dy));
            if (distance >= THRESHOLD !== armed) {
                armed = distance >= THRESHOLD;
                if (armed) haptic('light');
            }
            setPull(distance);
            if (event.cancelable) event.preventDefault();
        };

        const onEnd = () => {
            if (!dragging) return reset();
            const release = armed;
            reset();

            if (!release) {
                setPull(0);
                return;
            }

            if (!navigator.onLine) {
                setPull(0);
                haptic('warning');
                toast.info('Vous n’êtes pas connecté', {
                    id: 'reseau',
                    description:
                        'La page se mettra à jour toute seule dès le retour du réseau.',
                });
                return;
            }

            busy.current = true;
            setRefreshing(true);
            setPull(THRESHOLD);
            retryNow();
            const started = Date.now();

            router.reload({
                async: true,
                showProgress: false,
                // Réseau annoncé mais muet : on le dit (rechargement demandé par la personne, pas silencieux)
                onNetworkError: () => {
                    markUnstable();
                    haptic('warning');
                    toast.error('Connexion trop faible', {
                        id: 'reseau',
                        description:
                            'La page n’a pas pu être mise à jour. Réessayez dans un instant.',
                    });

                    return false;
                },
                onFinish: () => {
                    window.setTimeout(
                        () => {
                            busy.current = false;
                            setRefreshing(false);
                            setPull(0);
                        },
                        Math.max(0, MIN_SPIN_MS - (Date.now() - started)),
                    );
                },
            });
        };

        window.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);

        return () => {
            window.removeEventListener('touchstart', onStart);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
            window.removeEventListener('touchcancel', onEnd);
        };
    }, []);

    if (pull === 0 && !refreshing) {
        return null;
    }

    const progress = Math.min(1, pull / THRESHOLD);
    const dragging = !refreshing;

    return (
        <div
            aria-hidden={!refreshing}
            className="pointer-events-none fixed inset-x-0 top-16 z-[5] flex justify-center md:hidden"
        >
            <div
                role={refreshing ? 'status' : undefined}
                aria-label={refreshing ? 'Actualisation en cours' : undefined}
                className={cn(
                    'flex size-10 items-center justify-center rounded-full bg-white text-motriks-deep shadow-lg ring-1 shadow-slate-900/15 ring-slate-200/80',
                    // Pendant le geste, le rond suit le doigt sans retard ; relâché, il glisse à sa place
                    !dragging || pull === 0
                        ? 'transition-[transform,opacity] duration-300 ease-out'
                        : '',
                )}
                style={{
                    transform: `translateY(${pull - 44}px)`,
                    opacity: refreshing ? 1 : Math.max(0.25, progress),
                }}
            >
                {refreshing ? (
                    <LoaderCircle className="size-5 animate-spin" />
                ) : (
                    <ArrowDown
                        className="size-5 transition-transform duration-200"
                        style={{
                            transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
                        }}
                        strokeWidth={2.25}
                    />
                )}
            </div>
        </div>
    );
}
