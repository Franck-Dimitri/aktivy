<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyRequestController extends Controller
{
    public function index(): Response
    {
        $companies = Company::query()
            ->whereIn('status', [AccountStatus::Pending->value, AccountStatus::Rejected->value])
            ->whereNotNull('onboarding_completed_at')
            ->with(['users' => fn ($q) => $q->limit(1)])
            ->latest('onboarding_completed_at')
            ->get()
            ->map(fn (Company $c) => [
                'id'                       => $c->id,
                'name'                     => $c->name,
                'sector'                   => $c->sector,
                'city'                     => $c->city,
                'status'                   => $c->status->value,
                'onboarding_completed_at'  => $c->onboarding_completed_at?->format('d/m/Y H:i'),
                'admin_name'               => $c->users->first()?->name,
                'admin_email'              => $c->users->first()?->email,
                'rejection_reason'         => $c->rejection_reason,
            ]);

        // Pending incomplete (registered but haven't filled onboarding yet)
        $incomplete = Company::query()
            ->where('status', AccountStatus::Pending->value)
            ->whereNull('onboarding_completed_at')
            ->count();

        return Inertia::render('admin/onboarding/index', [
            'companies'  => $companies,
            'incomplete' => $incomplete,
        ]);
    }

    public function show(Company $company): Response
    {
        $admin = $company->users()->first();

        return Inertia::render('admin/onboarding/show', [
            'company' => [
                'id'                       => $company->id,
                'name'                     => $company->name,
                'sector'                   => $company->sector,
                'city'                     => $company->city,
                'address'                  => $company->address,
                'email'                    => $company->email,
                'phone'                    => $company->phone,
                'status'                   => $company->status->value,
                'rejection_reason'         => $company->rejection_reason,
                'onboarding_completed_at'  => $company->onboarding_completed_at?->format('d/m/Y H:i'),
                'logo_url'                 => $company->logo_path ? asset('storage/' . $company->logo_path) : null,
                'has_id_card_front'        => (bool) $company->id_card_front_path,
                'has_id_card_back'         => (bool) $company->id_card_back_path,
                'has_registration_doc'     => (bool) $company->registration_doc_path,
            ],
            'admin' => [
                'name'  => $admin?->name,
                'email' => $admin?->email,
                'phone' => $admin?->phone,
            ],
        ]);
    }

    public function approve(Company $company): RedirectResponse
    {
        abort_unless($company->isPending(), 422, 'Cette entreprise ne peut pas être approuvée.');

        $company->update([
            'status'           => AccountStatus::Active,
            'rejection_reason' => null,
        ]);

        // TODO: send approval email to company admin

        return redirect()->route('admin.onboarding.index')
            ->with('success', "L'entreprise « {$company->name} » a été activée.");
    }

    public function reject(Request $request, Company $company): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $company->update([
            'status'           => AccountStatus::Rejected,
            'rejection_reason' => $validated['reason'],
        ]);

        // TODO: send rejection email to company admin

        return redirect()->route('admin.onboarding.index')
            ->with('success', "La demande de « {$company->name} » a été rejetée.");
    }
}
