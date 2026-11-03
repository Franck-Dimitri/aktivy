<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\Excel\Workbook;
use App\Support\Import\CompanyImport;
use App\Support\Import\Spreadsheet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Reprise des fichiers Excel existants (sites, produits, personnel) pour démarrer vite.
 */
class ImportController extends Controller
{
    private const LABELS = ['sites' => 'Sites', 'produits' => 'Produits', 'personnel' => 'Personnel'];

    public function index(Request $request): Response
    {
        $company = $request->user()->company;

        return Inertia::render('company/import', [
            'types' => collect(self::LABELS)->map(fn ($label, $type) => [
                'type' => $type,
                'label' => $label,
                'columns' => collect(CompanyImport::COLUMNS[$type])->map(fn ($c) => $c[0])->values(),
                'count' => match ($type) {
                    'sites' => $company->sites()->count(),
                    'produits' => $company->products()->count(),
                    'personnel' => $company->users()->count() - 1,
                },
            ])->values(),
            'result' => $request->session()->get('import_result'),
            'max_rows' => CompanyImport::MAX_ROWS,
        ]);
    }

    /** Modèle Excel à remplir, avec une ligne d'exemple. */
    public function template(Request $request, string $type): BinaryFileResponse
    {
        abort_unless(isset(self::LABELS[$type]), 404);

        $path = tempnam(sys_get_temp_dir(), 'motriks-modele-');
        $book = new Workbook($path, $request->user()->company->documentColor());
        $columns = collect(CompanyImport::COLUMNS[$type])->mapWithKeys(fn ($c) => [$c[0] => [Workbook::TEXT, 22]])->all();
        $book->sheet(self::LABELS[$type], $columns, [collect(CompanyImport::COLUMNS[$type])->map(fn ($c) => $c[2])->values()->all()]);
        $book->close();

        return response()->download($path, "modele-import-{$type}.xlsx")->deleteFileAfterSend();
    }

    public function store(Request $request, string $type): RedirectResponse
    {
        abort_unless(isset(self::LABELS[$type]), 404);

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:5120'],
            // Personnel : mot de passe provisoire commun, à changer à la première connexion
            'password' => $type === 'personnel' ? ['required', 'string', Password::defaults()] : ['nullable'],
        ], [
            'file.required' => 'Choisissez un fichier Excel (.xlsx) ou CSV.',
            'file.mimes' => 'Le fichier doit être un Excel (.xlsx) ou un CSV.',
            'password.required' => 'Indiquez le mot de passe provisoire des comptes créés.',
        ]);

        $file = $request->file('file');
        $import = new CompanyImport($request->user()->company, $type, $request->user(), $request->input('password'));

        try {
            $ok = $import->run(Spreadsheet::rows($file->getRealPath(), $file->getClientOriginalExtension() ?: 'csv'));
        } catch (\Throwable $e) {
            report($e);
            $ok = false;
            $import->errors = ['Le fichier n’a pas pu être lu. Enregistrez-le au format Excel (.xlsx) puis réessayez.'];
        }

        if ($ok) {
            AuditLog::record('import.done', $request->user()->company, new: ['type' => $type, 'created' => $import->created, 'skipped' => $import->skipped]);
        }

        return back()->with('import_result', [
            'type' => $type,
            'label' => self::LABELS[$type],
            'ok' => $ok,
            'created' => $import->created,
            'skipped' => $import->skipped,
            'errors' => array_slice($import->errors, 0, 50),
            'more_errors' => max(0, count($import->errors) - 50),
        ]);
    }
}
