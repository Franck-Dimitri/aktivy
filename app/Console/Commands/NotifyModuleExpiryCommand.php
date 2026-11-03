<?php

namespace App\Console\Commands;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\CompanyModule;
use App\Notifications\ModuleExpiring;
use App\Support\Notifications\Notify;
use Illuminate\Console\Command;

/**
 * Prévient le gérant 30 jours, 7 jours et 1 jour avant la fin d'un module, puis le lendemain de son expiration.
 */
class NotifyModuleExpiryCommand extends Command
{
    protected $signature = 'subscriptions:reminders';

    protected $description = 'Prévient les gérants des modules qui arrivent à échéance';

    private const DAYS_BEFORE = [30, 7, 1];

    public function handle(): int
    {
        $sent = 0;

        foreach ([...self::DAYS_BEFORE, -1] as $days) {
            $modules = CompanyModule::whereDate('ends_on', today()->addDays($days)->toDateString())->with('company.users')->get();

            foreach ($modules as $module) {
                $admins = $module->company?->users->where('role', Role::CompanyAdmin)->where('status', AccountStatus::Active);

                if ($admins && $admins->isNotEmpty()) {
                    Notify::send($admins, new ModuleExpiring($module->module->label(), $days, $module->ends_on->format('d/m/Y')));
                    $sent++;
                }
            }
        }

        $this->info("{$sent} rappel(s) envoyé(s).");

        return self::SUCCESS;
    }
}
