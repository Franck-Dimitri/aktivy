<?php

namespace App\Notifications;

use App\Enums\Plan;
use App\Models\Affectation;
use App\Models\Company;
use App\Models\DailyReport;
use App\Models\Event;
use App\Models\EventHostess;
use App\Models\EventPack;
use App\Models\SiteProduct;
use App\Models\User;
use App\Models\Visit;
use App\Support\CheckinPlace;
use App\Support\Pdf\PdfDocument;

/**
 * Notifications « temps réel » : envoyées au moment de l'action, sous la cloche et en push.
 * Un constructeur nommé par cas ; les textes sont courts, à lire sur un écran verrouillé.
 */
class LiveNotification extends TextNotification
{
    private static function fcfa(float|int $amount): string
    {
        return PdfDocument::money($amount, 'FCFA');
    }

    // ── Stock ────────────────────────────────────────────────────────────

    /** Un produit passe sous son seuil d'alerte (le seuil critique a sa propre notification). */
    public static function stockLow(SiteProduct $stock, int $remaining): self
    {
        return new self('stock_low', 'stock',
            "Stock bas · {$stock->product?->name}",
            "Il reste {$remaining} {$stock->product?->unit} à {$stock->site?->name} (seuil d’alerte : {$stock->alert_threshold}).",
            'stock-alerts.index');
    }

    /** Pour les hôtesses du site : la livraison est arrivée. */
    public static function restocked(SiteProduct $stock, int $quantity): self
    {
        return new self('restocked', 'stock',
            "Réassort reçu · {$stock->site?->name}",
            "+{$quantity} {$stock->product?->unit} de {$stock->product?->name}. Stock disponible : {$stock->current_stock}.",
            'terrain.home');
    }

    // ── Journée de l'hôtesse ─────────────────────────────────────────────

    /**
     * Où elle a pointé, dès la notification : le titre le dit quand ce n'est pas sur son point de vente.
     * Les autres points de vente ne sont chargés que pour un pointage hors site.
     */
    public static function shiftStarted(Visit $visit, User $hostess): self
    {
        $place = CheckinPlace::describe($visit, $visit->site, $visit->isOffSite() ? CheckinPlace::companySites($visit->company_id) : null);

        $title = match ($place['state']) {
            'other_site', 'off_site' => "{$hostess->name} a pris son service hors de son point de vente",
            'unknown' => "{$hostess->name} a pris son service sans partager sa position",
            default => "{$hostess->name} a pris son service",
        };

        return new self('shift_started', 'presence',
            $title,
            "{$visit->site?->name} · arrivée à {$visit->checked_in_at->format('H:i')} · {$place['short']}.",
            'activity.index');
    }

    public static function shiftEnded(Visit $visit, User $hostess): self
    {
        $minutes = (int) $visit->checked_in_at->diffInMinutes($visit->checked_out_at);
        $duration = intdiv($minutes, 60).' h '.str_pad((string) ($minutes % 60), 2, '0', STR_PAD_LEFT);

        return new self('shift_ended', 'presence',
            "{$hostess->name} a terminé sa journée",
            "{$visit->site?->name} · départ à {$visit->checked_out_at->format('H:i')} ({$duration} de présence).",
            'activity.index');
    }

    public static function reportSubmitted(DailyReport $report): self
    {
        return new self('report_submitted', 'report',
            "Rapport envoyé · {$report->agent?->name}",
            "{$report->site?->name} : ".self::fcfa($report->totalRevenue()).", {$report->totalUnitsSold()} unités vendues.",
            'daily-reports.show', ['dailyReport' => $report->id]);
    }

    public static function photoAdded(DailyReport $report, ?string $caption): self
    {
        return new self('photo_added', 'photo',
            "Nouvelle photo · {$report->agent?->name}",
            $report->site?->name.($caption ? " : « {$caption} »" : ' : une preuve photo a été jointe au rapport.'),
            'daily-reports.show', ['dailyReport' => $report->id]);
    }

    // ── Affectations ─────────────────────────────────────────────────────

    public static function assignedToSite(Affectation $affectation, bool $forHostess = true): self
    {
        $slot = $affectation->slot_start && $affectation->slot_end ? ", de {$affectation->slot_start} à {$affectation->slot_end}" : '';

        return new self('assigned_to_site', 'assignment',
            'Nouvelle affectation',
            "{$affectation->site?->name} à partir du {$affectation->starts_on->format('d/m/Y')}{$slot}.",
            $forHostess ? 'terrain.planning' : 'dashboard');
    }

    /**
     * Superviseur affecté à plusieurs points de vente d'un coup : une seule notification.
     *
     * @param  \Illuminate\Support\Collection<int, Affectation>  $affectations  sites chargés
     */
    public static function assignedToSites(\Illuminate\Support\Collection $affectations): self
    {
        $names = $affectations->map(fn (Affectation $a) => $a->site?->name)->filter()->values();
        $shown = $names->count() > 3
            ? $names->take(2)->implode(', ').' et '.($names->count() - 2).' autres'
            : $names->slice(0, -1)->implode(', ').($names->count() > 1 ? ' et ' : '').$names->last();
        $first = $affectations->first();

        return new self('assigned_to_site', 'assignment',
            "Vous supervisez {$names->count()} points de vente",
            "{$shown}, à partir du {$first->starts_on->format('d/m/Y')}.",
            'dashboard');
    }

    public static function assignedToEvent(EventHostess $hostess, Event $event): self
    {
        $where = $hostess->eventSite ? " sur « {$hostess->eventSite->displayName()} »" : '';

        return new self('assigned_to_event', 'assignment',
            "Événement · {$event->name}",
            "Vous êtes attendue{$where}, du {$event->start_date->format('d/m')} au {$event->end_date->format('d/m/Y')}.",
            'terrain.home');
    }

    public static function packPublished(EventPack $pack, Event $event): self
    {
        return new self('pack_published', 'event',
            "Nouvelle offre · {$pack->name}",
            "À proposer pendant « {$event->name} ». Elle apparaît dans votre saisie des ventes.",
            'terrain.home');
    }

    // ── Objectifs ────────────────────────────────────────────────────────

    /** @param  'week'|'month'  $scale */
    public static function targetReached(User $hostess, string $scale, float $actual, int $target, bool $forHostess): self
    {
        $period = $scale === 'week' ? 'de la semaine' : 'du mois';

        return $forHostess
            ? new self('target_reached', 'target', "Objectif {$period} atteint !",
                self::fcfa($actual).' sur '.self::fcfa($target).'. Bravo, chaque vente en plus compte !', 'terrain.home')
            : new self('target_reached', 'target', "{$hostess->name} a atteint son objectif {$period}",
                self::fcfa($actual).' sur '.self::fcfa($target).'.', 'reports.objectives', ['period' => $scale]);
    }

    // ── Comptes et abonnements ───────────────────────────────────────────

    public static function companyRegistered(Company $company, User $manager): self
    {
        return new self('company_registered', 'signup',
            "Nouveau compte · {$company->name}",
            "{$manager->name} vient de créer son espace. Son dossier sera à examiner dès son envoi.",
            'admin.companies.index');
    }

    public static function moduleActivated(string $module, ?string $endsOn, bool $trial): self
    {
        return new self('module_activated', 'module',
            "Module activé · {$module}",
            ($trial ? 'Essai gratuit' : 'Actif').($endsOn ? " jusqu’au {$endsOn}." : ', sans date de fin.').' Ses écrans sont disponibles dès maintenant.',
            'company.subscription');
    }

    public static function planChanged(string $plan, ?string $endsOn, bool $trial, int $packs = 0, int $supervisorPacks = 0): self
    {
        $extras = array_filter([
            $packs ? "{$packs} pack".($packs > 1 ? 's' : '').' hôtesses (+'.Plan::PACK_HOSTESSES.' hôtesses / +'.Plan::PACK_SITES.' points de vente)' : null,
            $supervisorPacks ? "{$supervisorPacks} pack".($supervisorPacks > 1 ? 's' : '').' superviseur' : null,
        ]);

        return new self('plan_changed', 'module',
            ($trial ? 'Essai' : 'Forfait')." · {$plan}",
            ($trial ? 'Essai gratuit' : 'Actif').($endsOn ? " jusqu’au {$endsOn}" : ', sans date de fin').($extras ? ', avec '.implode(' et ', $extras) : '').'. Les fonctions de votre forfait sont disponibles dès maintenant.',
            'company.subscription');
    }

    public static function paymentReceived(string $invoice, int $amount, string $currency, ?string $endsOn): self
    {
        return new self('payment_received', 'module',
            "Paiement reçu · {$invoice}",
            'Merci ! '.PdfDocument::money($amount, $currency).' enregistrés'.($endsOn ? ", abonnement prolongé jusqu’au {$endsOn}" : '').'. La facture est dans votre page Abonnement.',
            'company.subscription');
    }

    public static function moduleDeactivated(string $module): self
    {
        return new self('module_deactivated', 'module',
            "Module désactivé · {$module}",
            'Vos données sont conservées. Contactez-nous pour le réactiver.',
            'company.subscription');
    }
}
