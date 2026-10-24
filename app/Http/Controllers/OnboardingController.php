<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    private const SECTORS = [
        'FMCG / Grande consommation',
        'Cosmétique / Beauté',
        'Alimentaire / Boisson',
        'Télécoms',
        'Finance / Banque',
        'Informatique / Tech',
        'Distribution / Négoce',
        'Santé / Pharmacie',
        'Énergie',
        'Autre',
    ];

    public function show(Request $request): Response
    {
        $company = $request->user()->company;
        $user    = $request->user();

        return Inertia::render('onboarding/index', [
            'company' => [
                'id'                       => $company->id,
                'name'                     => $company->name,
                'email'                    => $company->email,
                'phone'                    => $company->phone,
                'sector'                   => $company->sector,
                'city'                     => $company->city,
                'address'                  => $company->address,
                'status'                   => $company->status->value,
                'logo_url'                 => $company->logo_path ? asset('storage/' . $company->logo_path) : null,
                'onboarding_completed'     => $company->onboardingCompleted(),
                'onboarding_completed_at'  => $company->onboarding_completed_at?->format('d/m/Y à H:i'),
                'rejection_reason'         => $company->rejection_reason,
            ],
            'user' => [
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
            ],
            'sectors' => self::SECTORS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'sector'           => ['required', 'string', 'max:100'],
            'city'             => ['required', 'string', 'max:100'],
            'address'          => ['nullable', 'string', 'max:255'],
            'phone'            => ['nullable', 'string', 'max:20'],
            'logo'             => ['nullable', 'image', 'max:3072'],           // 3 Mo
            'id_card_front'    => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'id_card_back'     => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'registration_doc' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
        ], [
            'required'   => ':attribute est obligatoire.',
            'uploaded'   => ':attribute n’a pas pu être envoyé (fichier trop lourd ou connexion coupée). Choisissez-le à nouveau.',
            'logo.max'             => 'Le logo dépasse 3 Mo.',
            'id_card_front.max'    => 'La pièce d’identité (recto) dépasse 5 Mo.',
            'id_card_back.max'     => 'La pièce d’identité (verso) dépasse 5 Mo.',
            'registration_doc.max' => 'Le document légal dépasse 10 Mo.',
            'mimes'      => ':attribute doit être une image JPG ou PNG, ou un PDF.',
            'logo.image' => 'Le logo doit être une image (JPG, PNG ou WebP).',
        ], [
            'sector'           => 'Le secteur',
            'city'             => 'La ville',
            'address'          => 'L’adresse',
            'phone'            => 'Le téléphone',
            'logo'             => 'Le logo',
            'id_card_front'    => 'La pièce d’identité (recto)',
            'id_card_back'     => 'La pièce d’identité (verso)',
            'registration_doc' => 'Le document légal',
        ]);

        $company = $request->user()->company;
        $dir     = 'onboarding/' . $company->id;

        $updates = [
            'sector'  => $validated['sector'],
            'city'    => $validated['city'],
            'address' => $validated['address'] ?? null,
            'phone'   => $validated['phone'] ?? $company->phone,
            'onboarding_completed_at' => now(),
        ];

        // Logo → public storage
        if ($request->hasFile('logo')) {
            if ($company->logo_path) {
                Storage::disk('public')->delete($company->logo_path);
            }
            $updates['logo_path'] = $request->file('logo')->store('logos/' . $company->id, 'public');
        }

        // Documents privés
        foreach (['id_card_front', 'id_card_back', 'registration_doc'] as $field) {
            if ($request->hasFile($field)) {
                $old = $company->{$field . '_path'};
                if ($old) Storage::disk('local')->delete($old);
                $updates[$field . '_path'] = $request->file($field)->store($dir, 'local');
            }
        }

        $company->update($updates);

        return redirect()->route('onboarding.show');
    }
}
