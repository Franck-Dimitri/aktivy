<?php

namespace App\Http\Controllers\Company;

use App\Enums\Plan;
use App\Http\Controllers\Controller;
use App\Models\SubscriptionPayment;
use App\Support\Plans\PlanPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Abonnement de l'entreprise : forfait en cours, limites et usage, comparaison des forfaits, factures.
 */
class SubscriptionController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $company = $request->user()->company;

        return Inertia::render('company/subscription', [
            'plan' => PlanPresenter::state($company),
            'plans' => PlanPresenter::catalog(),
            'pack' => ['price' => Plan::PACK_PRICE, 'hostesses' => Plan::PACK_HOSTESSES, 'sites' => Plan::PACK_SITES],
            'payments' => $company->subscriptionPayments()->latest('paid_at')->latest('id')->get()->map(fn (SubscriptionPayment $p) => [
                'id' => $p->id,
                'invoice_number' => $p->invoice_number,
                'amount' => $p->amount,
                'currency' => $p->currency,
                'method' => $p->methodLabel(),
                'plan' => $p->plan?->label(),
                'paid_at' => $p->paid_at->format('d/m/Y'),
                'period_end' => $p->period_end?->format('d/m/Y'),
            ]),
        ]);
    }
}
