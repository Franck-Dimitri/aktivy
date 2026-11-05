import { AlertTriangle, Bell, Building2, ClipboardList, MessageSquarePlus, PackageX, Target, UserX, type LucideIcon } from 'lucide-react';

export type NotificationKind = 'incident' | 'stock' | 'ticket' | 'attendance' | 'reminder' | 'signup' | 'target';

export type NotificationItem = {
    id: string;
    kind: NotificationKind | null;
    title: string;
    body: string;
    read: boolean;
    /** Durée écoulée (« il y a 2 heures »). */
    date: string;
    /** Date ISO 8601. */
    at: string;
};

type KindStyle = { icon: LucideIcon; label: string; tile: string; explain?: string };

/** Icône, libellé et teinte de chaque type de notification (cloche et page Notifications). */
export const NOTIFICATION_KINDS: Record<NotificationKind, KindStyle> = {
    incident: { icon: AlertTriangle, label: 'Incidents', tile: 'bg-red-50 text-red-600 ring-red-600/10', explain: 'Une hôtesse signale un incident sur son point de vente.' },
    stock: { icon: PackageX, label: 'Stock', tile: 'bg-amber-50 text-amber-600 ring-amber-600/10', explain: 'Un produit passe sous son seuil critique.' },
    ticket: { icon: MessageSquarePlus, label: 'Demandes', tile: 'bg-sky-50 text-sky-600 ring-sky-600/10', explain: 'Une hôtesse vous envoie une demande, ou on répond à la vôtre.' },
    attendance: { icon: UserX, label: 'Absences', tile: 'bg-violet-50 text-violet-600 ring-violet-600/10', explain: 'Des hôtesses n’ont pas pointé 30 min après le début de leur créneau.' },
    reminder: { icon: ClipboardList, label: 'Rappels', tile: 'bg-motriks-soft text-motriks-deep ring-motriks/10', explain: 'Un rapport du jour est resté en brouillon le soir.' },
    signup: { icon: Building2, label: 'Inscriptions', tile: 'bg-teal-50 text-teal-600 ring-teal-600/10', explain: 'Une entreprise envoie son dossier d’inscription.' },
    target: { icon: Target, label: 'Objectifs', tile: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10', explain: 'Votre responsable vous fixe un objectif pour la semaine.' },
};

export const FALLBACK_KIND: KindStyle = { icon: Bell, label: 'Autres', tile: 'bg-slate-100 text-slate-500 ring-slate-500/10' };

export const kindStyle = (kind: NotificationKind | null): KindStyle => (kind && NOTIFICATION_KINDS[kind]) || FALLBACK_KIND;
