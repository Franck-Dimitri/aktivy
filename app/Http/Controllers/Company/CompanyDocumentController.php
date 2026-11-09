<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Support\Company\CompanyDocuments;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Documents légaux de l'entreprise, consultés et mis à jour par le gérant.
 */
class CompanyDocumentController extends Controller
{
    public function show(Request $request, string $type): StreamedResponse
    {
        abort_unless(CompanyDocuments::exists($type), 404);

        return CompanyDocuments::response($request->user()->company, $type);
    }

    public function store(Request $request, string $type): RedirectResponse
    {
        abort_unless(CompanyDocuments::exists($type), 404);

        $request->validate(['file' => CompanyDocuments::RULES], CompanyDocuments::MESSAGES);
        CompanyDocuments::store($request->user()->company, $type, $request->file('file'));

        return back()->with('success', CompanyDocuments::TYPES[$type][1].' enregistré.');
    }
}
