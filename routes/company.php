<?php

use App\Enums\Role;
use App\Http\Controllers\Company\AffectationController;
use App\Http\Controllers\Company\DashboardController;
use App\Http\Controllers\Company\PersonnelController;
use App\Http\Controllers\Company\ProductController;
use App\Http\Controllers\Company\SiteController;
use App\Http\Controllers\Company\SiteInventoryController;
use App\Http\Controllers\Company\SitePhotoController;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware(EnsureUserHasRole::using(Role::CompanyAdmin, Role::Supervisor, Role::Accountant))
        ->group(function () {
            Route::get('dashboard', DashboardController::class)->name('dashboard');
        });

    Route::middleware(EnsureUserHasRole::using(Role::CompanyAdmin, Role::Supervisor))
        ->group(function () {
            Route::resource('sites', SiteController::class);
            Route::post('sites/{site}/photos', [SitePhotoController::class, 'store'])->name('sites.photos.store');
            Route::delete('sites/{site}/photos/{index}', [SitePhotoController::class, 'destroy'])->name('sites.photos.destroy');

            Route::resource('personnel', PersonnelController::class);

            Route::resource('affectations', AffectationController::class)->except(['show']);
            Route::post('affectations/{affectation}/permuter', [AffectationController::class, 'permuter'])->name('affectations.permuter');

            Route::resource('products', ProductController::class)->except(['show']);
            Route::resource('sites.inventory', SiteInventoryController::class)->only(['store', 'update', 'destroy']);
        });
});
