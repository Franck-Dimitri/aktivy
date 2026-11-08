<?php

namespace App\Http\Controllers\Company;

use App\Enums\Plan;
use App\Http\Controllers\Controller;
use App\Support\Plans\PlanPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Abonnement de l'entreprise : forfait en cours, limites et usage, comparaison des forfaits,
 * et la dernière facture (toutes les factures : InvoiceController@index).
 */
class SubscriptionController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $company = $request->user()->company;
        $payments = $company->subscriptionPayments();

        return Inertia::render('company/subscription', [
            'plan' => PlanPresenter::state($company),
            'plans' => PlanPresenter::catalog(),
            'pack' => ['price' => Plan::PACK_PRICE, 'hostesses' => Plan::PACK_HOSTESSES, 'sites' => Plan::PACK_SITES],
            'payments' => (clone $payments)->latest('paid_at')->latest('id')->limit(1)->get()->map(InvoiceController::present(...)),
            'paymentsCount' => $payments->count(),
            // Nom affiché dans l'en-tête de l'aperçu de facture
            'client' => $company->name,
        ]);
    }
}
