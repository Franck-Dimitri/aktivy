<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\Module;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\CompanyModule;
use App\Models\SubscriptionPayment;
use App\Notifications\LiveNotification;
use App\Notifications\ModuleExpiring;
use App\Support\Notifications\Notify;
use App\Support\Pdf\PdfDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Abonnements des entreprises : échéances, essais, paiements reçus (hors ligne) et factures.
 */
class SubscriptionController extends Controller
{
    /** Une échéance plus proche que ce nombre de jours est signalée. */
    private const SOON_DAYS = 7;

    public function index(): Response
    {
        $today = today();

        $companies = Company::query()
            ->whereIn('status', [AccountStatus::Active, AccountStatus::Suspended])
            ->with('modules')
            ->orderBy('name')
            ->get();

        $lastPayments = SubscriptionPayment::query()
            ->select('company_id', DB::raw('max(paid_at) as last_paid'))
            ->groupBy('company_id')
            ->pluck('last_paid', 'company_id');

        $rows = $companies->map(fn (Company $c) => $this->row($c, $lastPayments[$c->id] ?? null));

        $paidThisMonth = SubscriptionPayment::whereDate('paid_at', '>=', $today->copy()->startOfMonth()->toDateString())->sum('amount');
        $paidThisYear = SubscriptionPayment::whereDate('paid_at', '>=', $today->copy()->startOfYear()->toDateString())->sum('amount');

        return Inertia::render('admin/subscriptions/index', [
            'rows' => $rows->values(),
            'stats' => [
                'paid_month' => (int) $paidThisMonth,
                'paid_year' => (int) $paidThisYear,
                'trial' => $rows->where('state', 'trial')->count(),
                'paying' => $rows->where('state', 'paying')->count(),
                'soon' => $rows->where('soon', true)->count(),
                'expired' => $rows->where('state', 'expired')->count(),
                'none' => $rows->where('state', 'none')->count(),
            ],
            'payments' => $this->payments(SubscriptionPayment::query()->with('company:id,name')->latest('paid_at')->latest('id')->limit(50)->get()),
            'modules' => collect(Module::cases())->map(fn (Module $m) => ['key' => $m->value, 'label' => $m->label()]),
            'methods' => collect(SubscriptionPayment::METHODS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values(),
            'soon_days' => self::SOON_DAYS,
        ]);
    }

    /**
     * Enregistre un paiement reçu, prolonge les modules choisis jusqu'à la fin de la période
     * (ils ne sont plus en essai) et prévient le gérant.
     */
    public function store(Request $request, Company $company): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'method' => ['required', Rule::in(array_keys(SubscriptionPayment::METHODS))],
            'reference' => ['nullable', 'string', 'max:120'],
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'period_end' => ['nullable', 'date', 'after_or_equal:paid_at'],
            'modules' => ['array'],
            'modules.*' => [Rule::in(array_map(fn (Module $m) => $m->value, Module::cases()))],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'paid_at.before_or_equal' => 'La date de paiement ne peut pas être dans le futur.',
            'period_end.after_or_equal' => 'La fin de période doit être après la date de paiement.',
        ], [
            'amount' => 'Le montant',
            'method' => 'Le moyen de paiement',
            'paid_at' => 'La date de paiement',
            'period_end' => 'La fin de période',
        ]);

        $modules = array_values(array_unique($data['modules'] ?? []));

        if ($modules !== [] && empty($data['period_end'])) {
            return back()->withErrors(['period_end' => 'Indiquez jusqu’à quand les modules sont prolongés.']);
        }

        $payment = DB::transaction(function () use ($company, $data, $modules, $request) {
            $payment = SubscriptionPayment::create([
                'company_id' => $company->id,
                'invoice_number' => SubscriptionPayment::nextInvoiceNumber(),
                'amount' => $data['amount'],
                'currency' => $company->currency ?: 'XAF',
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
                'paid_at' => $data['paid_at'],
                'period_start' => $modules !== [] ? $data['paid_at'] : null,
                'period_end' => $data['period_end'] ?? null,
                'modules' => $modules ?: null,
                'notes' => $data['notes'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);

            foreach ($modules as $key) {
                $existing = CompanyModule::where('company_id', $company->id)->where('module', $key)->first();

                CompanyModule::updateOrCreate(
                    ['company_id' => $company->id, 'module' => $key],
                    [
                        // Un module encore actif garde sa date de départ
                        'starts_on' => $existing?->isActive() ? $existing->starts_on->toDateString() : today()->toDateString(),
                        'ends_on' => $data['period_end'],
                        'is_trial' => false,
                        'activated_by' => $request->user()->id,
                        'notes' => 'Facture '.$payment->invoice_number,
                    ],
                );
            }

            AuditLog::record('subscription.payment_recorded', $company, new: [
                'invoice' => $payment->invoice_number,
                'amount' => $payment->amount,
                'method' => $payment->method,
                'modules' => $modules,
                'period_end' => $data['period_end'] ?? null,
            ]);

            return $payment;
        });

        $this->notifyManagers($company, LiveNotification::paymentReceived(
            $payment->invoice_number,
            $payment->amount,
            $payment->currency,
            $payment->period_end?->format('d/m/Y'),
        ));

        return back()->with('success', "Paiement enregistré : facture {$payment->invoice_number}.");
    }

    /**
     * Relance le gérant sur la prochaine échéance de ses modules (ou le dernier module expiré).
     */
    public function remind(Company $company): RedirectResponse
    {
        $modules = $company->modules()->whereNotNull('ends_on')->get();
        $next = $modules->filter->isActive()->sortBy('ends_on')->first()
            ?? $modules->sortByDesc('ends_on')->first();

        abort_if($next === null, 422, 'Cette entreprise n’a aucune échéance à rappeler.');

        $days = (int) today()->diffInDays($next->ends_on, false);
        $this->notifyManagers($company, new ModuleExpiring($next->module->label(), $days < 0 ? -1 : $days, $next->ends_on->format('d/m/Y')));
        AuditLog::record('subscription.reminder_sent', $company, new: ['module' => $next->module->value, 'ends_on' => $next->ends_on->toDateString()]);

        return back()->with('success', "Relance envoyée au gérant de « {$company->name} ».");
    }

    public function invoice(SubscriptionPayment $payment): HttpResponse
    {
        return self::invoicePdf($payment);
    }

    /** Facture PDF d'un paiement, émise par Motriks à l'entreprise. */
    public static function invoicePdf(SubscriptionPayment $payment): HttpResponse
    {
        $payment->loadMissing('company');
        $billing = config('motriks.billing');

        // L'en-tête et le pied de page des documents sont ceux de l'émetteur : Motriks
        $issuer = new Company([
            'name' => $billing['name'],
            'email' => $billing['email'],
            'phone' => $billing['phone'],
            'address' => $billing['address'],
            'city' => $billing['city'],
            'primary_color' => '#0a6238',
        ]);

        return PdfDocument::download('pdf.invoice', [
            'title' => 'Facture '.$payment->invoice_number,
            'subtitle' => 'Abonnement à la plateforme '.config('app.name'),
            'company' => $issuer,
            'logo' => PdfDocument::motriksLogo(),
            'billing' => $billing,
            'payment' => $payment,
            'client' => $payment->company,
            'modules' => collect($payment->modules ?? [])->map(fn ($key) => Module::tryFrom($key)?->label())->filter()->values(),
        ], 'facture-'.strtolower($payment->invoice_number).'.pdf');
    }

    /**
     * @param  Collection<int, SubscriptionPayment>  $payments
     * @return Collection<int, array<string, mixed>>
     */
    public static function payments(Collection $payments): Collection
    {
        return $payments->map(fn (SubscriptionPayment $p) => [
            'id' => $p->id,
            'invoice_number' => $p->invoice_number,
            'company_id' => $p->company_id,
            'company' => $p->company?->name,
            'amount' => $p->amount,
            'currency' => $p->currency,
            'method' => $p->methodLabel(),
            'reference' => $p->reference,
            'paid_at' => $p->paid_at->format('d/m/Y'),
            'period_end' => $p->period_end?->format('d/m/Y'),
        ]);
    }

    /** @return array<string, mixed> */
    private function row(Company $company, ?string $lastPaid): array
    {
        $active = $company->modules->filter->isActive();
        $ends = $active->pluck('ends_on')->filter()->sort()->values();
        $nextEnd = $ends->first();
        $daysLeft = $nextEnd ? (int) today()->diffInDays($nextEnd, false) : null;

        $state = match (true) {
            $active->isNotEmpty() && $active->every(fn ($m) => $m->is_trial) => 'trial',
            $active->isNotEmpty() => 'paying',
            $company->modules->isNotEmpty() => 'expired',
            default => 'none',
        };

        return [
            'id' => $company->id,
            'name' => $company->name,
            'status' => $company->status->value,
            'state' => $state,
            'active_modules' => $active->count(),
            'total_modules' => count(Module::cases()),
            'next_end' => $nextEnd?->format('d/m/Y'),
            'next_end_iso' => $nextEnd?->toDateString(),
            'days_left' => $daysLeft,
            'soon' => $daysLeft !== null && $daysLeft <= self::SOON_DAYS,
            'active_keys' => $active->map(fn ($m) => $m->module->value)->values(),
            'last_paid' => $lastPaid ? date('d/m/Y', strtotime($lastPaid)) : null,
        ];
    }

    private function notifyManagers(Company $company, $notification): void
    {
        $managers = $company->users()->where('role', Role::CompanyAdmin)->where('status', AccountStatus::Active)->get();
        if ($managers->isNotEmpty()) {
            Notify::send($managers, $notification);
        }
    }
}
