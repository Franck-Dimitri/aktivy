import { CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AuthStatus({ children }: { children: ReactNode }) {
    return (
        <div role="status" className="mb-5 flex items-start gap-2.5 rounded-xl border border-green-200 bg-motriks-soft px-3.5 py-3 text-sm leading-relaxed font-medium text-motriks-deep">
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{children}</span>
        </div>
    );
}
