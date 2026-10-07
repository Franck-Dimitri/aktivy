<?php

use Illuminate\Support\Facades\Route;

use Carbon\Carbon;
use Inertia\Inertia;

Route::get('/', function () {
    $targetDate = Carbon::parse('2026-10-07')->addMonths(2)->endOfDay()->toIso8601String();

    return Inertia::render('welcome', [
        'targetDate' => $targetDate,
        'appName' => config('app.name', 'Aktivy'),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
