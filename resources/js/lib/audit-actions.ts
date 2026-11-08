/** Libellés des actions du journal d'audit ; une action inconnue s'affiche telle quelle. */
export const AUDIT_ACTIONS: Record<string, string> = {
    'auth.login': 'Connexion',
    'auth.login_failed': 'Échec de connexion',
    'company.registered': 'Inscription de l’entreprise',
    'company.created_by_admin': 'Entreprise créée par l’administration',
    'company.updated_by_admin': 'Informations corrigées par l’administration',
    'company.suspended': 'Entreprise suspendue',
    'company.reactivated': 'Entreprise réactivée',
    'company.settings_updated': 'Identité & marque modifiée',
    'company.reminders_updated': 'Horaires des rappels modifiés',
    'company.data_exported': 'Export complet des données',
    'plan.changed': 'Forfait modifié',
    'module.activated': 'Module activé',
    'module.deactivated': 'Module désactivé',
    'subscription.payment_recorded': 'Paiement enregistré',
    'subscription.reminder_sent': 'Relance d’abonnement envoyée',
    'reports.exported': 'Export des ventes',
    'daily_report.corrected': 'Rapport corrigé',
    'user.password_changed': 'Mot de passe changé',
    'staff.document_removed': 'Document du personnel retiré',
    'manager.verification_resent': 'E-mail de confirmation renvoyé',
    'manager.invitation_resent': 'Invitation renvoyée',
    'manager.invitation_opened': 'Invitation ouverte par le gérant',
    'manager.password_reset_sent': 'Lien de nouveau mot de passe envoyé',
    'admin.impersonation_started': 'Connexion « en tant que » le gérant',
    'admin.impersonation_ended': 'Fin de la connexion « en tant que »',
    'support.replied': 'Réponse du support',
    'staff.document_added': 'Document du personnel ajouté',
    'import.done': 'Import de fichier terminé',
    'daily_report.validated': 'Rapport validé',
};

export const auditLabel = (action: string) => AUDIT_ACTIONS[action] ?? action;

/** Famille d'une action (icône et couleur dans le journal). */
export type AuditFamily = 'login' | 'failed' | 'company' | 'billing' | 'admin' | 'support' | 'data' | 'account' | 'field';

export function auditFamily(action: string): AuditFamily {
    if (action === 'auth.login_failed') return 'failed';
    if (action.startsWith('auth.')) return 'login';
    if (action.startsWith('admin.') || action.startsWith('manager.') || action.endsWith('_by_admin')) return 'admin';
    if (action.startsWith('subscription.') || action.startsWith('plan.') || action.startsWith('module.')) return 'billing';
    if (action.startsWith('support.')) return 'support';
    if (action.startsWith('reports.') || action.startsWith('import.') || action === 'company.data_exported') return 'data';
    if (action.startsWith('company.')) return 'company';
    if (action.startsWith('user.')) return 'account';
    return 'field';
}
