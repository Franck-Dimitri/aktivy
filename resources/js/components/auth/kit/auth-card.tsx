import type { ReactNode } from 'react';

/*
 * Carte des pages de connexion, inscription, mot de passe… : volontairement légère.
 * Tout est visible dès le HTML envoyé par le serveur (aucun champ caché en attendant le JavaScript),
 * sans flou de verre ni animation continue : la page s'affiche même sur un téléphone lent ou ancien.
 * Seule une courte apparition en CSS (auth-in, app.css) est jouée, et jamais si l'utilisateur
 * a demandé de réduire les animations.
 */

/** Bloc de formulaire. Gardé pour les formulaires existants : simple conteneur, sans animation. */
export function StaggerItem({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <div className={className}>{children}</div>;
}

export function AuthCard({
    width = 420,
    children,
}: {
    width?: number;
    children: ReactNode;
}) {
    return (
        <div
            style={{ maxWidth: width }}
            className="auth-in mx-auto w-[92vw] rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_12px_32px_-16px_rgba(15,23,42,0.18)] sm:px-8 sm:py-7"
        >
            {children}
        </div>
    );
}

/** Titre et sous-titre au-dessus de la carte. */
export function AuthHeading({
    title,
    description,
}: {
    title?: string;
    description?: string;
}) {
    return (
        <div className="auth-in mb-5 px-4 text-center">
            {title && (
                <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-[26px]">
                    {title}
                </h1>
            )}
            {description && (
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-pretty text-slate-500">
                    {description}
                </p>
            )}
        </div>
    );
}
