import type { StatusTone } from '@/components/page/status-badge';

export type TicketStatus = 'open' | 'in_review' | 'closed';

export type Ticket = {
    id: number;
    uuid: string;
    subject: string;
    body: string;
    priority: 'normal' | 'urgent';
    status: TicketStatus;
    response: string | null;
    responder: string | null;
    responded_at: string | null;
    created_at: string;
    created_date: string;
    agent_name: string | null;
    agent_phone: string | null;
};

export const STATUS: Record<TicketStatus, { tone: StatusTone; label: string }> = {
    open: { tone: 'info', label: 'Ouvert' },
    in_review: { tone: 'warning', label: 'En cours' },
    closed: { tone: 'success', label: 'Résolu' },
};

export function initials(name: string): string {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase() || '?'
    );
}
