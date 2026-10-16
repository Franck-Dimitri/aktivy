import { toast } from 'sonner';

/** À passer en `onError` d'une visite Inertia : affiche la première erreur de validation. */
export function toastFormError(errors: Record<string, string>) {
    const first = Object.values(errors)[0];

    toast.error('Enregistrement impossible', {
        description: first ?? 'Vérifiez les champs en erreur.',
    });
}
