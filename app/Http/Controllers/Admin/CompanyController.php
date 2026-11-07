<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\Module;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Controllers\OnboardingController;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Notifications\CompanyInvitation;
use App\Support\PhoneNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Entreprises clientes de la plateforme : suivi, fiche détaillée, création directe,
 * suspension et réactivation.
 */
class CompanyController extends Controller
{
    public function index(): Response
    {
        $companies = Company::query()
            ->withCount(['users', 'sites'])
            ->withMax('dailyReports', 'report_date')
            ->latest()
            ->get()
            ->map(fn (Company $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'city' => $c->city,
                'email' => $c->email,
                'status' => $c->status->value,
                'users_count' => $c->users_count,
                'sites_count' => $c->sites_count,
                'last_report' => $c->daily_reports_max_report_date
                    ? date('d/m/Y', strtotime($c->daily_reports_max_report_date))
                    : null,
                'created_at' => $c->created_at?->format('d/m/Y'),
            ]);

        return Inertia::render('admin/companies/index', ['companies' => $companies]);
    }

    /**
     * Fiche d'une entreprise : gérant, équipe, points de vente, usage, modules et historique.
     */
    public function show(Company $company): Response
    {
        $since = today()->subDays(29);

        $members = $company->users()->orderBy('name')->get();
        $roleCounts = $members->countBy(fn (User $u) => $u->role->value);

        $reports30 = $company->dailyReports()->where('status', 'submitted')->whereDate('report_date', '>=', $since->toDateString());

        return Inertia::render('admin/companies/show', [
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'status' => $company->status->value,
                'sector' => $company->sector,
                'city' => $company->city,
                'address' => $company->address,
                'email' => $company->email,
                'phone' => $company->phone,
                'currency' => $company->currency ?: 'XAF',
                'created_at' => $company->created_at?->format('d/m/Y'),
                'has_file' => $company->onboarding_completed_at !== null,
                'rejection_reason' => $company->rejection_reason,
            ],
            'managers' => $members->filter(fn (User $u) => $u->role === Role::CompanyAdmin)->values()->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'verified' => $u->email_verified_at !== null,
                'invited' => (bool) $u->must_change_password,
                'status' => $u->status->value,
                'last_login' => $u->last_login_at?->format('d/m/Y à H:i'),
            ]),
            'team' => [
                'supervisors' => (int) ($roleCounts[Role::Supervisor->value] ?? 0),
                'hostesses' => (int) ($roleCounts[Role::FieldAgent->value] ?? 0),
                'accountants' => (int) ($roleCounts[Role::Accountant->value] ?? 0),
            ],
            'sites' => $company->sites()->orderBy('name')->get(['id', 'name', 'city', 'status'])->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'city' => $s->city,
                'status' => $s->status->value,
            ]),
            'usage' => [
                'reports' => (clone $reports30)->count(),
                'active_hostesses' => $company->visits()->where('checked_in_at', '>=', $since)->distinct()->count('user_id'),
                'revenue' => (float) DB::table('daily_report_lines')
                    ->whereIn('daily_report_id', (clone $reports30)->select('id'))
                    ->sum('revenue'),
                'last_report' => $company->dailyReports()->where('status', 'submitted')->max('report_date'),
            ],
            'modules' => $company->modules()->active()->orderBy('module')->get()->map(fn ($m) => [
                'label' => $m->module->label(),
                'ends_on' => $m->ends_on?->format('d/m/Y'),
                'is_trial' => (bool) $m->is_trial,
            ]),
            'history' => AuditLog::query()
                ->where('company_id', $company->id)
                ->with('user:id,name')
                ->latest('created_at')
                ->limit(25)
                ->get()
                ->map(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'user' => $log->user?->name,
                    'at' => $log->created_at?->format('d/m/Y à H:i'),
                ]),
            'sectors' => OnboardingController::SECTORS,
            'payments' => SubscriptionController::payments($company->subscriptionPayments()->latest('paid_at')->latest('id')->limit(10)->get()),
            'billing' => [
                'modules' => collect(Module::cases())->map(fn (Module $m) => ['key' => $m->value, 'label' => $m->label()]),
                'methods' => collect(SubscriptionPayment::METHODS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values(),
                'active_keys' => $company->modules()->active()->get()->map(fn ($m) => $m->module->value)->values(),
                'has_deadline' => $company->modules()->whereNotNull('ends_on')->exists(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/companies/create', [
            'sectors' => OnboardingController::SECTORS,
        ]);
    }

    /**
     * Création directe d'une entreprise (sans dossier d'inscription) : elle est active tout de suite,
     * avec l'essai des modules, et son gérant reçoit une invitation pour choisir son mot de passe.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'manager_email' => Str::lower((string) $request->input('manager_email')),
            'manager_phone' => PhoneNumber::normalize($request->input('manager_phone')),
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sector' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'manager_name' => ['required', 'string', 'max:255'],
            'manager_email' => ['required', 'email', 'max:255', Rule::unique(User::class, 'email')],
            'manager_phone' => ['nullable', 'string', 'max:20', Rule::unique(User::class, 'phone')],
        ], [
            'manager_email.unique' => 'Cette adresse e-mail est déjà utilisée par un autre compte.',
            'manager_phone.unique' => 'Ce numéro est déjà utilisé par un autre compte.',
        ], [
            'name' => 'Le nom de l’entreprise',
            'manager_name' => 'Le nom du gérant',
            'manager_email' => 'L’e-mail du gérant',
        ]);

        [$company, $manager] = DB::transaction(function () use ($data) {
            $company = Company::create([
                'name' => $data['name'],
                'slug' => Company::uniqueSlug($data['name']),
                'sector' => $data['sector'] ?? null,
                'city' => $data['city'] ?? null,
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'email' => $data['manager_email'],
                'status' => AccountStatus::Active,
            ]);

            // Mot de passe inutilisable : le gérant choisit le sien depuis l'invitation
            $manager = $company->users()->create([
                'role' => Role::CompanyAdmin,
                'name' => $data['manager_name'],
                'email' => $data['manager_email'],
                'phone' => $data['manager_phone'] ?? null,
                'password' => Hash::make(Str::random(64)),
                'must_change_password' => true,
            ]);

            $company->startTrial();

            AuditLog::record('company.created_by_admin', $company, new: ['name' => $company->name, 'manager' => $manager->email]);

            return [$company, $manager];
        });

        $manager->notify(new CompanyInvitation($company));

        return redirect()->route('admin.companies.show', $company)
            ->with('success', "« {$company->name} » est créée. Une invitation a été envoyée à {$manager->email}.");
    }

    /**
     * Correction des informations de l'entreprise.
     */
    public function update(Request $request, Company $company): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sector' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $old = $company->only(array_keys($data));
        $company->update($data);
        $changed = array_keys(array_diff_assoc(array_map('strval', $company->only(array_keys($data))), array_map('strval', $old)));

        if ($changed !== []) {
            AuditLog::record('company.updated_by_admin', $company, array_intersect_key($old, array_flip($changed)), $company->only($changed));
        }

        return back()->with('success', 'Informations de l’entreprise enregistrées.');
    }

    public function suspend(Company $company): RedirectResponse
    {
        abort_unless($company->isActive(), 422, 'Seule une entreprise active peut être suspendue.');

        return $this->setStatus($company, AccountStatus::Suspended, 'company.suspended', "« {$company->name} » est suspendue.");
    }

    public function reactivate(Company $company): RedirectResponse
    {
        abort_unless($company->status === AccountStatus::Suspended, 422, 'Seule une entreprise suspendue peut être réactivée.');

        return $this->setStatus($company, AccountStatus::Active, 'company.reactivated', "« {$company->name} » est réactivée.");
    }

    private function setStatus(Company $company, AccountStatus $status, string $action, string $message): RedirectResponse
    {
        $old = $company->status->value;
        $company->update(['status' => $status]);
        AuditLog::record($action, $company, ['status' => $old], ['status' => $status->value]);

        return back()->with('success', $message);
    }
}
