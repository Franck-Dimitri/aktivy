import { usePage } from '@inertiajs/react';
import { MapPinOff } from 'lucide-react';

/**
 * Bandeau affiché à une hôtesse ou un superviseur qui n'est rattaché à aucun point de vente,
 * sur toutes les pages : sans affectation, les pages restent vides et il faut savoir pourquoi.
 */
export function NoSiteBanner() {
    const { auth } = usePage().props;

    if (!auth.noSite) return null;

    const isHostess = auth.user.role === 'field_agent';

    return (
        <div
            role="status"
            className="mx-4 mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 md:mx-6"
        >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <MapPinOff className="size-4" />
            </span>
            <div>
                <p className="text-sm font-semibold text-amber-900">
                    {isHostess
                        ? 'Vous n’êtes affectée à aucun point de vente'
                        : 'Vous ne supervisez aucun point de vente'}
                </p>
                <p className="mt-0.5 text-sm text-amber-800">
                    {isHostess
                        ? 'Vous ne pouvez pas prendre votre service ni envoyer de rapport. Contactez votre responsable pour être affectée.'
                        : 'Vos pages restent vides tant que votre gérant ne vous a pas affecté à un point de vente.'}
                </p>
            </div>
        </div>
    );
}
