<?php

namespace App\Jobs;

use App\Exports\CompanyDataExport;
use App\Models\AuditLog;
use App\Models\DataExport;
use App\Notifications\DataExportNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Prépare l'export complet d'une entreprise (classeur Excel + fichiers, dans un ZIP) hors de la requête :
 * avec un an d'activité et les photos, la préparation dépasse le temps qu'un navigateur veut bien attendre.
 * Le gérant est prévenu (cloche, push, e-mail) dès que le fichier est prêt.
 */
class BuildCompanyDataExport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** 14 min au plus ; la file « database » rend la main après 15 min (DB_QUEUE_RETRY_AFTER). */
    public int $timeout = 840;

    /** Pas de nouvelle tentative automatique : le gérant relance s'il le souhaite. */
    public int $tries = 1;

    public function __construct(public DataExport $export) {}

    public function handle(): void
    {
        $export = $this->export;
        $company = $export->company;
        $export->update(['status' => DataExport::PROCESSING, 'started_at' => now()]);

        $disk = Storage::disk(DataExport::DISK);
        $path = "exports/{$company->id}/".Str::uuid().'.zip';
        $disk->makeDirectory(dirname($path));

        $missing = (new CompanyDataExport($company))->write($disk->path($path));

        $export->update([
            'status' => DataExport::READY,
            'path' => $path,
            'size' => $disk->size($path),
            'missing_files' => count($missing),
            'finished_at' => now(),
            'expires_at' => now()->addHours(DataExport::AVAILABLE_HOURS),
        ]);

        // Un seul export disponible à la fois par entreprise : les précédents sont effacés
        DataExport::query()
            ->where('company_id', $company->id)
            ->whereKeyNot($export->id)
            ->get()
            ->each(function (DataExport $old) use ($disk) {
                if ($old->path) {
                    $disk->delete($old->path);
                }
                $old->delete();
            });

        AuditLog::record('company.data_exported', $company, new: ['missing_files' => count($missing), 'size' => $export->size], actor: $export->user);

        $export->user?->notify(DataExportNotification::ready($export));
    }

    public function failed(?Throwable $e): void
    {
        $this->export->update(['status' => DataExport::FAILED, 'finished_at' => now()]);
        $this->export->user?->notify(DataExportNotification::failed());
    }
}
