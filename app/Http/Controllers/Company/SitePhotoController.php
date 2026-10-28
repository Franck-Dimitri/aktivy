<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;

use App\Models\Site;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SitePhotoController extends Controller
{
    public function store(Request $request, Site $site): RedirectResponse
    {
        abort_if($site->company_id !== $request->user()->company_id, 403);
        abort_unless($request->user()->managesSite($site->id), 403);

        $request->validate([
            'photo' => ['required', 'image', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $photos = $site->photos ?? [];

        if (count($photos) >= 3) {
            return back()->withErrors(['photo' => 'Ce site a déjà 3 photos (maximum).']);
        }

        $path = $request->file('photo')->store("sites/{$site->id}", 'public');
        $photos[] = $path;

        $site->update(['photos' => $photos]);

        return back()->with('success', 'Photo ajoutée.');
    }

    public function destroy(Request $request, Site $site, int $index): RedirectResponse
    {
        abort_if($site->company_id !== $request->user()->company_id, 403);
        abort_unless($request->user()->managesSite($site->id), 403);

        $photos = $site->photos ?? [];

        if (! isset($photos[$index])) {
            return back()->withErrors(['photo' => 'Photo introuvable.']);
        }

        Storage::disk('public')->delete($photos[$index]);
        array_splice($photos, $index, 1);

        $site->update(['photos' => array_values($photos)]);

        return back()->with('success', 'Photo supprimée.');
    }
}
