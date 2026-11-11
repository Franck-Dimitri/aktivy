<?php

use App\Enums\Role;
use App\Http\Controllers\Admin\CompanyController as AdminCompanyController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CompanyDocumentController as AdminCompanyDocumentController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\CompanyManagerController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\CompanyPlanController;
use App\Http\Controllers\Admin\CompanyRequestController;
use App\Http\Controllers\Admin\DocumentController;
use App\Http\Controllers\Admin\ImpersonationController;
use App\Http\Controllers\Admin\InvoiceController as AdminInvoiceController;
use App\Http\Controllers\Admin\SubscriptionController as AdminSubscriptionController;
use App\Http\Controllers\Admin\SupportController;
use App\Http\Controllers\Admin\TrafficController;
use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\HelpController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\ReportPhotoController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\TelegramWebhookController;
use App\Http\Middleware\EnsureUserHasRole;
use App\Support\Seo\PublicPages;
use Illuminate\Http\Request;
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

// Ouverture de l'application installée (start_url du manifeste) : comme une application mobile,
// l'espace de l'utilisateur s'il est connecté, sinon directement le formulaire de connexion.
Route::get('/app', fn (Request $request) => redirect($request->user()?->homeUrl() ?? route('login')))->name('app');

// Landing page (pages publiques : balises de référencement dans PublicPages)
Route::get('/', function (Request $request) use ($paymentLogos) {
    // Sur téléphone, un utilisateur connecté va directement dans son espace ; les visiteurs voient la landing
    if ($request->user() && preg_match('/Android|iPhone|iPad|iPod|Mobile/i', (string) $request->userAgent())) {
        return redirect($request->user()->homeUrl());
    }

    return PublicPages::render('landing', [
        'paymentLogos' => $paymentLogos(),
    ]);
})->name('home');

// GET uniquement : Route::redirect accepte toutes les méthodes (dont QUERY), que Wayfinder ne sait pas typer
Route::get('/accueil', fn () => redirect('/', 301))->name('landing');

// Plan du site pour les moteurs de recherche (pages publiques, généré à la volée)
Route::get('/sitemap.xml', SitemapController::class)->name('sitemap');

// Pages légales (accessibles sans connexion)
Route::get('/conditions', function () use ($paymentLogos) {
    return PublicPages::render('conditions', [
        'paymentLogos' => $paymentLogos(),
    ]);
})->name('conditions');

Route::get('/confidentialite', function () use ($paymentLogos) {
    return PublicPages::render('confidentialite', [
        'paymentLogos' => $paymentLogos(),
    ]);
})->name('confidentialite');

// Page "Nous contacter"
// Invitation d'un gérant dont l'entreprise a été créée par le super administrateur (lien signé, 7 jours)
Route::get('/invitation/{user}', [InvitationController::class, 'accept'])
    ->middleware(['signed', 'throttle:10,1'])
    ->name('invitation.accept');

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

// Onboarding entreprise (accessible aux comptes pending/rejected) : e-mail confirmé d'abord,
// puis le gérant présente ses documents
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Centre d'aide, pour tous les rôles
    Route::get('aide', [HelpController::class, 'index'])->name('help');
    Route::post('aide/support', [HelpController::class, 'support'])->middleware('throttle:5,1')->name('help.support');

    // Notifications push : appareils de l'utilisateur
    Route::post('push/abonnement', [PushSubscriptionController::class, 'store'])->middleware('throttle:20,1')->name('push.subscribe');
    Route::delete('push/abonnement', [PushSubscriptionController::class, 'destroy'])->name('push.unsubscribe');

    // Notifications (cloche), pour tous les rôles
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    // Aperçu de la cloche (JSON) : déclaré avant {notification} pour ne pas être pris pour un identifiant
    Route::get('notifications/apercu', [NotificationController::class, 'recent'])->name('notifications.recent');
    // Pouls (JSON) : l'écran se met à jour tout seul quand une notification arrive
    Route::get('notifications/pouls', [NotificationController::class, 'pulse'])->name('notifications.pulse');
    Route::get('notifications/{notification}', [NotificationController::class, 'open'])->name('notifications.open');
    Route::post('notifications/tout-lu', [NotificationController::class, 'readAll'])->name('notifications.read-all');

    // Fin d'une connexion « en tant que » : retour au compte du super administrateur
    Route::post('connexion-en-tant-que/quitter', [ImpersonationController::class, 'stop'])->name('impersonation.stop');

    // Photos des rapports journaliers (fichiers privés, accès contrôlé)
    Route::get('rapports/photos/{photo}', [ReportPhotoController::class, 'show'])->name('report-photos.show');

    Route::middleware(EnsureUserHasRole::using(Role::SuperAdmin))
        ->prefix('admin')
        ->name('admin.')
        ->group(function () {
            Route::get('/', AdminDashboardController::class)->name('dashboard');

            // Entreprises clientes
            Route::get('entreprises', [AdminCompanyController::class, 'index'])->name('companies.index');
            Route::get('entreprises/creer', [AdminCompanyController::class, 'create'])->name('companies.create');
            Route::post('entreprises', [AdminCompanyController::class, 'store'])->name('companies.store');
            Route::get('entreprises/{company}', [AdminCompanyController::class, 'show'])->name('companies.show');
            Route::put('entreprises/{company}', [AdminCompanyController::class, 'update'])->name('companies.update');
            Route::post('entreprises/{company}/gerants/{user}/confirmation', [CompanyManagerController::class, 'resendVerification'])->name('companies.managers.verification');
            Route::post('entreprises/{company}/gerants/{user}/invitation', [CompanyManagerController::class, 'resendInvitation'])->name('companies.managers.invitation');
            Route::post('entreprises/{company}/gerants/{user}/mot-de-passe', [CompanyManagerController::class, 'sendPasswordReset'])->name('companies.managers.password');
            Route::post('entreprises/{company}/gerants/{user}/connexion', [ImpersonationController::class, 'start'])->name('companies.managers.impersonate');
            Route::put('entreprises/{company}/gerants/{user}', [CompanyManagerController::class, 'update'])->name('companies.managers.update');
            Route::post('entreprises/{company}/documents/{type}', [AdminCompanyDocumentController::class, 'store'])->name('companies.documents.store');

            // Tous les comptes des entreprises clientes
            Route::get('utilisateurs', [AdminUserController::class, 'index'])->name('users.index');
            Route::put('utilisateurs/{user}', [AdminUserController::class, 'update'])->name('users.update');
            Route::post('utilisateurs/{user}/suspendre', [AdminUserController::class, 'suspend'])->name('users.suspend');
            Route::post('utilisateurs/{user}/reactiver', [AdminUserController::class, 'reactivate'])->name('users.reactivate');
            Route::delete('utilisateurs/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');
            // Compte supprimé : pas de liaison implicite (elle ignore les comptes supprimés), l'UUID est cherché à la main
            Route::post('utilisateurs/{user}/restaurer', [AdminUserController::class, 'restore'])->whereUuid('user')->name('users.restore');
            Route::post('utilisateurs/{user}/confirmation', [AdminUserController::class, 'resendVerification'])->name('users.verification');
            Route::post('utilisateurs/{user}/mot-de-passe', [AdminUserController::class, 'sendPasswordReset'])->name('users.password');

            // Abonnements : échéances, paiements reçus, factures, relances
            Route::get('abonnements', [AdminSubscriptionController::class, 'index'])->name('subscriptions.index');
            Route::post('entreprises/{company}/paiements', [AdminSubscriptionController::class, 'store'])->name('subscriptions.payments.store');
            Route::post('entreprises/{company}/relance', [AdminSubscriptionController::class, 'remind'])->name('subscriptions.remind');
            Route::get('factures/{payment}', [AdminSubscriptionController::class, 'invoice'])->name('subscriptions.invoice');

            // Toutes les factures émises par Motriks, et leur aperçu (PDF affiché dans l'application)
            Route::get('factures', [AdminInvoiceController::class, 'index'])->name('invoices.index');
            Route::get('factures/{payment}/apercu', [AdminInvoiceController::class, 'preview'])->name('invoices.preview');

            // Journal d'audit de la plateforme
            Route::get('journal', [AuditLogController::class, 'index'])->name('audit.index');
            // Volet « Trafic du site » : audience des pages publiques, sans cookie
            Route::get('journal/trafic', TrafficController::class)->name('traffic.index');

            // Boîte de support
            Route::get('support', [SupportController::class, 'index'])->name('support.index');
            Route::get('support/{supportRequest}', [SupportController::class, 'show'])->name('support.show');
            Route::post('support/{supportRequest}/reponse', [SupportController::class, 'reply'])->name('support.reply');
            Route::put('support/{supportRequest}/statut', [SupportController::class, 'updateStatus'])->name('support.status');
            Route::post('entreprises/{company}/suspendre', [AdminCompanyController::class, 'suspend'])->name('companies.suspend');
            Route::post('entreprises/{company}/reactiver', [AdminCompanyController::class, 'reactivate'])->name('companies.reactivate');
            Route::get('entreprises/{company}/forfait', [CompanyPlanController::class, 'edit'])->name('companies.plan');
            Route::put('entreprises/{company}/forfait', [CompanyPlanController::class, 'update'])->name('companies.plan.update');

            // Demandes d'inscription entreprises
            Route::prefix('onboarding')->name('onboarding.')->group(function () {
                Route::get('/', [CompanyRequestController::class, 'index'])->name('index');
                Route::get('/{company}', [CompanyRequestController::class, 'show'])->name('show');
                Route::post('/{company}/approve', [CompanyRequestController::class, 'approve'])->name('approve');
                Route::post('/{company}/reject', [CompanyRequestController::class, 'reject'])->name('reject');
                Route::get('/{company}/document/{type}', [DocumentController::class, 'show'])->name('document');
            });
        });

});


require __DIR__.'/terrain.php';
require __DIR__.'/company.php';
require __DIR__.'/settings.php';

// Telegram bot webhook (CSRF exempt — voir bootstrap/app.php)
Route::post('telegram/webhook', [TelegramWebhookController::class, 'handle'])
    ->name('telegram.webhook');