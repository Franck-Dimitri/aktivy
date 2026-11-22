<?php

namespace App\Support\Reports;

use App\Models\DailyReport;
use App\Support\Pdf\PdfDocument;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

/**
 * Rapport journalier en PDF, aux couleurs de l'entreprise : le même document pour le gérant,
 * le superviseur et l'hôtesse qui l'a rédigé.
 */
final class DailyReportPdf
{
    public static function download(DailyReport $report): Response
    {
        $report->load(['company', 'agent:id,name', 'site:id,name,city,latitude,longitude', 'visit', 'lines', 'externalLines', 'packs', 'event:id,name', 'validator:id,name', 'photos']);
        $company = $report->company;

        $filename = sprintf(
            'rapport-%s-%s-%s.pdf',
            Str::slug($report->agent?->name ?? 'hotesse'),
            Str::slug($report->site?->name ?? 'site'),
            $report->report_date->format('Y-m-d'),
        );

        return PdfDocument::download('pdf.daily-report', [
            'title' => 'Rapport journalier',
            'subtitle' => $report->site?->name,
            'company' => $company,
            'logo' => PdfDocument::logo($company),
            'currency' => $company->currency ?: 'XAF',
            'report' => $report,
            'photos' => $report->photos
                ->map(fn ($photo) => ['src' => PdfDocument::image('local', $photo->path), 'caption' => $photo->caption])
                ->filter(fn ($photo) => $photo['src'] !== null)
                ->values()
                ->all(),
        ], $filename);
    }
}
