import { AlertTriangle, Bell, Building2, CalendarCheck, Camera, ClipboardList, CreditCard, FileCheck2, MapPinned, MessageSquarePlus, PackageX, Target, UserCheck, UserX, type LucideIcon } from 'lucide-react';

/** Catégories envoyées par le serveur (App\Notifications\*::kind()). */
export type NotificationKind =
    | 'incident'
    | 'stock'
    | 'ticket'
    | 'attendance'
    | 'reminder'
    | 'signup'
    | 'target'
    | 'presence'
    | 'report'
    | 'photo'
    | 'assignment'
    | 'event'
    | 'module';

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
    stock: { icon: PackageX, label: 'Stock', tile: 'bg-amber-50 text-amber-600 ring-amber-600/10', explain: 'Un produit passe sous son seuil, ou un réassort arrive.' },
    ticket: { icon: MessageSquarePlus, label: 'Demandes', tile: 'bg-sky-50 text-sky-600 ring-sky-600/10', explain: 'Une hôtesse vous envoie une demande, ou on répond à la vôtre.' },
    attendance: { icon: UserX, label: 'Retards', tile: 'bg-violet-50 text-violet-600 ring-violet-600/10', explain: 'Une hôtesse n’a pas pointé après le début de son créneau.' },
    reminder: { icon: ClipboardList, label: 'Rappels', tile: 'bg-motriks-soft text-motriks-deep ring-motriks/10', explain: 'Prise de service, fin de créneau, rapport à envoyer.' },
    signup: { icon: Building2, label: 'Inscriptions', tile: 'bg-teal-50 text-teal-600 ring-teal-600/10', explain: 'Une entreprise crée son compte ou envoie son dossier.' },
    target: { icon: Target, label: 'Objectifs', tile: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10', explain: 'Un objectif est fixé, ou atteint.' },
    presence: { icon: UserCheck, label: 'Présence', tile: 'bg-green-50 text-green-700 ring-green-600/10', explain: 'Une hôtesse prend son service ou termine sa journée.' },
    report: { icon: FileCheck2, label: 'Rapports', tile: 'bg-indigo-50 text-indigo-600 ring-indigo-600/10', explain: 'Un rapport est envoyé, ou manque le soir.' },
    photo: { icon: Camera, label: 'Photos', tile: 'bg-pink-50 text-pink-600 ring-pink-600/10', explain: 'Une preuve photo est jointe à un rapport.' },
    assignment: { icon: MapPinned, label: 'Affectations', tile: 'bg-cyan-50 text-cyan-700 ring-cyan-600/10', explain: 'Vous êtes affectée à un point de vente ou à un événement.' },
    event: { icon: CalendarCheck, label: 'Événements', tile: 'bg-orange-50 text-orange-600 ring-orange-600/10', explain: 'Un événement démarre demain, ou une nouvelle offre est disponible.' },
    module: { icon: CreditCard, label: 'Abonnement', tile: 'bg-slate-100 text-slate-600 ring-slate-500/10', explain: 'Un module est activé, désactivé ou arrive à échéance.' },
};

export const FALLBACK_KIND: KindStyle = { icon: Bell, label: 'Autres', tile: 'bg-slate-100 text-slate-500 ring-slate-500/10' };

export const kindStyle = (kind: NotificationKind | null): KindStyle => (kind && NOTIFICATION_KINDS[kind]) || FALLBACK_KIND;
