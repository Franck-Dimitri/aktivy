import { cn } from '@/lib/utils';

export default function AktivyLogo({ className }: { className?: string }) {
    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-ink text-lg font-bold text-white dark:bg-white dark:text-ink">
                A
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-ink dark:text-white">
                Aktivy<span className="text-aktivy">.</span>
            </span>
        </span>
    );
}
