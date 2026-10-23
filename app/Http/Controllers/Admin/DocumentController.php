<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    private const ALLOWED_TYPES = [
        'id_card_front'    => 'id_card_front_path',
        'id_card_back'     => 'id_card_back_path',
        'registration_doc' => 'registration_doc_path',
    ];

    public function show(Request $request, Company $company, string $type): StreamedResponse
    {
        abort_unless(isset(self::ALLOWED_TYPES[$type]), 404);

        $field = self::ALLOWED_TYPES[$type];
        $path  = $company->{$field};

        abort_if(! $path || ! Storage::disk('local')->exists($path), 404);

        $mime = Storage::disk('local')->mimeType($path) ?: 'application/octet-stream';

        return Storage::disk('local')->response($path, basename($path), [
            'Content-Type' => $mime,
        ]);
    }
}
