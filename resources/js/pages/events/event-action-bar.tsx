import { router } from '@inertiajs/react';
import { CheckCircle2, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { ActionButton } from '@/components/page/buttons';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { activate as eventActivate, destroy as eventDestroy } from '@/routes/events';
import type { EventData } from './types';

type Pending = 'activate' | 'complete' | 'delete' | null;

/** Actions de l'événement : lancer (brouillon), clôturer (en cours), supprimer (hors cours), avec confirmation. */
export function EventActionBar({ event }: { event: EventData }) {
    const [pending, setPending] = useState<Pending>(null);
    const [shown, setShown] = useState<Exclude<Pending, null>>('activate');
    const [processing, setProcessing] = useState(false);

    const ask = (p: Exclude<Pending, null>) => {
        setShown(p);
        setPending(p);
    };

    const run = () => {
        const options = { preserveScroll: true, onStart: () => setProcessing(true), onFinish: () => setProcessing(false), onSuccess: () => setPending(null) };

        if (shown === 'delete') {
            router.delete(eventDestroy({ event: event.id }).url, options);
        } else {
            router.post(eventActivate({ event: event.id }).url, { action: shown }, options);
        }
    };

    const unassigned = event.hostesses.filter((h) => !h.event_site_id).length;
    const warnings = [
        event.sites.length === 0 && 'aucun point de vente',
        event.hostesses.length === 0 && 'aucune hôtesse',
        unassigned > 0 && `${unassigned} hôtesse${unassigned > 1 ? 's' : ''} sans point de vente`,
    ].filter(Boolean) as string[];

    const dialogs = {
        activate: {
            title: `Lancer « ${event.name} » ?`,
            description: warnings.length
                ? `Attention : ${warnings.join(', ')}. Les hôtesses affectées à un point de vente pourront se connecter et déclarer leurs ventes.`
                : 'Les affectations terrain sont créées et les hôtesses peuvent se connecter pour déclarer leurs ventes.',
            confirm: 'Lancer l’événement',
            tone: 'primary' as const,
            icon: Zap,
        },
        complete: {
            title: `Clôturer « ${event.name} » ?`,
            description: 'L’événement passe en « Terminé ». Les hôtesses recrutées pour l’occasion sont archivées ; les ventes restent consultables.',
            confirm: 'Clôturer',
            tone: 'primary' as const,
            icon: CheckCircle2,
        },
        delete: {
            title: `Supprimer « ${event.name} » ?`,
            description: 'L’événement disparaît de votre liste, avec ses points de vente, ses packs et ses hôtesses.',
            confirm: 'Supprimer',
            tone: 'danger' as const,
            icon: Trash2,
        },
    }[shown];

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                {event.status !== 'active' && (
                    <ActionButton variant="icon-danger" size="icon" icon={<Trash2 />} onClick={() => ask('delete')} aria-label="Supprimer l’événement" title="Supprimer" className="size-10 rounded-xl sm:size-10" />
                )}
                {event.status === 'draft' && (
                    <ActionButton icon={<Zap />} onClick={() => ask('activate')}>
                        Lancer l’événement
                    </ActionButton>
                )}
                {event.status === 'active' && (
                    <ActionButton variant="secondary" icon={<CheckCircle2 />} onClick={() => ask('complete')}>
                        Clôturer
                    </ActionButton>
                )}
            </div>

            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => !open && setPending(null)}
                title={dialogs.title}
                description={dialogs.description}
                confirmLabel={dialogs.confirm}
                tone={dialogs.tone}
                icon={dialogs.icon}
                loading={processing}
                onConfirm={run}
            />
        </>
    );
}
