import {
    useEffect,
    useReducer,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { showcases } from '@/components/auth/showcases';
import type { ShowcaseName } from '@/components/auth/showcases';
import { cn } from '@/lib/utils';

const SLIDE_DURATION_MS = 6000;
const TICK_MS = 100;
const SWIPE_THRESHOLD_PX = 60;

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
    const media = window.matchMedia(reducedMotionQuery);
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
}

function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(
        subscribeToReducedMotion,
        () => window.matchMedia(reducedMotionQuery).matches,
        () => false,
    );
}

type CarouselState = {
    active: number;
    progress: number;
};

type CarouselAction =
    | { type: 'tick'; count: number }
    | { type: 'go'; index: number; count: number };

function carouselReducer(
    state: CarouselState,
    action: CarouselAction,
): CarouselState {
    if (action.type === 'go') {
        return {
            active: (action.index + action.count) % action.count,
            progress: 0,
        };
    }

    const progress = state.progress + TICK_MS / SLIDE_DURATION_MS;

    return progress >= 1
        ? { active: (state.active + 1) % action.count, progress: 0 }
        : { ...state, progress };
}

export default function AuthShowcase({ name }: { name: ShowcaseName }) {
    const { background, decoration, slides } = showcases[name];
    const count = slides.length;
    const [{ active, progress }, dispatch] = useReducer(carouselReducer, {
        active: 0,
        progress: 0,
    });
    const [dragOffset, setDragOffset] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [focused, setFocused] = useState(false);
    const dragStart = useRef<number | null>(null);
    const reducedMotion = usePrefersReducedMotion();

    const paused = focused || dragging || reducedMotion || count < 2;

    useEffect(() => {
        if (paused) {
            return;
        }

        const timer = window.setInterval(
            () => dispatch({ type: 'tick', count }),
            TICK_MS,
        );

        return () => window.clearInterval(timer);
    }, [paused, count]);

    const goTo = (index: number) => dispatch({ type: 'go', index, count });

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (count < 2) {
            return;
        }

        dragStart.current = event.clientX;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (dragStart.current !== null) {
            setDragOffset(event.clientX - dragStart.current);
        }
    };

    const onPointerEnd = () => {
        if (dragOffset <= -SWIPE_THRESHOLD_PX) {
            goTo(active + 1);
        } else if (dragOffset >= SWIPE_THRESHOLD_PX) {
            goTo(active - 1);
        }

        dragStart.current = null;
        setDragging(false);
        setDragOffset(0);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowRight') {
            goTo(active + 1);
        } else if (event.key === 'ArrowLeft') {
            goTo(active - 1);
        }
    };

    return (
        <section
            aria-roledescription="carrousel"
            aria-label="Ce que fait Aktivy"
            className={cn('relative flex h-full w-full flex-col', background)}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                {decoration}
                <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0f2e0b]/50 via-[#0f2e0b]/25 to-transparent" />
            </div>

            <div
                className={cn(
                    'relative flex-1 touch-pan-y overflow-hidden select-none',
                    count > 1 && 'cursor-grab active:cursor-grabbing',
                )}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
            >
                <div
                    className={cn(
                        'flex h-full',
                        !dragging &&
                            !reducedMotion &&
                            'transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    )}
                    style={{
                        transform: `translateX(calc(${-active * 100}% + ${dragOffset}px))`,
                    }}
                >
                    {slides.map((slide, index) => (
                        <div
                            key={slide.title}
                            role="group"
                            aria-roledescription="diapositive"
                            aria-label={`${index + 1} sur ${count}`}
                            aria-hidden={index !== active}
                            className="flex h-full w-full shrink-0 flex-col justify-end gap-10 px-12 pt-16 pb-6 xl:px-20"
                        >
                            <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 items-center">
                                {slide.illustration}
                            </div>
                            <div className="max-w-xl">
                                <h2 className="text-3xl leading-[1.15] font-extrabold tracking-tight text-balance text-white xl:text-[2.6rem]">
                                    {slide.title}
                                </h2>
                                <p className="mt-4 max-w-lg text-base leading-relaxed text-white/90">
                                    {slide.text}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div
                className="relative flex h-[60px] items-center gap-2 px-12 pb-12 xl:px-20"
                onKeyDown={onKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            >
                {count > 1 &&
                    slides.map((slide, index) => (
                        <button
                            key={slide.title}
                            type="button"
                            onClick={() => goTo(index)}
                            aria-label={`Afficher la diapositive ${index + 1} sur ${count}`}
                            aria-current={index === active}
                            className={cn(
                                'relative h-1.5 cursor-pointer overflow-hidden rounded-full bg-white/30 transition-[width] duration-300 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2f771e] focus-visible:outline-none',
                                index === active
                                    ? 'w-16'
                                    : 'w-8 hover:bg-white/50',
                            )}
                        >
                            {index === active && (
                                <span
                                    className="absolute inset-0 origin-left rounded-full bg-white transition-transform ease-linear"
                                    style={{
                                        transform: `scaleX(${reducedMotion ? 1 : progress})`,
                                        transitionDuration:
                                            progress === 0
                                                ? '0ms'
                                                : `${TICK_MS}ms`,
                                    }}
                                />
                            )}
                        </button>
                    ))}
            </div>
        </section>
    );
}
