import MotriksMark from '@/components/motriks-mark';

export default function AppLogo() {
    return (
        <>
            <MotriksMark className="size-8" />
            <span className="ml-0.5 truncate text-xl font-extrabold tracking-tight text-ink dark:text-white">
                Motriks<span className="text-motriks">.</span>
            </span>
        </>
    );
}
