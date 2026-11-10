<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPayment;
use App\Support\Billing\InvoiceDocument;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Factures émises par Motriks, toutes entreprises : recherche, filtres, totaux, aperçu du PDF.
 * Le téléchargement reste sur admin.subscriptions.invoice.
 */
class InvoiceController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'annee' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'moyen' => ['nullable', 'string', 'in:'.implode(',', array_keys(SubscriptionPayment::METHODS))],
        ]);

        $today = today();
        $first = SubscriptionPayment::min('paid_at');
        $years = $first ? range($today->year, (int) substr((string) $first, 0, 4)) : [$today->year];

        $invoices = SubscriptionPayment::query()
            ->with('company:id,name')
            ->when($filters['q'] ?? null, fn (Builder $q, string $term) => $q->where(fn (Builder $w) => $w
                ->where('invoice_number', 'like', "%{$term}%")
                ->orWhere('reference', 'like', "%{$term}%")
                ->orWhereHas('company', fn (Builder $c) => $c->where('name', 'like', "%{$term}%"))))
            ->when($filters['annee'] ?? null, fn (Builder $q, int $year) => $q->whereBetween('paid_at', ["{$year}-01-01", "{$year}-12-31 23:59:59"]))
            ->when($filters['moyen'] ?? null, fn (Builder $q, string $method) => $q->where('method', $method))
            ->latest('paid_at')
            ->latest('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (SubscriptionPayment $p) => [
                'id' => $p->id,
                'invoice_number' => $p->invoice_number,
                'company_id' => $p->company_id,
                'company' => $p->company?->name,
                'amount' => $p->amount,
                'currency' => $p->currency,
                'method' => $p->methodLabel(),
                'plan' => $p->plan?->label(),
                'extra_packs' => $p->extra_packs,
                'supervisor_packs' => $p->supervisor_packs,
                'reference' => $p->reference,
                'paid_at' => $p->paid_at->format('d/m/Y'),
                'period_start' => $p->period_start?->format('d/m/Y'),
                'period_end' => $p->period_end?->format('d/m/Y'),
            ]);

        return Inertia::render('admin/invoices/index', [
            'invoices' => $invoices,
            'filters' => [
                'q' => $filters['q'] ?? '',
                'annee' => isset($filters['annee']) ? (int) $filters['annee'] : null,
                'moyen' => $filters['moyen'] ?? null,
            ],
            'years' => $years,
            'methods' => collect(SubscriptionPayment::METHODS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values(),
            'summary' => [
                'count' => SubscriptionPayment::count(),
                'total' => (int) SubscriptionPayment::sum('amount'),
                'this_year' => (int) SubscriptionPayment::where('paid_at', '>=', $today->copy()->startOfYear())->sum('amount'),
                'this_month' => (int) SubscriptionPayment::where('paid_at', '>=', $today->copy()->startOfMonth())->sum('amount'),
                'companies' => SubscriptionPayment::distinct()->count('company_id'),
            ],
        ]);
    }

    /** Aperçu (Content-Disposition: inline) : le même PDF, mis en cache, que le téléchargement. */
    public function preview(SubscriptionPayment $payment): Response
    {
        return InvoiceDocument::response($payment, inline: true);
    }
}
