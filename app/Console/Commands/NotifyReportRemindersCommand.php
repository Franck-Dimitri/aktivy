<?php

namespace App\Console\Commands;

use App\Models\DailyReport;
use App\Notifications\ReportReminder;
use App\Support\Notifications\Notify;
use Illuminate\Console\Command;

/**
 * Rappelle aux hôtesses en fin de journée d'envoyer leur rapport encore en brouillon.
 */
class NotifyReportRemindersCommand extends Command
{
    protected $signature = 'notifications:report-reminders';

    protected $description = 'Rappelle aux hôtesses d’envoyer leur rapport du jour';

    public function handle(): int
    {
        $drafts = DailyReport::where('status', 'draft')
            ->whereDate('report_date', today())
            ->with(['agent', 'site:id,name'])
            ->get();

        foreach ($drafts as $report) {
            if ($report->agent) {
                Notify::send($report->agent, new ReportReminder($report->visit_id, $report->site?->name ?? 'votre point de vente'));
            }
        }

        $this->info($drafts->count().' rappel(s) envoyé(s).');

        return self::SUCCESS;
    }
}
