<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Support\Company\CompanyDocuments;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Documents légaux d'une entreprise, ajoutés ou remplacés par le super administrateur
 * (une entreprise créée depuis l'administration n'a pas de dossier d'inscription).
 */
class CompanyDocumentController extends Controller
{
    public function store(Request $request, Company $company, string $type): RedirectResponse
    {
        abort_unless(CompanyDocuments::exists($type), 404);

        $request->validate(['file' => CompanyDocuments::RULES], CompanyDocuments::MESSAGES);
        CompanyDocuments::store($company, $type, $request->file('file'));

        return back()->with('success', CompanyDocuments::TYPES[$type][1].' enregistré.');
    }
}
