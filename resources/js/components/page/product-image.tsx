import { Package } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Image produit : jamais rognée (object-contain), sur fond clair avec un peu d'air,
 * et repli propre sur une icône si l'image est absente ou ne charge pas.
 * La taille se règle avec className (ex. "size-12").
 */
export function ProductImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
    const [failed, setFailed] = useState(false);

    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-200/80',
                className,
            )}
        >
            {src && !failed ? (
                <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="size-full object-contain p-1.5" />
            ) : (
                <Package className="size-1/2 text-slate-300" aria-hidden="true" />
            )}
        </span>
    );
}
