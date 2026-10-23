<?php

use App\Enums\Role;
use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\PersonnelController;
use App\Http\Controllers\SiteController;
use App\Http\Controllers\TelegramWebhookController;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Logos de paiement partagés entre la landing, le contact et les pages légales
$paymentLogos = function (): array {
    $directory = public_path('images/payments');

    return File::isDirectory($directory)
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
};

// Landing page
Route::get('/', function () use ($paymentLogos) {
    return Inertia::render('landing', [
        'paymentLogos' => $paymentLogos(),
    ]);
})->name('home');

Route::redirect('/accueil', '/', 301)->name('landing');

// Pages légales (accessibles sans connexion)
Route::get('/conditions', function () use ($paymentLogos) {
    return Inertia::render('legal/conditions', [
        'paymentLogos' => $paymentLogos(),
    ]);
})->name('conditions');

Route::get('/confidentialite', function () use ($paymentLogos) {
    return Inertia::render('legal/confidentialite', [
        'paymentLogos' => $paymentLogos(),
    ]);
})->name('confidentialite');

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

});


require __DIR__.'/terrain.php';
require __DIR__.'/company.php';
require __DIR__.'/settings.php';

// Telegram bot webhook (CSRF exempt — voir bootstrap/app.php)
Route::post('telegram/webhook', [TelegramWebhookController::class, 'handle'])
    ->name('telegram.webhook');