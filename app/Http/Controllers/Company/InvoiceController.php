<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Admin\SubscriptionController as AdminSubscriptionController;
use App\Http\Controllers\Controller;
use App\Models\SubscriptionPayment;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Factures d'abonnement de l'entreprise, téléchargées par le gérant.
 */
class InvoiceController extends Controller
{
    public function show(Request $request, SubscriptionPayment $payment): Response
    {
        // Le modèle est déjà limité à l'entreprise de l'utilisateur ; on le vérifie quand même
        abort_unless($payment->company_id === $request->user()->company_id, 404);

        return AdminSubscriptionController::invoicePdf($payment);
    }
}
