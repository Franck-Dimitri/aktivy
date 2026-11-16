<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Rapports de violation de la politique de contenu (CSP), envoyés par le navigateur : chaque ressource
 * bloquée est journalisée (directive, adresse bloquée, page sans paramètres), pour repérer vite un blocage
 * imprévu après un déploiement. Rien n'est renvoyé au navigateur.
 */
class CspReportController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $report = (array) (json_decode($request->getContent(), true)['csp-report'] ?? []);

        if ($report !== []) {
            Log::warning('CSP : ressource bloquée', [
                'directive' => mb_substr((string) ($report['violated-directive'] ?? $report['effective-directive'] ?? ''), 0, 100),
                'bloque' => mb_substr((string) ($report['blocked-uri'] ?? ''), 0, 200),
                'page' => mb_substr(strtok((string) ($report['document-uri'] ?? ''), '?') ?: '', 0, 200),
            ]);
        }

        return response()->noContent();
    }
}
