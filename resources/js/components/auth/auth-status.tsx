import type { ReactNode } from 'react';

export default function AuthStatus({ children }: { children: ReactNode }) {
    return (
        <div
            role="status"
            className="mb-6 rounded-lg border border-motriks/40 bg-motriks-soft px-4 py-3 text-sm font-medium text-motriks-deep dark:bg-motriks/10 dark:text-motriks"
        >
            {children}
        </div>
    );
}
