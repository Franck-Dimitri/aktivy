<?php

use App\Enums\Role;
use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Middleware\EnsureUserHasRole;
use Carbon\Carbon;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $targetDate = Carbon::parse('2026-10-07')->addMonths(2)->endOfDay()->toIso8601String();

    return Inertia::render('welcome', [
        'targetDate' => $targetDate,
        'appName' => config('app.name', 'Aktivy'),
    ]);
})->name('home');

Route::middleware('auth')->group(function () {
    Route::get('password/change', [ChangePasswordController::class, 'edit'])->name('password.change');
    Route::put('password/change', [ChangePasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.change.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware(EnsureUserHasRole::using(Role::SuperAdmin))
        ->prefix('admin')
        ->name('admin.')
        ->group(function () {
            Route::inertia('/', 'admin/dashboard')->name('dashboard');
        });

    Route::middleware(EnsureUserHasRole::using(Role::CompanyAdmin, Role::Supervisor, Role::Accountant))
        ->group(function () {
            Route::inertia('dashboard', 'dashboard')->name('dashboard');
        });

    Route::middleware(EnsureUserHasRole::using(Role::FieldAgent))
        ->prefix('terrain')
        ->name('terrain.')
        ->group(function () {
            Route::inertia('/', 'terrain/home')->name('home');
        });
});

require __DIR__.'/settings.php';
