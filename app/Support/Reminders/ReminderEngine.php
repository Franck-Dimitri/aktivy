<?php

namespace App\Support\Reminders;

use App\Enums\AccountStatus;
use App\Enums\Module;
use App\Enums\Role;
use App\Models\Affectation;
use App\Models\Company;
use App\Models\CompanyModule;
use App\Models\DailyReport;
use App\Models\Event;
use App\Models\ReminderLog;
use App\Models\SiteProduct;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Visit;
use App\Notifications\AppNotification;
use App\Notifications\HostessesNotCheckedIn;
use App\Notifications\ReminderNotification;
use App\Support\Notifications\Notify;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Rappels automatiques, évalués chaque minute (commande reminders:run).
 *
 * Chaque rappel n'est envoyé qu'une fois par cas (ReminderLog), dans le fuseau de l'entreprise,
 * jamais pendant ses heures silencieuses, et seulement si le module concerné est actif.
 */
class ReminderEngine
{
    /** @var array<string, int> rappels envoyés par type, pour le compte rendu de la commande */
    private array $sent = [];

    /** @return array<string, int> */
    public function run(?CarbonImmutable $at = null): array
    {
        $this->sent = [];

        Company::where('status', AccountStatus::Active)->each(function (Company $company) use ($at) {
            $tz = $company->timezone ?: config('app.timezone');
            $now = ($at ?? CarbonImmutable::now())->setTimezone($tz);
            $settings = ReminderSettings::for($company);

            if ($settings->isQuiet($now)) {
                return;
            }

            if ($company->hasModule(Module::Terrain)) {
                $this->hostessShifts($company, $settings, $now);
                $this->reports($company, $settings, $now);
            }
            if ($company->hasModule(Module::Stocks) && $settings->enabled('low_stock') && $now->gte($settings->at($now, $settings->time('low_stock_time')))) {
                $this->lowStock($company, $now);
            }
            if ($company->hasModule(Module::Requests) && $settings->enabled('tickets')) {
                $this->unansweredTickets($company, $settings, $now);
            }
            if ($company->hasModule(Module::Events) && $settings->enabled('event_tomorrow') && $now->gte($settings->at($now, $settings->time('event_tomorrow_time')))) {
                $this->eventsTomorrow($company, $now);
            }
        });

        $this->platformAdmins(($at ?? CarbonImmutable::now())->setTimezone(config('app.timezone')));

        return $this->sent;
    }

    /** Envoie si ce cas n'a jamais été rappelé. */
    private function once(string $type, string $key, ?int $companyId, iterable|User $to, AppNotification $notification): bool
    {
        if (! ReminderLog::claim($type, $key, $companyId)) {
            return false;
        }

        Notify::send($to, $notification);
        $this->sent[$type] = ($this->sent[$type] ?? 0) + 1;

        return true;
    }

    /**
     * Affectations du jour : rappel avant le créneau, retard (hôtesse et responsables),
     * fin de créneau avec un service toujours en cours.
     */
    private function hostessShifts(Company $company, ReminderSettings $s, CarbonImmutable $now): void
    {
        $date = $now->toDateString();
        $affectations = Affectation::current()
            ->where('company_id', $company->id)
            ->whereHas('agent', fn ($q) => $q->where('role', Role::FieldAgent)->where('status', AccountStatus::Active))
            ->with(['agent', 'site:id,name'])
            ->get()
            ->unique('user_id');

        $visits = Visit::whereIn('user_id', $affectations->pluck('user_id'))
            ->whereDate('checked_in_at', $date)
            ->get()
            ->keyBy('user_id');

        $lateByManager = [];

        foreach ($affectations as $a) {
            $start = $s->at($now, $a->slot_start ?: $s->time('default_start'));
            $end = $s->at($now, $a->slot_end ?: $s->time('default_end'));
            $site = $a->site?->name ?? 'votre point de vente';
            $visit = $visits->get($a->user_id);

            if (! $visit) {
                // Avant le créneau
                if ($s->enabled('shift_upcoming') && $now->gte($start->subMinutes($s->int('shift_upcoming_minutes'))) && $now->lt($start)) {
                    $this->once('shift_upcoming', "shift-upcoming:{$a->id}:{$date}", $company->id, $a->agent, ReminderNotification::shiftUpcoming($site, $start->format('H:i')));
                }

                // En retard : l'hôtesse, et ses responsables (regroupés)
                if ($s->enabled('shift_late') && $now->gte($start->addMinutes($s->int('shift_late_minutes'))) && $now->lt($end)
                    && $this->once('shift_late', "shift-late:{$a->id}:{$date}", $company->id, $a->agent, ReminderNotification::shiftLate($site, $start->format('H:i')))) {
                    $label = "{$a->agent->name} ({$site}, attendue à {$start->format('H:i')})";
                    foreach (Notify::siteManagers($company->id, [$a->site_id]) as $manager) {
                        $lateByManager[$manager->id]['user'] = $manager;
                        $lateByManager[$manager->id]['hostesses'][] = $label;
                    }
                }

                continue;
            }

            // Service toujours en cours après la fin du créneau
            if ($s->enabled('closing') && ! $visit->checked_out_at && $now->gte($end->addMinutes($s->int('closing_minutes')))) {
                $this->once('closing', "closing:{$visit->id}", $company->id, $a->agent, ReminderNotification::closing($site, $end->format('H:i'), $visit->id));
            }
        }

        foreach ($lateByManager as $entry) {
            Notify::send($entry['user'], new HostessesNotCheckedIn($entry['hostesses']));
            $this->sent['shift_late_managers'] = ($this->sent['shift_late_managers'] ?? 0) + 1;
        }
    }

    /** Le soir : rapport pas envoyé (hôtesse), rapports manquants (responsables). */
    private function reports(Company $company, ReminderSettings $s, CarbonImmutable $now): void
    {
        $date = $now->toDateString();

        if ($s->enabled('report') && $now->gte($s->at($now, $s->time('report_time')))) {
            DailyReport::where('company_id', $company->id)
                ->whereDate('report_date', $date)
                ->where('status', 'draft')
                ->with(['agent', 'site:id,name'])
                ->get()
                ->each(fn (DailyReport $r) => $r->agent && $this->once('report_not_sent', "report-not-sent:{$r->id}", $company->id, $r->agent,
                    ReminderNotification::reportNotSent($r->site?->name ?? 'votre point de vente', $r->visit_id)));
        }

        if ($s->enabled('missing_reports') && $now->gte($s->at($now, $s->time('missing_reports_time')))) {
            $submitted = DailyReport::where('company_id', $company->id)->whereDate('report_date', $date)->where('status', 'submitted')->pluck('user_id');
            $missing = Affectation::current()
                ->where('company_id', $company->id)
                ->whereNotIn('user_id', $submitted)
                ->whereHas('agent', fn ($q) => $q->where('role', Role::FieldAgent)->where('status', AccountStatus::Active))
                ->with('agent:id,name')
                ->get()
                ->unique('user_id');

            $byManager = [];
            foreach ($missing as $a) {
                foreach (Notify::siteManagers($company->id, [$a->site_id]) as $manager) {
                    $byManager[$manager->id]['user'] = $manager;
                    $byManager[$manager->id]['names'][] = $a->agent->name;
                }
            }
            foreach ($byManager as $id => $entry) {
                $this->once('missing_reports', "missing-reports:{$id}:{$date}", $company->id, $entry['user'], ReminderNotification::missingReports(array_values(array_unique($entry['names']))));
            }
        }
    }

    /** Le matin : produits sous leur seuil, un récapitulatif par responsable. */
    private function lowStock(Company $company, CarbonImmutable $now): void
    {
        $low = SiteProduct::where('company_id', $company->id)
            ->whereColumn('current_stock', '<=', 'alert_threshold')
            ->whereHas('product')
            ->with('site:id,name')
            ->get();

        if ($low->isEmpty()) {
            return;
        }

        $date = $now->toDateString();
        $byManager = [];
        foreach ($low as $stock) {
            foreach (Notify::siteManagers($company->id, [$stock->site_id]) as $manager) {
                $byManager[$manager->id]['user'] = $manager;
                $byManager[$manager->id]['items'][] = $stock;
            }
        }

        foreach ($byManager as $id => $entry) {
            $items = collect($entry['items']);
            $this->once('low_stock', "low-stock:{$id}:{$date}", $company->id, $entry['user'], ReminderNotification::lowStock(
                $items->count(),
                $items->filter(fn (SiteProduct $s) => $s->current_stock <= $s->critical_threshold)->count(),
                $items->pluck('site.name')->filter()->unique()->values()->all(),
            ));
        }
    }

    /** Demandes d'hôtesses restées sans réponse depuis X heures (une fois par demande). */
    private function unansweredTickets(Company $company, ReminderSettings $s, CarbonImmutable $now): void
    {
        $hours = $s->int('tickets_hours');

        Ticket::where('company_id', $company->id)
            ->whereIn('status', ['open', 'in_review'])
            ->whereNull('response')
            ->where('created_at', '<=', $now->subHours($hours))
            ->with('agent')
            ->get()
            ->each(function (Ticket $ticket) use ($company, $hours) {
                $managers = $ticket->agent ? Notify::managersOf($ticket->agent) : collect();
                if ($managers->isNotEmpty()) {
                    $this->once('ticket_unanswered', "ticket-unanswered:{$ticket->id}", $company->id, $managers, ReminderNotification::ticketUnanswered($ticket, $hours));
                }
            });
    }

    /** La veille d'un événement : le gérant, et les hôtesses si l'événement est lancé. */
    private function eventsTomorrow(Company $company, CarbonImmutable $now): void
    {
        $admins = $company->users()->where('role', Role::CompanyAdmin)->where('status', AccountStatus::Active)->get();

        Event::where('company_id', $company->id)
            ->whereDate('start_date', $now->addDay()->toDateString())
            ->whereIn('status', ['draft', 'active'])
            ->get()
            ->each(function (Event $event) use ($company, $admins) {
                if ($admins->isNotEmpty()) {
                    $this->once('event_tomorrow', "event-tomorrow:{$event->id}:admins", $company->id, $admins, ReminderNotification::eventTomorrow($event, false));
                }

                if ($event->status->value === 'active') {
                    $hostesses = User::whereIn('id', $event->hostesses()->where('status', 'active')->pluck('user_id'))->where('status', AccountStatus::Active)->get();
                    if ($hostesses->isNotEmpty()) {
                        $this->once('event_tomorrow', "event-tomorrow:{$event->id}:hostesses", $company->id, $hostesses, ReminderNotification::eventTomorrow($event, true));
                    }
                }
            });
    }

    /** Super-administrateur : abonnements qui expirent dans 7 jours et demain (un récapitulatif chacun). */
    private function platformAdmins(CarbonImmutable $now): void
    {
        $defaults = ReminderSettings::DEFAULTS;
        if ($now->format('H:i') < '09:00' || $now->format('H:i') >= $defaults['quiet_start']) {
            return;
        }

        $admins = User::where('role', Role::SuperAdmin)->where('status', AccountStatus::Active)->get();
        if ($admins->isEmpty()) {
            return;
        }

        foreach ([7, 1] as $days) {
            /** @var Collection<int, CompanyModule> $modules */
            $modules = CompanyModule::whereDate('ends_on', $now->addDays($days)->toDateString())->with('company:id,name')->get();
            $companies = $modules->pluck('company.name')->filter()->unique()->values()->all();

            if ($companies) {
                $this->once('subscriptions_expiring', "subscriptions-expiring:{$now->toDateString()}:{$days}", null, $admins, ReminderNotification::subscriptionsExpiring($companies, $days));
            }
        }
    }
}
