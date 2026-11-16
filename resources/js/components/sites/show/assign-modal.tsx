import { router } from '@inertiajs/react';
import { CalendarRange, Clock, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Field, SelectInput, TextInput } from '@/components/page/form-fields';
import { Modal } from '@/components/page/modal';
import { toastFormError } from '@/lib/form-toast';
import {
    store as affectationStore,
    permuter as affectationPermuter,
} from '@/routes/affectations';
import { localISODate } from '@/lib/format';
import {
    type StaffOption,
    type AssignState,
} from '@/components/sites/show/types';
import { ModalFooter } from '@/components/sites/show/ui';

export function AssignModal({
    modal,
    siteId,
    staff,
    onClose,
}: {
    modal: AssignState & { open: true };
    siteId: number;
    staff: StaffOption[];
    onClose: () => void;
}) {
    const today = localISODate();
    const [userId, setUserId] = useState('');
    const [startsOn, setStartsOn] = useState(today);
    const [endsOn, setEndsOn] = useState('');
    const [slotStart, setSlotStart] = useState('');
    const [slotEnd, setSlotEnd] = useState('');
    const [saving, setSaving] = useState(false);

    const isSwap = modal.mode === 'permuter';

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !startsOn) return;

        const data = {
            user_id: Number(userId),
            starts_on: startsOn,
            ends_on: endsOn || undefined,
            slot_start: slotStart || undefined,
            slot_end: slotEnd || undefined,
        };

        const options = {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onSuccess: () => {
                toast.success(
                    isSwap ? 'Permutation effectuée' : 'Affectation créée',
                );
                onClose();
            },
            onError: toastFormError,
            onFinish: () => setSaving(false),
        };

        if (modal.mode === 'permuter') {
            router.post(
                affectationPermuter({ affectation: modal.replacingUuid }).url,
                data,
                options,
            );
        } else {
            router.post(
                affectationStore().url,
                { ...data, site_id: siteId },
                options,
            );
        }
    };

    return (
        <Modal
            onClose={() => !saving && onClose()}
            title={isSwap ? "Permuter l'hôtesse" : 'Affecter un membre'}
            description={
                isSwap
                    ? `Remplace ${modal.replacingName}`
                    : 'Choisissez un membre et sa période.'
            }
        >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <Field
                        label="Hôtesse / Superviseur"
                        htmlFor="as_user"
                        required
                    >
                        <SelectInput
                            id="as_user"
                            icon={User}
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            required
                        >
                            <option value="">Choisir un membre…</option>
                            {staff.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label} · {s.role_label}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Début" htmlFor="as_start" required>
                            <TextInput
                                id="as_start"
                                type="date"
                                icon={CalendarRange}
                                value={startsOn}
                                onChange={(e) => setStartsOn(e.target.value)}
                                required
                            />
                        </Field>
                        <Field label="Fin" htmlFor="as_end" hint="(optionnel)">
                            <TextInput
                                id="as_end"
                                type="date"
                                icon={CalendarRange}
                                value={endsOn}
                                onChange={(e) => setEndsOn(e.target.value)}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Heure de début" htmlFor="as_slot_start">
                            <TextInput
                                id="as_slot_start"
                                type="time"
                                icon={Clock}
                                value={slotStart}
                                onChange={(e) => setSlotStart(e.target.value)}
                            />
                        </Field>
                        <Field label="Heure de fin" htmlFor="as_slot_end">
                            <TextInput
                                id="as_slot_end"
                                type="time"
                                icon={Clock}
                                value={slotEnd}
                                onChange={(e) => setSlotEnd(e.target.value)}
                            />
                        </Field>
                    </div>
                </div>
                <ModalFooter
                    onCancel={onClose}
                    saving={saving}
                    submitLabel={isSwap ? 'Permuter' : 'Affecter'}
                    savingLabel="Enregistrement…"
                    disabled={!userId || !startsOn}
                />
            </form>
        </Modal>
    );
}
