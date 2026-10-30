<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\DailyReport;
use App\Models\DailyReportPhoto;
use App\Models\Visit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Photos des rapports journaliers : l'hôtesse les ajoute depuis son téléphone,
 * elle et ses responsables les consultent.
 */
class ReportPhotoController extends Controller
{
    /** Ajout d'une photo par l'hôtesse, tant que le rapport n'est pas validé. */
    public function store(Request $request, Visit $visit): RedirectResponse
    {
        $report = $this->ownReport($request, $visit);
        abort_if($report->isValidated(), 422, 'Ce rapport est validé : il ne peut plus être modifié.');

        $validated = $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'caption' => ['nullable', 'string', 'max:200'],
        ], [
            'photo.max' => 'La photo dépasse 8 Mo.',
            'photo.uploaded' => 'La photo n’a pas pu être envoyée (connexion coupée ?). Réessayez.',
        ]);

        if ($report->photos()->count() >= DailyReportPhoto::MAX_PER_REPORT) {
            return back()->withErrors(['photo' => 'Ce rapport a déjà '.DailyReportPhoto::MAX_PER_REPORT.' photos (maximum).']);
        }

        $file = $validated['photo'];
        $report->photos()->create([
            'path' => $file->store("report-photos/{$report->company_id}/{$report->id}", 'local'),
            'caption' => $validated['caption'] ?? null,
            'size' => $file->getSize(),
        ]);

        return back()->with('success', 'Photo ajoutée.');
    }

    /** Retrait d'une photo par l'hôtesse, tant que le rapport n'est pas soumis. */
    public function destroy(Request $request, Visit $visit, DailyReportPhoto $photo): RedirectResponse
    {
        $report = $this->ownReport($request, $visit);
        abort_if($photo->daily_report_id !== $report->id, 404);
        abort_if($report->isSubmitted(), 422, 'Le rapport est soumis : ses photos ne peuvent plus être retirées.');

        Storage::disk('local')->delete($photo->path);
        $photo->delete();

        return back()->with('success', 'Photo retirée.');
    }

    /** Affichage d'une photo : l'hôtesse du rapport, ou un responsable du site. */
    public function show(Request $request, DailyReportPhoto $photo): StreamedResponse
    {
        $user = $request->user();
        $report = $photo->report;

        $allowed = $report->user_id === $user->id
            || ($report->company_id === $user->company_id
                && $user->hasRole(Role::CompanyAdmin, Role::Supervisor, Role::Accountant)
                && $user->managesSite($report->site_id));

        abort_unless($allowed, 403);
        abort_unless(Storage::disk('local')->exists($photo->path), 404);

        return Storage::disk('local')->response($photo->path, headers: ['Cache-Control' => 'private, max-age=86400']);
    }

    private function ownReport(Request $request, Visit $visit): DailyReport
    {
        abort_if($visit->user_id !== $request->user()->id, 403);

        return $visit->dailyReport()->firstOrFail();
    }
}
