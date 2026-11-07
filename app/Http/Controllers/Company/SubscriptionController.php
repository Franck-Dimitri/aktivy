<?php

namespace App\Http\Controllers\Company;

use App\Enums\Module;
use App\Http\Controllers\Controller;
use App\Models\CompanyModule;
use App\Models\SubscriptionPayment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Abonnement de l'entreprise : modules actifs, essais et échéances.
 */
class SubscriptionController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $rows = $request->user()->company->modules()->get()->keyBy(fn (CompanyModule $m) => $m->module->value);

        return Inertia::render('company/subscription', [
            'modules' => collect(Module::cases())->map(function (Module $module) use ($rows) {
                $row = $rows->get($module->value);

                return [
                    'key' => $module->value,
                    'label' => $module->label(),
                    'description' => $module->description(),
                    'active' => (bool) $row?->isActive(),
                    'is_trial' => (bool) $row?->is_trial,
                    'ends_on' => $row?->ends_on?->format('d/m/Y'),
                    'days_left' => $row?->ends_on && $row->isActive() ? (int) today()->diffInDays($row->ends_on) : null,
                ];
            }),
            'payments' => $request->user()->company->subscriptionPayments()->latest('paid_at')->latest('id')->get()->map(fn (SubscriptionPayment $p) => [
                'id' => $p->id,
                'invoice_number' => $p->invoice_number,
                'amount' => $p->amount,
                'currency' => $p->currency,
                'method' => $p->methodLabel(),
                'paid_at' => $p->paid_at->format('d/m/Y'),
                'period_end' => $p->period_end?->format('d/m/Y'),
            ]),
        ]);
    }
}
