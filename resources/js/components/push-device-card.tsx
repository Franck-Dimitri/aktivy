import { usePage } from '@inertiajs/react';
import { BellOff, BellRing, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { disablePush, enablePush, isIOS, isStandalone, pushState, type PushState } from '@/lib/pwa';
import { cn } from '@/lib/utils';

/**
 * Notifications push sur l'appareil en cours : état, activation (au clic) et désactivation.
 * Sur iPhone, le push n'existe que dans l'application installée : on l'indique.
 */
export function PushDeviceCard() {
    const { push } = usePage().props as { push?: { publicKey: string | null } };
    const publicKey = push?.publicKey ?? null;
    const [state, setState] = useState<PushState | 'needs-install' | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!publicKey) return;
        if (isIOS() && !isStandalone()) {
            setState('needs-install');
            return;
        }
        pushState().then(setState).catch(() => setState('unsupported'));
    }, [publicKey]);

    if (!publicKey || state === null || state === 'unsupported') return null;

    const enable = async () => {
        setBusy(true);
        try {
            const next = await enablePush(publicKey);
            setState(next);
            if (next === 'enabled') toast.success('Notifications activées sur cet appareil');
            if (next === 'denied') toast.error('Notifications refusées', { description: 'Autorisez-les dans les réglages du navigateur ou du téléphone.' });
        } catch {
            toast.error('Activation impossible', { description: 'Vérifiez votre connexion et réessayez.' });
        } finally {
            setBusy(false);
        }
    };

    const disable = async () => {
        setBusy(true);
        try {
            await disablePush();
            setState('available');
            toast.success('Notifications désactivées sur cet appareil');
        } finally {
            setBusy(false);
        }
    };

    const content = {
        enabled: { icon: BellRing, tone: 'bg-motriks-soft text-motriks-deep', title: 'Activées sur cet appareil', text: 'Vous êtes prévenu en temps réel, même application fermée.' },
        available: { icon: BellRing, tone: 'bg-slate-100 text-slate-500 dark:bg-white/5', title: 'Recevoir les notifications sur cet appareil', text: 'Prises de service, rapports, stocks bas, demandes et rappels, dès qu’ils arrivent.' },
        denied: { icon: BellOff, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10', title: 'Notifications bloquées', text: 'Elles ont été refusées : autorisez-les dans les réglages du navigateur ou du téléphone, puis revenez ici.' },
        'needs-install': { icon: Smartphone, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10', title: 'Installez Motriks pour être notifié', text: 'Sur iPhone, les notifications passent par l’application installée : Partager › Sur l’écran d’accueil, dans Safari.' },
    }[state];
    const Icon = content.icon;

    return (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] sm:flex-row sm:items-center sm:p-5 dark:border-sidebar-border dark:bg-card">
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', content.tone)}>
                <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{content.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{content.text}</p>
            </div>
            {state === 'available' && (
                <ActionButton icon={<BellRing />} loading={busy} onClick={enable} className="w-full sm:w-auto">
                    Activer les notifications
                </ActionButton>
            )}
            {state === 'enabled' && (
                <ActionButton variant="secondary" size="sm" loading={busy} onClick={disable} className="w-full sm:w-auto">
                    Désactiver
                </ActionButton>
            )}
        </section>
    );
}
