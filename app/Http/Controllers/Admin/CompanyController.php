<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Entreprises clientes de la plateforme : suivi, suspension et réactivation.
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
