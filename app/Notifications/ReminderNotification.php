<?php

namespace App\Notifications;

use App\Models\Event;
use App\Models\Ticket;

/**
 * Rappels planifiés (commande reminders:run) : sous la cloche et en push.
 * Un constructeur nommé par cas ; les doublons sont évités par App\Models\ReminderLog.
 */
class ReminderNotification extends TextNotification
{
    /** « Awa, Brenda et 2 autres » */
    private static function names(array $names, int $max = 3): string
    {
        $shown = array_slice($names, 0, $max);
        $rest = count($names) - count($shown);

        if ($rest > 0) {
            return implode(', ', $shown)." et {$rest} autre".($rest > 1 ? 's' : '');
        }

        return count($shown) > 1 ? implode(', ', array_slice($shown, 0, -1)).' et '.end($shown) : ($shown[0] ?? '');
    }

    // ── Hôtesse ──────────────────────────────────────────────────────────

    public static function shiftUpcoming(string $site, string $start): self
    {
        return new self('shift_upcoming', 'reminder',
            "Prise de service à {$start}",
            "{$site} · pensez à pointer dès votre arrivée.",
            'terrain.home');
    }

    public static function shiftLate(string $site, string $start): self
    {
        return new self('shift_late', 'attendance',
            'Vous n’avez pas encore pointé',
            "Vous étiez attendue à {$start} à {$site}. Prenez votre service dès votre arrivée.",
            'terrain.home');
    }

    public static function closing(string $site, string $end, int $visitId): self
    {
        return new self('closing', 'reminder',
            "Fin de créneau à {$end}",
            "{$site} · comptez votre stock et envoyez votre rapport avant de terminer.",
            'terrain.report.show', ['visit' => $visitId]);
    }

    public static function reportNotSent(string $site, int $visitId): self
    {
        return new self('report_not_sent', 'reminder',
            'Votre rapport n’est pas encore envoyé',
            "{$site} · saisissez vos ventes et envoyez le rapport du jour.",
            'terrain.report.show', ['visit' => $visitId]);
    }

    // ── Responsable ──────────────────────────────────────────────────────

    /** @param  array<int, string>  $hostesses */
    public static function missingReports(array $hostesses): self
    {
        $n = count($hostesses);

        return new self('missing_reports', 'report',
            $n > 1 ? "{$n} rapports manquants aujourd’hui" : 'Un rapport manquant aujourd’hui',
            'Pas encore de rapport envoyé : '.self::names($hostesses).'.',
            'daily-reports.index');
    }

    public static function lowStock(int $total, int $critical, array $sites): self
    {
        return new self('low_stock', 'stock',
            $total > 1 ? "{$total} produits sous leur seuil" : 'Un produit sous son seuil',
            ($critical ? "Dont {$critical} critique".($critical > 1 ? 's' : '').' · ' : '').self::names($sites, 2).'.',
            'stock-alerts.index');
    }

    public static function ticketUnanswered(Ticket $ticket, int $hours): self
    {
        return new self('ticket_unanswered', 'ticket',
            "Demande sans réponse depuis {$hours} h",
            "« {$ticket->subject} » · ".($ticket->agent?->name ?? 'une hôtesse').'.',
            'tickets.index');
    }

    public static function eventTomorrow(Event $event, bool $forHostess): self
    {
        $place = collect([$event->location, $event->city])->filter()->implode(', ');

        return $forHostess
            ? new self('event_tomorrow', 'event', "Demain : {$event->name}",
                ($place ? "{$place} · " : '').'Préparez-vous, vous êtes attendue.', 'terrain.home')
            : new self('event_tomorrow', 'event', "Demain : {$event->name}",
                ($place ? "{$place} · " : '').$event->hostesses()->count().' hôtesse(s), '.$event->sites()->count().' point(s) de vente.',
                'events.show', ['event' => $event->id]);
    }

    // ── Administrateur de la plateforme ──────────────────────────────────

    /** @param  array<int, string>  $companies */
    public static function subscriptionsExpiring(array $companies, int $days): self
    {
        $n = count($companies);
        $when = $days === 1 ? 'demain' : "dans {$days} jours";

        return new self('subscriptions_expiring', 'module',
            $n > 1 ? "{$n} abonnements expirent {$when}" : "Un abonnement expire {$when}",
            self::names($companies).'. Pensez à les relancer.',
            'admin.companies.index');
    }
}
