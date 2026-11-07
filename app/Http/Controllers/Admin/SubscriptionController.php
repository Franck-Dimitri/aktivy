<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\Plan;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\SubscriptionPayment;
use App\Notifications\LiveNotification;
use App\Notifications\PlanExpiring;
use App\Support\Pdf\PdfDocument;
use App\Support\Plans\PlanPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Abonnements des entreprises : forfaits en cours, échéances, essais, paiements reçus et factures.
 */
class SubscriptionController extends Controller
{
    /** Une échéance plus proche que ce nombre de jours est signalée. */
    private const SOON_DAYS = 7;

    public function index(): Response
    {
        $today = today();

        $lastPayments = SubscriptionPayment::query()
            ->select('company_id', DB::raw('max(paid_at) as last_paid'))
            ->groupBy('company_id')
            ->pluck('last_paid', 'company_id');

        $rows = Company::query()
            ->whereIn('status', [AccountStatus::Active, AccountStatus::Suspended])
            ->orderBy('name')
            ->get()
            ->map(fn (Company $c) => $this->row($c, $lastPayments[$c->id] ?? null));

        $paidThisMonth = SubscriptionPayment::whereDate('paid_at', '>=', $today->copy()->startOfMonth()->toDateString())->sum('amount');
        $paidThisYear = SubscriptionPayment::whereDate('paid_at', '>=', $today->copy()->startOfYear()->toDateString())->sum('amount');

        return Inertia::render('admin/subscriptions/index', [
            'rows' => $rows->values(),
            'stats' => [
                'paid_month' => (int) $paidThisMonth,
                'paid_year' => (int) $paidThisYear,
                // Revenu mensuel attendu des forfaits payants en cours (hors essais)
                'mrr' => (int) $rows->where('state', 'paying')->sum('monthly_price'),
                'trial' => $rows->where('state', 'trial')->count(),
                'paying' => $rows->where('state', 'paying')->count(),
                'soon' => $rows->where('soon', true)->count(),
                'expired' => $rows->where('state', 'expired')->count(),
                'starter' => $rows->where('state', 'starter')->count(),
                'by_plan' => collect(Plan::cases())->mapWithKeys(fn (Plan $p) => [$p->value => $rows->where('plan_key', $p->value)->count()]),
            ],
            'payments' => self::payments(SubscriptionPayment::query()->with('company:id,name')->latest('paid_at')->latest('id')->limit(50)->get()),
            'plans' => self::planOptions(),
            'methods' => self::methodOptions(),
            'pack_price' => Plan::PACK_PRICE,
            'soon_days' => self::SOON_DAYS,
        ]);
    }

    /**
     * Enregistre un paiement reçu : facture numérotée, forfait mis en place jusqu'à la fin de la
     * période (il sort de l'essai), gérant prévenu.
     */
    public function store(Request $request, Company $company): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'method' => ['required', Rule::in(array_keys(SubscriptionPayment::METHODS))],
            'reference' => ['nullable', 'string', 'max:120'],
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'plan' => ['required', Rule::in(array_map(fn (Plan $p) => $p->value, array_filter(Plan::cases(), fn (Plan $p) => $p !== Plan::Starter)))],
            'extra_packs' => ['nullable', 'integer', 'min:0', 'max:50'],
            'period_end' => ['required', 'date', 'after_or_equal:paid_at', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'paid_at.before_or_equal' => 'La date de paiement ne peut pas être dans le futur.',
            'period_end.after_or_equal' => 'La fin de période doit être après la date de paiement, et pas dans le passé.',
            'plan.in' => 'Choisissez un forfait payant.',
        ], [
            'amount' => 'Le montant',
            'method' => 'Le moyen de paiement',
            'paid_at' => 'La date de paiement',
            'period_end' => 'La fin de période',
            'plan' => 'Le forfait',
        ]);

        $plan = Plan::from($data['plan']);
        $packs = (int) ($data['extra_packs'] ?? 0);

        $payment = DB::transaction(function () use ($company, $data, $plan, $packs, $request) {
            $payment = SubscriptionPayment::create([
                'company_id' => $company->id,
                'invoice_number' => SubscriptionPayment::nextInvoiceNumber(),
                'amount' => $data['amount'],
                'currency' => $company->currency ?: 'XAF',
                'method' => $data['method'],
                'plan' => $plan,
                'extra_packs' => $packs,
                'reference' => $data['reference'] ?? null,
                'paid_at' => $data['paid_at'],
                'period_start' => $data['paid_at'],
                'period_end' => $data['period_end'],
                'notes' => $data['notes'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);

            $company->setPlan($plan, Carbon::parse($data['period_end']), trial: false, extraPacks: $packs);

            AuditLog::record('subscription.payment_recorded', $company, new: [
                'invoice' => $payment->invoice_number,
                'amount' => $payment->amount,
                'method' => $payment->method,
                'plan' => $plan->value,
                'extra_packs' => $packs,
                'period_end' => $data['period_end'],
            ]);

            return $payment;
        });

        CompanyPlanController::notifyManagers($company, LiveNotification::paymentReceived(
            $payment->invoice_number,
            $payment->amount,
            $payment->currency,
            $payment->period_end?->format('d/m/Y'),
        ));

        return back()->with('success', "Paiement enregistré : facture {$payment->invoice_number}, {$plan->label()} jusqu’au {$payment->period_end->format('d/m/Y')}.");
    }

    /**
     * Relance le gérant sur la fin de son forfait (ou de son essai), même s'il vient d'expirer.
     */
    public function remind(Company $company): RedirectResponse
    {
        abort_if($company->plan === Plan::Starter || $company->plan_ends_on === null, 422, 'Cette entreprise n’a aucune échéance à rappeler.');

        $days = (int) today()->diffInDays($company->plan_ends_on, false);
        CompanyPlanController::notifyManagers($company, new PlanExpiring($company->plan->label(), $days < 0 ? -1 : $days, $company->plan_ends_on->format('d/m/Y'), (bool) $company->plan_trial));
        AuditLog::record('subscription.reminder_sent', $company, new: ['plan' => $company->plan->value, 'ends_on' => $company->plan_ends_on->toDateString()]);

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
            'pack' => ['hostesses' => Plan::PACK_HOSTESSES, 'sites' => Plan::PACK_SITES],
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
            'plan' => $p->plan?->label(),
            'extra_packs' => $p->extra_packs,
            'reference' => $p->reference,
            'paid_at' => $p->paid_at->format('d/m/Y'),
            'period_end' => $p->period_end?->format('d/m/Y'),
        ]);
    }

    /** @return list<array{key: string, label: string, price: int, accepts_packs: bool}> */
    public static function planOptions(): array
    {
        return array_map(fn (Plan $p) => ['key' => $p->value, 'label' => $p->label(), 'price' => $p->price(), 'accepts_packs' => $p->acceptsPacks()], Plan::cases());
    }

    /** @return Collection<int, array{key: string, label: string}> */
    public static function methodOptions(): Collection
    {
        return collect(SubscriptionPayment::METHODS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values();
    }

    /** @return array<string, mixed> */
    private function row(Company $company, ?string $lastPaid): array
    {
        $state = PlanPresenter::state($company);

        $kind = match (true) {
            $state['expired'] => 'expired',
            $state['key'] === Plan::Starter->value => 'starter',
            $state['trial'] => 'trial',
            default => 'paying',
        };

        return [
            'id' => $company->id,
            'name' => $company->name,
            'status' => $company->status->value,
            'state' => $kind,
            'plan_key' => $state['key'],
            'plan' => $state['label'],
            'subscribed_plan' => $state['subscribed_label'],
            'subscribed_key' => $state['subscribed_key'],
            'ends_on' => $state['ends_on'],
            'days_left' => $state['days_left'],
            'soon' => $state['days_left'] !== null && $state['days_left'] <= self::SOON_DAYS,
            'extra_packs' => $state['extra_packs'],
            'monthly_price' => $state['monthly_price'],
            'can_remind' => $company->plan !== Plan::Starter && $company->plan_ends_on !== null,
            'last_paid' => $lastPaid ? date('d/m/Y', strtotime($lastPaid)) : null,
        ];
    }
}
