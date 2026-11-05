import { usePage } from '@inertiajs/react';
import { Bell, Check, Compass, Download, PlusSquare, Share, Smartphone, WifiOff, Zap } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/page/buttons';
import { Modal } from '@/components/page/modal';
import {
    canPromptInstall,
    enablePush,
    installSnoozed,
    isAndroid,
    isIOS,
    isIOSSafari,
    isMobileDevice,
    isStandalone,
    onInstallChange,
    promptInstall,
    pushSnoozed,
    pushSupported,
    snoozeInstall,
    snoozePush,
} from '@/lib/pwa';

type Step = 'ask' | 'ios' | 'push' | null;

/** Délai avant de proposer quoi que ce soit : la personne doit d'abord voir la page. */
const DELAY_MS = 3500;

function Benefit({ icon: Icon, children }: { icon: typeof Zap; children: ReactNode }) {
    return (
        <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-motriks-soft text-motriks-deep">
                <Icon className="size-4" />
            </span>
            <span className="pt-1.5 leading-snug">{children}</span>
        </li>
    );
}

function IosStep({ n, icon: Icon, children }: { n: number; icon: typeof Share; children: ReactNode }) {
    return (
        <li className="flex items-center gap-3.5 rounded-xl border border-slate-200 p-3.5 dark:border-sidebar-border">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white tabular-nums dark:bg-white dark:text-slate-900">{n}</span>
            <span className="min-w-0 flex-1 text-sm text-ink">{children}</span>
            <Icon className="size-5 shrink-0 text-sky-600" />
        </li>
    );
}

/**
 * Sur téléphone uniquement : propose d'installer Motriks (Android : fenêtre du système ; iPhone :
 * étapes dans Safari), puis, une fois l'application installée, d'activer les notifications.
 * « Non, merci » ou « Plus tard » : plus rien pendant 7 jours.
 */
export function InstallPrompt() {
    const { push } = usePage().props as { push?: { publicKey: string | null } };
    const publicKey = push?.publicKey ?? null;
    const [step, setStep] = useState<Step>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !isMobileDevice()) return;

        const decide = () => {
            if (isStandalone()) {
                // Installée : proposer les notifications (clic obligatoire, exigé par iOS)
                if (publicKey && pushSupported() && Notification.permission === 'default' && !pushSnoozed()) setStep('push');
                return;
            }
            if (installSnoozed()) return;
            // Android : seulement si le système confirme que l'installation est possible
            if (isAndroid() && !canPromptInstall()) return;
            setStep('ask');
        };

        const timer = window.setTimeout(decide, DELAY_MS);
        // Android peut signaler l'installabilité après le délai
        const off = onInstallChange(() => {
            if (isStandalone() || installSnoozed()) return setStep((s) => (s === 'ask' ? null : s));
            if (isAndroid() && canPromptInstall()) setStep((s) => s ?? 'ask');
        });

        return () => {
            window.clearTimeout(timer);
            off();
        };
    }, [publicKey]);

    const close = () => setStep(null);

    const declineInstall = () => {
        snoozeInstall();
        close();
    };

    const acceptInstall = async () => {
        if (isIOS()) return setStep('ios');
        setBusy(true);
        try {
            const accepted = await promptInstall();
            if (accepted) {
                toast.success('Motriks est installé', { description: 'Retrouvez-le sur votre écran d’accueil.' });
                // L'abonnement aux notifications vaut pour l'application installée aussi
                setStep(publicKey && pushSupported() && Notification.permission === 'default' ? 'push' : null);
            } else {
                snoozeInstall();
                close();
            }
        } finally {
            setBusy(false);
        }
    };

    const acceptPush = async () => {
        if (!publicKey) return close();
        setBusy(true);
        try {
            const state = await enablePush(publicKey);
            if (state === 'enabled') toast.success('Notifications activées', { description: 'Vous serez prévenu en temps réel sur ce téléphone.' });
            else if (state === 'denied') toast.error('Notifications refusées', { description: 'Vous pourrez les autoriser plus tard dans les réglages du téléphone.' });
            close();
        } catch {
            toast.error('Activation impossible', { description: 'Vérifiez votre connexion et réessayez depuis la page Notifications.' });
        } finally {
            setBusy(false);
        }
    };

    const declinePush = () => {
        snoozePush();
        close();
    };

    if (!step) return null;

    if (step === 'push') {
        return (
            <Modal onClose={declinePush} title="Activer les notifications ?" description="Soyez prévenu en temps réel, même application fermée." icon={<Bell />}>
                <div className="flex flex-col gap-3 px-6 pt-2 pb-6">
                    <ul className="flex flex-col gap-2.5">
                        <Benefit icon={Zap}>Prises de service, rapports, stocks bas et demandes, dès qu’ils arrivent.</Benefit>
                        <Benefit icon={Bell}>Rappels utiles au bon moment, jamais la nuit.</Benefit>
                    </ul>
                </div>
                <footer className="flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-sidebar-border">
                    <ActionButton variant="secondary" className="flex-1" onClick={declinePush} disabled={busy}>
                        Plus tard
                    </ActionButton>
                    <ActionButton className="flex-1" icon={<Bell />} loading={busy} onClick={acceptPush}>
                        Activer
                    </ActionButton>
                </footer>
            </Modal>
        );
    }

    if (step === 'ios') {
        const safari = isIOSSafari();
        return (
            <Modal onClose={close} title="Installer sur l’iPhone" description="Trois gestes, et Motriks rejoint votre écran d’accueil." icon={<Smartphone />}>
                <div className="flex flex-col gap-3 px-6 pt-2 pb-6">
                    {!safari && (
                        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                            <Compass className="mt-px size-4 shrink-0" />
                            L’installation ne fonctionne que dans Safari. Ouvrez cette page dans Safari, puis suivez les étapes.
                        </p>
                    )}
                    <ol className="flex flex-col gap-2">
                        <IosStep n={1} icon={Share}>
                            Touchez <strong>Partager</strong> en bas de Safari
                        </IosStep>
                        <IosStep n={2} icon={PlusSquare}>
                            Choisissez <strong>Sur l’écran d’accueil</strong>
                        </IosStep>
                        <IosStep n={3} icon={Check}>
                            Touchez <strong>Ajouter</strong>
                        </IosStep>
                    </ol>
                    <p className="text-xs leading-relaxed text-slate-500">Ouvrez ensuite Motriks depuis son icône : vous pourrez y activer les notifications.</p>
                </div>
                <footer className="flex border-t border-slate-100 px-6 py-4 dark:border-sidebar-border">
                    <ActionButton className="flex-1" onClick={() => { snoozeInstall(); close(); }}>
                        J’ai compris
                    </ActionButton>
                </footer>
            </Modal>
        );
    }

    return (
        <Modal onClose={declineInstall} title="Installer Motriks ?" description="Votre espace, directement sur l’écran d’accueil." icon={<Download />}>
            <div className="flex flex-col gap-3 px-6 pt-2 pb-6">
                <ul className="flex flex-col gap-2.5">
                    <Benefit icon={Zap}>S’ouvre en un geste, en plein écran, comme une application.</Benefit>
                    <Benefit icon={WifiOff}>Continue de fonctionner quand le réseau faiblit.</Benefit>
                    <Benefit icon={Bell}>Notifications en temps réel sur votre téléphone.</Benefit>
                </ul>
            </div>
            <footer className="flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-sidebar-border">
                <ActionButton variant="secondary" className="flex-1" onClick={declineInstall} disabled={busy}>
                    Non, merci
                </ActionButton>
                <ActionButton className="flex-1" icon={<Download />} loading={busy} onClick={acceptInstall}>
                    Oui, installer
                </ActionButton>
            </footer>
        </Modal>
    );
}
