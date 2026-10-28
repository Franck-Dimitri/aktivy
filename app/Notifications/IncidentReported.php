<?php

namespace App\Notifications;

use App\Models\DailyReport;
use Illuminate\Support\Str;

/**
 * Une hôtesse a signalé un incident dans son rapport.
 */
class IncidentReported extends AppNotification
{
    private int $reportId;

    private string $site;

    private string $agent;

    private string $incident;

    public function __construct(DailyReport $report)
    {
        $this->reportId = $report->id;
        $this->site = $report->site?->name ?? 'un point de vente';
        $this->agent = $report->agent?->name ?? 'Une hôtesse';
        $this->incident = Str::limit((string) $report->incident_notes, 200);
    }

    public function kind(): string
    {
        return 'incident';
    }

    public function title(): string
    {
        return "Incident signalé · {$this->site}";
    }

    public function body(): string
    {
        return "{$this->agent} a signalé : « {$this->incident} »";
    }

    protected function route(): array
    {
        return ['daily-reports.show', ['dailyReport' => $this->reportId]];
    }
}
