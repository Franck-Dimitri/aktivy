<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\StaffDocument;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Documents de la fiche du personnel, réservés à ceux qui gèrent ce membre.
 */
class PersonnelDocumentController extends Controller
{
    public function store(Request $request, User $personnel): RedirectResponse
    {
        abort_unless($personnel->isManageableBy($request->user()), 403);

        $validated = $request->validate([
            'type' => ['required', 'in:'.implode(',', array_keys(StaffDocument::TYPES))],
            'title' => ['nullable', 'string', 'max:150'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ], [
            'file.required' => 'Choisissez un fichier.',
            'file.mimes' => 'Le document doit être un PDF ou une image JPG ou PNG.',
            'file.max' => 'Le document dépasse 10 Mo.',
            'file.uploaded' => 'Le document n’a pas pu être envoyé (connexion coupée ?). Réessayez.',
        ]);

        $file = $validated['file'];
        $document = StaffDocument::create([
            'company_id' => $personnel->company_id,
            'user_id' => $personnel->id,
            'type' => $validated['type'],
            'title' => ($validated['title'] ?? null) ?: StaffDocument::TYPES[$validated['type']],
            'path' => $file->store("staff-documents/{$personnel->company_id}/{$personnel->id}", 'local'),
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
            'mime' => $file->getMimeType() ?? 'application/octet-stream',
            'size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        AuditLog::record('staff.document_added', $personnel, new: ['document' => $document->title]);

        return back()->with('success', 'Document ajouté.');
    }

    public function show(Request $request, User $personnel, StaffDocument $document): StreamedResponse
    {
        $this->authorizeDocument($request, $personnel, $document);
        abort_unless(Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->response($document->path, $document->original_name, [
            'Content-Type' => $document->mime,
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function destroy(Request $request, User $personnel, StaffDocument $document): RedirectResponse
    {
        $this->authorizeDocument($request, $personnel, $document);

        Storage::disk('local')->delete($document->path);
        $document->delete();
        AuditLog::record('staff.document_removed', $personnel, old: ['document' => $document->title]);

        return back()->with('success', 'Document retiré.');
    }

    private function authorizeDocument(Request $request, User $personnel, StaffDocument $document): void
    {
        abort_unless($personnel->isManageableBy($request->user()), 403);
        abort_if($document->user_id !== $personnel->id, 404);
    }
}
