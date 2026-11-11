<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Jobs\BuildCompanyDataExport;
use App\Models\DataExport;
use App\Notifications\DataExportNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Export de toutes les données de l'entreprise (classeur Excel et fichiers, dans un ZIP).
 * La préparation se fait en arrière-plan (BuildCompanyDataExport) ; le fichier reste disponible 24 h.
 */
class DataExportController extends Controller
{
    public function show(Request $request): Response
    {
        $company = $request->user()->company;
        $export = DataExport::query()->where('company_id', $company->id)->latest('id')->first();

        return Inertia::render('company/data-export', [
            'counts' => [
                'users' => $company->users()->withTrashed()->count(),
                'sites' => $company->sites()->withTrashed()->count(),
                'products' => $company->products()->withTrashed()->count(),
                'visits' => $company->visits()->count(),
                'reports' => $company->dailyReports()->count(),
                'events' => $company->events()->withTrashed()->count(),
            ],
            'lastExport' => DB::table('audit_logs')
                ->where('company_id', $company->id)
                ->where('action', 'company.data_exported')
                ->latest('created_at')
                ->value('created_at'),
            'export' => $export ? [
                'id' => $export->id,
                'uuid' => $export->uuid,
                // Un export prêt dont le fichier a expiré n'est plus proposé
                'status' => $export->status === DataExport::READY && ! $export->downloadable() ? 'expired' : $export->status,
                'size' => $export->size ? DataExportNotification::humanSize($export->size) : null,
                'missing_files' => $export->missing_files,
                'requested_at' => $export->created_at?->toIso8601String(),
                'expires_at' => $export->expires_at?->toIso8601String(),
            ] : null,
        ]);
    }

    /** Lance la préparation ; le gérant est prévenu dès que le fichier est prêt. */
    public function prepare(Request $request): RedirectResponse
    {
        $company = $request->user()->company;

        $running = DataExport::query()
            ->where('company_id', $company->id)
            ->whereIn('status', [DataExport::PENDING, DataExport::PROCESSING])
            ->where('created_at', '>', now()->subMinutes(20))
            ->exists();

        if ($running) {
            return back()->with('info', 'Un export est déjà en préparation. Vous serez prévenu dès qu’il sera prêt.');
        }

        $export = DataExport::create([
            'company_id' => $company->id,
            'user_id' => $request->user()->id,
            'status' => DataExport::PENDING,
        ]);

        BuildCompanyDataExport::dispatch($export);

        return back()->with('success', 'Préparation lancée. Vous serez prévenu dès que vos données seront prêtes.');
    }

    public function download(Request $request, DataExport $export): StreamedResponse|RedirectResponse
    {
        abort_unless($export->company_id === $request->user()->company_id, 404);

        if (! $export->downloadable()) {
            return redirect()->route('company.data-export')
                ->with('warning', 'Ce fichier n’est plus disponible. Préparez un nouvel export.');
        }

        $name = sprintf('motriks-%s-%s.zip', Str::slug($export->company->name), $export->finished_at->format('Y-m-d'));

        return Storage::disk(DataExport::DISK)->download($export->path, $name, ['Content-Type' => 'application/zip']);
    }
}
