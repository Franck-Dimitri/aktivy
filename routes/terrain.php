<?php

use App\Enums\Role;
use App\Http\Controllers\Terrain\DailyReportController;
use App\Http\Controllers\Terrain\HomeController;
use App\Http\Controllers\Terrain\VisitController;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', EnsureUserHasRole::using(Role::FieldAgent)])
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
    });
