<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Admin\SubscriptionController as AdminSubscriptionController;
use App\Http\Controllers\Controller;
use App\Models\SubscriptionPayment;
use App\Support\Plans\PlanPresenter;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Factures d'abonnement de l'entreprise : la liste complète, et le PDF de chacune (gérant).
 */
class InvoiceController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $company = $request->user()->company;
        $payments = $company->subscriptionPayments()->latest('paid_at')->latest('id')->get();
        $plan = PlanPresenter::state($company);

        return Inertia::render('company/invoices', [
            'invoices' => $payments->map(self::present(...))->values(),
            // Nom affiché dans l'en-tête de l'aperçu de facture
            'client' => $company->name,
            'summary' => [
                'count' => $payments->count(),
                'total' => $payments->sum('amount'),
                'this_year' => $payments->filter(fn (SubscriptionPayment $p) => $p->paid_at->isCurrentYear())->sum('amount'),
                'currency' => $payments->first()?->currency ?? $company->currency ?? 'XAF',
                'last_paid_at' => $payments->first()?->paid_at->format('d/m/Y'),
                'next_due' => $plan['expired'] ? null : $plan['ends_on'],
                'plan' => $plan['label'],
            ],
        ]);
    }

    /** Téléchargement du PDF (Content-Disposition: attachment). */
    public function show(Request $request, SubscriptionPayment $payment): Response
    {
        $this->authorizeInvoice($payment);

        return AdminSubscriptionController::invoicePdf($payment);
    }

    /** Aperçu dans la fenêtre de l'application (Content-Disposition: inline) : le même PDF, mis en cache. */
    public function preview(Request $request, SubscriptionPayment $payment): Response
    {
        $this->authorizeInvoice($payment);

        return AdminSubscriptionController::invoicePdf($payment, inline: true);
    }

    /** SubscriptionPaymentPolicy ; 404 plutôt que 403 : la facture d'une autre entreprise n'existe pas pour lui. */
    private function authorizeInvoice(SubscriptionPayment $payment): void
    {
        abort_unless(Gate::allows('view', $payment), 404);
    }

    /** Une facture telle que l'affichent les pages Abonnement et Factures. */
    public static function present(SubscriptionPayment $p): array
    {
        return [
            'id' => $p->id,
            'uuid' => $p->uuid,
            'invoice_number' => $p->invoice_number,
            'amount' => $p->amount,
            'currency' => $p->currency,
            'method' => $p->methodLabel(),
            'plan' => $p->plan?->label(),
            'extra_packs' => $p->extra_packs,
            'supervisor_packs' => $p->supervisor_packs,
            'paid_at' => $p->paid_at->format('d/m/Y'),
            'period_start' => $p->period_start?->format('d/m/Y'),
            'period_end' => $p->period_end?->format('d/m/Y'),
            'reference' => $p->reference,
            'notes' => $p->notes,
        ];
    }
}
