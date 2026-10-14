<?php

use App\Enums\Role;
use App\Http\Controllers\Auth\ChangePasswordController;
<<<<<<< Updated upstream
use App\Http\Controllers\ContactController;
use App\Http\Controllers\PersonnelController;
use App\Http\Controllers\SiteController;
=======
>>>>>>> Stashed changes
use App\Http\Middleware\EnsureUserHasRole;
use Carbon\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Page "bientôt" avec compte à rebours (page d'accueil actuelle)
Route::get('/', function () {
    $targetDate = Carbon::parse('2026-10-07')->addMonths(2)->endOfDay()->toIso8601String();

    return Inertia::render('welcome', [
        'targetDate' => $targetDate,
        'appName' => config('app.name', 'Aktivy'),
    ]);
})->name('home');

// Nouvelle landing page : affiche tous les logos de paiement trouvés dans public/images/payments
Route::get('/accueil', function () {
    $directory = public_path('images/payments');

    $paymentLogos = File::isDirectory($directory)
        ? collect(File::files($directory))
            ->filter(fn ($file) => in_array(strtolower($file->getExtension()), ['png', 'jpg', 'jpeg', 'svg', 'webp'], true))
            ->sortBy(fn ($file) => $file->getFilename())
            ->map(fn ($file) => [
                'name' => $file->getFilenameWithoutExtension(),
                'url' => '/images/payments/'.rawurlencode($file->getFilename()),
            ])
            ->values()
            ->all()
        : [];

    return Inertia::render('landing', [
        'paymentLogos' => $paymentLogos,
    ]);
})->name('landing');

// Pages légales (accessibles sans connexion)
Route::inertia('/conditions', 'legal/conditions')->name('conditions');
Route::inertia('/confidentialite', 'legal/confidentialite')->name('confidentialite');

// Page "Nous contacter"
Route::get('/contact', [ContactController::class, 'show'])->name('contact');
Route::post('/contact', [ContactController::class, 'send'])
    ->middleware('throttle:5,1')
    ->name('contact.send');

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

    Route::middleware(EnsureUserHasRole::using(Role::FieldAgent))
        ->prefix('terrain')
        ->name('terrain.')
        ->group(function () {
            Route::inertia('/', 'terrain/home')->name('home');
        });
});

<<<<<<< Updated upstream
require __DIR__.'/settings.php';
=======
require __DIR__.'/company.php';
require __DIR__.'/settings.php';
>>>>>>> Stashed changes
