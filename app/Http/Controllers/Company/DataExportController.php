<?php

namespace App\Http\Controllers\Company;

use App\Exports\CompanyDataExport;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Téléchargement de toutes les données de l'entreprise (classeur Excel et fichiers, dans un ZIP).
 */
class DataExportController extends Controller
{
    public function show(Request $request): Response
    {
        $company = $request->user()->company;

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
        ]);
    }

    public function download(Request $request): BinaryFileResponse
    {
        $company = $request->user()->company;
        $path = tempnam(sys_get_temp_dir(), 'motriks-export-');

        $missing = (new CompanyDataExport($company))->write($path);

        AuditLog::record('company.data_exported', $company, new: ['missing_files' => count($missing)]);

        $name = sprintf('motriks-%s-%s.zip', Str::slug($company->name), now()->format('Y-m-d'));

        return response()
            ->download($path, $name, ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend();
    }
}
