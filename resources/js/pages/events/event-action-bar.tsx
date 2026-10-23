import { router } from '@inertiajs/react';
import { Check, Zap } from 'lucide-react';
import { ActionButton } from '@/components/page/buttons';
import { activate as eventActivate } from '@/routes/events';
import type { EventData } from './types';

export function EventActionBar({ event }: { event: EventData }) {
    function activate() {
        if (!confirm('Lancer l\'événement ? Les affectations terrain seront créées automatiquement.')) return;
        router.post(eventActivate({ event: event.id }).url, { action: 'activate' });
    }

    function complete() {
        if (!confirm('Clôturer l\'événement ? Les hôtesses recrutées seront archivées.')) return;
        router.post(eventActivate({ event: event.id }).url, { action: 'complete' });
    }

    if (event.status === 'draft') {
        return (
            <ActionButton icon={<Zap />} onClick={activate}>
                Lancer l'événement
            </ActionButton>
        );
    }

    if (event.status === 'active') {
        return (
            <ActionButton icon={<Check />} onClick={complete} variant="secondary">
                Clôturer l'événement
            </ActionButton>
        );
    }

    return null;
}
