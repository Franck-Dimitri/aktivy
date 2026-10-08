import type { ReactNode } from 'react';

export default function AuthStatus({ children }: { children: ReactNode }) {
    return (
        <div
            role="status"
            className="mb-6 rounded-lg border border-aktivy/40 bg-aktivy-soft px-4 py-3 text-sm font-medium text-aktivy-deep dark:bg-aktivy/10 dark:text-aktivy"
        >
            {children}
        </div>
    );
}
