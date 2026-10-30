<?php

use App\Enums\Role;
use App\Http\Controllers\Company\ActivityController;
use App\Http\Controllers\Company\AffectationController;
use App\Http\Controllers\Company\DailyReportController;
use App\Http\Controllers\Company\DashboardController;
use App\Http\Controllers\Company\DataExportController;
use App\Http\Controllers\Company\Events\EventActivateController;
use App\Http\Controllers\Company\Events\EventController;
use App\Http\Controllers\Company\Events\EventHostessController;
use App\Http\Controllers\Company\Events\EventPackController;
use App\Http\Controllers\Company\Events\EventSiteController;
use App\Http\Controllers\Company\PersonnelController;
use App\Http\Controllers\Company\ProductController;
use App\Http\Controllers\Company\ReportController;
use App\Http\Controllers\Company\SiteController;
use App\Http\Controllers\Company\SiteInventoryController;
use App\Http\Controllers\Company\SitePhotoController;
use App\Http\Controllers\Company\StockAlertController;
use App\Http\Controllers\Company\TicketController;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware(EnsureUserHasRole::using(Role::CompanyAdmin, Role::Supervisor, Role::Accountant))
        ->group(function () {
            Route::get('dashboard', DashboardController::class)->name('dashboard');

            // Rapports de ventes et export Excel pour la comptabilité
            Route::get('rapports', [ReportController::class, 'index'])->name('reports.index');
            Route::get('rapports/export', [ReportController::class, 'export'])->name('reports.export');
            Route::get('rapports/pdf', [ReportController::class, 'pdf'])->name('reports.pdf');

            // Rapports journaliers des hôtesses
            Route::get('rapports-journaliers', [DailyReportController::class, 'index'])->name('daily-reports.index');
            Route::get('rapports-journaliers/{dailyReport}', [DailyReportController::class, 'show'])->name('daily-reports.show');
            Route::get('rapports-journaliers/{dailyReport}/pdf', [DailyReportController::class, 'pdf'])->name('daily-reports.pdf');
        });

    // Réservé au gérant : export des données, catalogue, création des sites, événements
    Route::middleware(EnsureUserHasRole::using(Role::CompanyAdmin))
        ->group(function () {
            Route::get('mes-donnees', [DataExportController::class, 'show'])->name('company.data-export');
            Route::get('mes-donnees/telecharger', [DataExportController::class, 'download'])
                ->middleware('throttle:5,1')
                ->name('company.data-export.download');

            // Déclarées avant sites/{site} : sinon « sites/create » serait pris pour un site
            Route::resource('sites', SiteController::class)->only(['create', 'store', 'destroy']);

            Route::resource('products', ProductController::class)->except(['show']);

            // Événements commerciaux
            Route::resource('events', EventController::class)->except(['edit']);
            Route::post('events/{event}/activate', EventActivateController::class)->name('events.activate');
            Route::post('events/{event}/sites', [EventSiteController::class, 'store'])->name('events.sites.store');
            Route::delete('events/{event}/sites/{eventSite}', [EventSiteController::class, 'destroy'])->name('events.sites.destroy');
            Route::post('events/{event}/packs', [EventPackController::class, 'store'])->name('events.packs.store');
            Route::put('events/{event}/packs/{pack}', [EventPackController::class, 'update'])->name('events.packs.update');
            Route::delete('events/{event}/packs/{pack}', [EventPackController::class, 'destroy'])->name('events.packs.destroy');
            Route::post('events/{event}/hostesses', [EventHostessController::class, 'store'])->name('events.hostesses.store');
            Route::put('events/{event}/hostesses/{hostess}', [EventHostessController::class, 'update'])->name('events.hostesses.update');
            Route::delete('events/{event}/hostesses/{hostess}', [EventHostessController::class, 'destroy'])->name('events.hostesses.destroy');
        });

    // Gérant et superviseur ; le superviseur est limité aux sites où il est affecté
    Route::middleware(EnsureUserHasRole::using(Role::CompanyAdmin, Role::Supervisor))
        ->group(function () {
            Route::post('rapports/objectifs', [ReportController::class, 'saveTarget'])->name('reports.targets.save');

            Route::resource('sites', SiteController::class)->only(['index', 'show', 'edit', 'update']);
            Route::post('sites/{site}/photos', [SitePhotoController::class, 'store'])->name('sites.photos.store');
            Route::delete('sites/{site}/photos/{index}', [SitePhotoController::class, 'destroy'])->name('sites.photos.destroy');
            Route::resource('sites.inventory', SiteInventoryController::class)->only(['store', 'update', 'destroy']);
            // Relecture des rapports journaliers : correction puis validation
            Route::put('rapports-journaliers/{dailyReport}', [DailyReportController::class, 'update'])->name('daily-reports.update');
            Route::post('rapports-journaliers/{dailyReport}/valider', [DailyReportController::class, 'validateReport'])->name('daily-reports.validate');

            Route::post('sites/{site}/inventory/{inventory}/reassort', [SiteInventoryController::class, 'restock'])->name('sites.inventory.restock');

            Route::resource('personnel', PersonnelController::class);

            Route::resource('affectations', AffectationController::class)->except(['show']);
            Route::post('affectations/{affectation}/permuter', [AffectationController::class, 'permuter'])->name('affectations.permuter');

            // Suivi en direct : activité du jour et produits sous leur seuil
            Route::get('activite', ActivityController::class)->name('activity.index');
            Route::get('stock/alertes', StockAlertController::class)->name('stock-alerts.index');

            // Demandes des hôtesses (tickets)
            Route::get('tickets', [TicketController::class, 'index'])->name('tickets.index');
            Route::put('tickets/{ticket}', [TicketController::class, 'update'])->name('tickets.update');
        });
});
