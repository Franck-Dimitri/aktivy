<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use App\Support\Reports\DailyReportPdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * L'hôtesse télécharge le PDF de ses propres rapports : le même document que son gérant.
 */
class ReportPdfController extends Controller
{
    public function __invoke(Request $request, DailyReport $dailyReport): Response
    {
        abort_unless($dailyReport->user_id === $request->user()->id && $dailyReport->company_id === $request->user()->company_id, 404);

        return DailyReportPdf::download($dailyReport);
    }
}
