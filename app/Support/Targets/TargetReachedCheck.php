<?php

namespace App\Support\Targets;

use App\Models\DailyReport;
use App\Models\ReminderLog;
use App\Models\SalesTarget;
use App\Models\WeeklyTarget;
use App\Notifications\LiveNotification;
use App\Support\Notifications\Notify;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Après l'envoi d'un rapport : l'hôtesse vient-elle de franchir son objectif de la semaine ou du mois ?
 * Si oui, elle et ses responsables sont prévenus, une seule fois par période.
 */
class TargetReachedCheck
{
    public static function afterSubmit(DailyReport $report): void
    {
        $hostess = $report->agent;
        if (! $hostess) {
            return;
        }

        $day = CarbonImmutable::parse($report->report_date);
        $weekStart = WeeklyTarget::weekOf($day);
        $monthStart = $day->startOfMonth();

        $checks = [
            ['week', $weekStart, $weekStart->addDays(6), WeeklyTarget::effective([$hostess->id], $weekStart)->get($hostess->id)?->amount],
            ['month', $monthStart, $monthStart->endOfMonth(), SalesTarget::effective($hostess->company_id, $monthStart)->get(SalesTarget::keyFor(null, $hostess->id))?->amount],
        ];

        $thisReport = (float) $report->totalRevenue();

        foreach ($checks as [$scale, $from, $to, $target]) {
            if (! $target) {
                continue;
            }

            $actual = (float) DB::table('daily_report_lines as l')
                ->join('daily_reports as r', 'r.id', '=', 'l.daily_report_id')
                ->where('r.user_id', $hostess->id)
                ->where('r.status', 'submitted')
                ->whereBetween('r.report_date', [$from->toDateString(), $to->toDateString()])
                ->sum('l.revenue');

            // Franchi par ce rapport : avant lui on était en dessous, avec lui on y est
            if ($actual < $target || $actual - $thisReport >= $target) {
                continue;
            }

            if (ReminderLog::claim('target_reached', "target-reached:{$scale}:{$hostess->id}:{$from->toDateString()}", $hostess->company_id)) {
                Notify::send($hostess, LiveNotification::targetReached($hostess, $scale, $actual, (int) $target, true));
                Notify::send(Notify::managersOf($hostess), LiveNotification::targetReached($hostess, $scale, $actual, (int) $target, false));
            }
        }
    }
}
