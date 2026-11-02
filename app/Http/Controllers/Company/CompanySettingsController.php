<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Paramètres de l'entreprise : identité et coordonnées, reprises dans les documents.
 */
class CompanySettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        $company = $request->user()->company;

        return Inertia::render('company/settings', [
            'company' => [
                'name' => $company->name,
                'email' => $company->email,
                'phone' => $company->phone,
                'city' => $company->city,
                'address' => $company->address,
                'primary_color' => $company->primary_color,
                'logo_url' => $company->logo_path ? Storage::disk('public')->url($company->logo_path) : null,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $company = $request->user()->company;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:25'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'primary_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            // JPG ou PNG : les seuls formats que le moteur PDF sait intégrer
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:3072'],
            'remove_logo' => ['boolean'],
        ], [
            'primary_color.regex' => 'Choisissez une couleur valide.',
            'logo.mimes' => 'Le logo doit être une image JPG ou PNG.',
            'logo.max' => 'Le logo dépasse 3 Mo.',
        ]);

        $logoPath = $company->logo_path;

        if ($logoPath && ($request->boolean('remove_logo') || $request->hasFile('logo'))) {
            Storage::disk('public')->delete($logoPath);
            $logoPath = null;
        }

        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('logos/'.$company->id, 'public');
        }

        $company->update([
            ...collect($validated)->except(['logo', 'remove_logo'])->all(),
            'logo_path' => $logoPath,
        ]);

        AuditLog::record('company.settings_updated', $company);

        return back()->with('success', 'Paramètres enregistrés.');
    }
}
