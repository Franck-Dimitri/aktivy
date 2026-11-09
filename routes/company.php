<?php

use App\Enums\Module;
use App\Enums\Role;
use App\Http\Controllers\Company\ActivityController;
use App\Http\Controllers\Company\AffectationController;
use App\Http\Controllers\Company\CompanyDocumentController;
use App\Http\Controllers\Company\CompanySettingsController;
use App\Http\Controllers\Company\DailyReportController;
use App\Http\Controllers\Company\DashboardController;
use App\Http\Controllers\Company\DataExportController;
use App\Http\Controllers\Company\ImportController;
use App\Http\Controllers\Company\InvoiceController;
use App\Http\Controllers\Company\Events\EventActivateController;
use App\Http\Controllers\Company\Events\EventController;
use App\Http\Controllers\Company\Events\EventHostessController;
use App\Http\Controllers\Company\Events\EventPackController;
use App\Http\Controllers\Company\Events\EventSiteController;
use App\Http\Controllers\Company\PersonnelController;
use App\Http\Controllers\Company\PersonnelDocumentController;
use App\Http\Controllers\Company\ProductController;
use App\Http\Controllers\Company\ReportController;
use App\Http\Controllers\Company\SiteController;
use App\Http\Controllers\Company\SiteInventoryController;
use App\Http\Controllers\Company\SitePhotoController;
use App\Http\Controllers\Company\StockAlertController;
use App\Http\Controllers\Company\SubscriptionController;
use App\Http\Controllers\Company\TicketController;
use App\Http\Controllers\Company\WeeklyTargetController;
use App\Http\Middleware\EnsureModuleIsActive;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware(EnsureUserHasRole::using(Role::CompanyAdmin, Role::Supervisor, Role::Accountant))
        ->group(function () {
            Route::get('dashboard', DashboardController::class)->name('dashboard');

            // Rapports de ventes et export Excel pour la comptabilité
            Route::get('rapports', [ReportController::class, 'index'])->middleware(EnsureModuleIsActive::using(Module::Reporting))->name('reports.index');
            Route::get('rapports/export', [ReportController::class, 'export'])->middleware(EnsureModuleIsActive::using(Module::Reporting))->name('reports.export');
            Route::get('rapports/pdf', [ReportController::class, 'pdf'])->middleware(EnsureModuleIsActive::using(Module::Reporting))->name('reports.pdf');
            // Onglet « Objectifs » : qui atteint son objectif de la semaine ou du mois
            Route::get('rapports/objectifs', [ReportController::class, 'objectives'])->middleware(EnsureModuleIsActive::using(Module::Reporting))->name('reports.objectives');

            // Rapports journaliers des hôtesses
            Route::get('rapports-journaliers', [DailyReportController::class, 'index'])->middleware(EnsureModuleIsActive::using(Module::Terrain))->name('daily-reports.index');
            Route::get('rapports-journaliers/{dailyReport}', [DailyReportController::class, 'show'])->middleware(EnsureModuleIsActive::using(Module::Terrain))->name('daily-reports.show');
            Route::get('rapports-journaliers/{dailyReport}/pdf', [DailyReportController::class, 'pdf'])->middleware(EnsureModuleIsActive::using(Module::Reporting))->name('daily-reports.pdf');
        });

    // Réservé au gérant : export des données, suppression des sites, événements
    Route::middleware(EnsureUserHasRole::using(Role::CompanyAdmin))
        ->group(function () {
            Route::get('entreprise', [CompanySettingsController::class, 'edit'])->name('company.settings.edit');
            // POST : le formulaire peut contenir un fichier (logo)
            Route::post('entreprise', [CompanySettingsController::class, 'update'])->name('company.settings.update');
            Route::put('entreprise/rappels', [CompanySettingsController::class, 'updateReminders'])->name('company.settings.reminders');
            // Documents légaux : CNI du gérant (recto, verso), registre de commerce
            Route::get('entreprise/documents/{type}', [CompanyDocumentController::class, 'show'])->name('company.documents.show');
            Route::post('entreprise/documents/{type}', [CompanyDocumentController::class, 'store'])->name('company.documents.store');

            // Reprise des fichiers existants
            Route::get('import', [ImportController::class, 'index'])->name('company.import.index');
            Route::get('import/{type}/modele', [ImportController::class, 'template'])->name('company.import.template');
            Route::post('import/{type}', [ImportController::class, 'store'])->middleware('throttle:10,1')->name('company.import.store');

            Route::get('abonnement', SubscriptionController::class)->name('company.subscription');
            Route::get('abonnement/factures', [InvoiceController::class, 'index'])->name('company.invoices.index');
            Route::get('abonnement/factures/{payment}/apercu', [InvoiceController::class, 'preview'])->name('company.invoices.preview');
            Route::get('abonnement/factures/{payment}', [InvoiceController::class, 'show'])->name('company.invoices.show');
            Route::get('abonnement/factures/{payment}/telecharger', [InvoiceController::class, 'show'])->name('company.invoices.download');

            Route::get('mes-donnees', [DataExportController::class, 'show'])->name('company.data-export');
            // Préparation en arrière-plan, puis téléchargement pendant 24 h
            Route::post('mes-donnees/preparer', [DataExportController::class, 'prepare'])
                ->middleware('throttle:5,10')
                ->name('company.data-export.prepare');
            Route::get('mes-donnees/{export}/telecharger', [DataExportController::class, 'download'])
                ->middleware('throttle:20,1')
                ->name('company.data-export.download');

            Route::resource('sites', SiteController::class)->only(['destroy']);

            // Événements commerciaux
            Route::resource('events', EventController::class)->except(['edit'])->middleware(EnsureModuleIsActive::using(Module::Events));
            Route::post('events/{event}/activate', EventActivateController::class)->middleware(EnsureModuleIsActive::using(Module::Events))->name('events.activate');
            Route::post('events/{event}/sites', [EventSiteController::class, 'store'])->middleware(EnsureModuleIsActive::using(Module::Events))->name('events.sites.store');
            Route::delete('events/{event}/sites/{eventSite}', [EventSiteController::class, 'destroy'])->middleware(EnsureModuleIsActive::using(Module::Events))->name('events.sites.destroy');
            Route::post('events/{event}/packs', [EventPackController::class, 'store'])->middleware(EnsureModuleIsActive::using(Module::Events))->name('events.packs.store');
            Route::put('events/{event}/packs/{pack}', [EventPackController::class, 'update'])->middleware(EnsureModuleIsActive::using(Module::Events))->name('events.packs.update');
            Route::delete('events/{event}/packs/{pack}', [EventPackController::class, 'destroy'])->middleware(EnsureModuleIsActive::using(Module::Events))->name('events.packs.destroy');
            Route::post('events/{event}/hostesses', [EventHostessController::class, 'store'])->middleware(EnsureModuleIsActive::using(Module::Events))->name('events.hostesses.store');
            Route::put('events/{event}/hostesses/{hostess}', [EventHostessController::class, 'update'])->middleware(EnsureModuleIsActive::using(Module::Events))->name('events.hostesses.update');
            Route::delete('events/{event}/hostesses/{hostess}', [EventHostessController::class, 'destroy'])->middleware(EnsureModuleIsActive::using(Module::Events))->name('events.hostesses.destroy');
        });

    // Gérant et superviseur ; le superviseur est limité aux sites où il est affecté
    Route::middleware(EnsureUserHasRole::using(Role::CompanyAdmin, Role::Supervisor))
        ->group(function () {
            Route::post('rapports/objectifs', [ReportController::class, 'saveTarget'])->middleware(EnsureModuleIsActive::using(Module::Reporting))->name('reports.targets.save');
            // Objectifs hebdomadaires des hôtesses (facultatifs)
            Route::get('objectifs-semaine', [WeeklyTargetController::class, 'show'])->middleware(EnsureModuleIsActive::using(Module::Reporting))->name('weekly-targets.show');
            Route::post('objectifs-semaine', [WeeklyTargetController::class, 'store'])->middleware(EnsureModuleIsActive::using(Module::Reporting))->name('weekly-targets.store');

            Route::resource('sites', SiteController::class)->except(['destroy']);
            Route::resource('products', ProductController::class)->except(['show']);
            Route::post('sites/{site}/photos', [SitePhotoController::class, 'store'])->name('sites.photos.store');
            Route::delete('sites/{site}/photos/{index}', [SitePhotoController::class, 'destroy'])->name('sites.photos.destroy');
            Route::resource('sites.inventory', SiteInventoryController::class)->only(['store', 'update', 'destroy']);
            // Relecture des rapports journaliers : correction puis validation
            Route::put('rapports-journaliers/{dailyReport}', [DailyReportController::class, 'update'])->middleware(EnsureModuleIsActive::using(Module::Terrain))->name('daily-reports.update');
            Route::post('rapports-journaliers/{dailyReport}/valider', [DailyReportController::class, 'validateReport'])->middleware(EnsureModuleIsActive::using(Module::Terrain))->name('daily-reports.validate');

            Route::post('sites/{site}/inventory/{inventory}/reassort', [SiteInventoryController::class, 'restock'])->middleware(EnsureModuleIsActive::using(Module::Stocks))->name('sites.inventory.restock');

            Route::resource('personnel', PersonnelController::class);
            Route::post('personnel/{personnel}/documents', [PersonnelDocumentController::class, 'store'])->name('personnel.documents.store');
            Route::get('personnel/{personnel}/documents/{document}', [PersonnelDocumentController::class, 'show'])->name('personnel.documents.show');
            Route::delete('personnel/{personnel}/documents/{document}', [PersonnelDocumentController::class, 'destroy'])->name('personnel.documents.destroy');

            Route::resource('affectations', AffectationController::class)->except(['show']);
            Route::post('affectations/{affectation}/permuter', [AffectationController::class, 'permuter'])->name('affectations.permuter');

            // Suivi en direct : activité du jour et produits sous leur seuil
            Route::get('activite', ActivityController::class)->middleware(EnsureModuleIsActive::using(Module::Terrain))->name('activity.index');
            Route::get('stock/alertes', StockAlertController::class)->middleware(EnsureModuleIsActive::using(Module::Stocks))->name('stock-alerts.index');

            // Demandes des hôtesses (tickets)
            Route::get('tickets', [TicketController::class, 'index'])->middleware(EnsureModuleIsActive::using(Module::Requests))->name('tickets.index');
            Route::put('tickets/{ticket}', [TicketController::class, 'update'])->middleware(EnsureModuleIsActive::using(Module::Requests))->name('tickets.update');
        });
});
