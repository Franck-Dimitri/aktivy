<?php

use App\Enums\Module;
use App\Enums\Role;
use App\Http\Controllers\ReportPhotoController;
use App\Http\Controllers\Terrain\DailyReportController;
use App\Http\Controllers\Terrain\ExternalShopController;
use App\Http\Controllers\Terrain\ReportPdfController;
use App\Http\Controllers\Terrain\StockController;
use App\Http\Controllers\Terrain\HomeController;
use App\Http\Controllers\Terrain\PlanningController;
use App\Http\Controllers\Terrain\ReportHistoryController;
use App\Http\Controllers\Terrain\SalesController;
use App\Http\Controllers\Terrain\StatsController;
use App\Http\Controllers\Terrain\TicketController;
use App\Http\Controllers\Terrain\VisitController;
use App\Http\Middleware\EnsureModuleIsActive;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', EnsureUserHasRole::using(Role::FieldAgent), EnsureModuleIsActive::using(Module::Terrain)])
    ->prefix('terrain')
    ->name('terrain.')
    ->group(function () {
        Route::get('/', HomeController::class)->name('home');

        // Pointage
        Route::post('visite', [VisitController::class, 'store'])->name('visit.store');
        Route::patch('visite/{visit}/quitter', [VisitController::class, 'checkout'])->name('visit.checkout');

        // Rapport journalier
        Route::get('rapport/{visit}', [DailyReportController::class, 'show'])->name('report.show');
        Route::put('rapport/{visit}', [DailyReportController::class, 'update'])->name('report.update');
        Route::post('rapport/{visit}/soumettre', [DailyReportController::class, 'submit'])->name('report.submit');
        Route::post('rapport/{visit}/signaler', [DailyReportController::class, 'flag'])->name('report.flag');
        Route::post('rapport/{visit}/photos', [ReportPhotoController::class, 'store'])->middleware(EnsureModuleIsActive::using(Module::Photos))->name('report.photos.store');
        Route::delete('rapport/{visit}/photos/{photo}', [ReportPhotoController::class, 'destroy'])->name('report.photos.destroy');

        // Statistiques personnelles
        Route::get('stats', StatsController::class)->name('stats');

        // Planning / présence
        Route::get('planning', PlanningController::class)->name('planning');

        // Historique des rapports, et leur PDF (même document que celui du gérant, selon le forfait)
        Route::get('rapports', ReportHistoryController::class)->name('reports.index');
        Route::get('rapports/{dailyReport}/pdf', ReportPdfController::class)
            ->middleware(EnsureModuleIsActive::using(Module::Reporting))
            ->name('reports.pdf');

        // Stock de ses points de vente, en lecture seule
        Route::get('stock', StockController::class)->name('stock');

        // Ventes en boutique extérieure (saisies dans le rapport du jour)
        Route::get('boutiques-exterieures', ExternalShopController::class)->name('external-shops');

        // Ventes (historique détaillé)
        Route::get('ventes', SalesController::class)->name('sales');

        // Tickets / demandes
        Route::middleware(EnsureModuleIsActive::using(Module::Requests))->group(function () {
            Route::get('tickets', [TicketController::class, 'index'])->name('tickets.index');
            Route::post('tickets', [TicketController::class, 'store'])->name('tickets.store');
        Route::delete('tickets/{ticket}', [TicketController::class, 'cancel'])->name('tickets.cancel');
        });
    });