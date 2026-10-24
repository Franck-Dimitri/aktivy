import { cn } from '@/lib/utils';
import MotriksMark from '@/components/motriks-mark';

export default function MotriksLogo({ className }: { className?: string }) {
    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <MotriksMark />
            <span className="text-2xl font-extrabold tracking-tight text-ink dark:text-white">
                Motriks<span className="text-motriks">.</span>
            </span>
        </span>
    );
}
