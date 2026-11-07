<?php

namespace App\Console\Commands;

use App\Enums\AccountStatus;
use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Company;
use App\Notifications\PlanExpiring;
use App\Support\Notifications\Notify;
use Illuminate\Console\Command;

/**
 * Prévient le gérant 30 jours, 7 jours et 1 jour avant la fin de son forfait (ou de son essai),
 * puis le lendemain, quand l'entreprise est passée en Motriks Starter.
 */
class NotifyModuleExpiryCommand extends Command
{
    protected $signature = 'subscriptions:reminders';

    protected $description = 'Prévient les gérants dont le forfait arrive à échéance';

    private const DAYS_BEFORE = [30, 7, 1];

    public function handle(): int
    {
        $sent = 0;

        foreach ([...self::DAYS_BEFORE, -1] as $days) {
            $companies = Company::query()
                ->where('plan', '!=', Plan::Starter->value)
                ->whereDate('plan_ends_on', today()->addDays($days)->toDateString())
                ->with('users')
                ->get();

            foreach ($companies as $company) {
                $admins = $company->users->where('role', Role::CompanyAdmin)->where('status', AccountStatus::Active);

                if ($admins->isNotEmpty()) {
                    Notify::send($admins, new PlanExpiring($company->plan->label(), $days, $company->plan_ends_on->format('d/m/Y'), (bool) $company->plan_trial));
                    $sent++;
                }
            }
        }

        $this->info("{$sent} rappel(s) envoyé(s).");

        return self::SUCCESS;
    }
}
