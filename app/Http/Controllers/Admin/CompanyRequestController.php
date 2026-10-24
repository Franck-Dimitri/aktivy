<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Notifications\CompanyApproved;
use App\Notifications\CompanyRejected;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\Notification as BaseNotification;
use Illuminate\Support\Facades\Notification;
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
                'documents'                => [
                    'id_card_front'    => $this->documentKind($company->id_card_front_path),
                    'id_card_back'     => $this->documentKind($company->id_card_back_path),
                    'registration_doc' => $this->documentKind($company->registration_doc_path),
                ],
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

        $this->notifyCompany($company, new CompanyApproved($company));

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

        $this->notifyCompany($company, new CompanyRejected($company, $validated['reason']));

        return redirect()->route('admin.onboarding.index')
            ->with('success', "La demande de « {$company->name} » a été rejetée.");
    }

    /**
     * Type d'aperçu d'un document soumis : image, pdf, ou null s'il n'a pas été fourni.
     */
    private function documentKind(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'pdf' ? 'pdf' : 'image';
    }

    /**
     * Envoie la notification aux gérants de l'entreprise, ou à défaut à son adresse de contact.
     */
    private function notifyCompany(Company $company, BaseNotification $notification): void
    {
        $admins = $company->users()->where('role', Role::CompanyAdmin)->get();

        if ($admins->isNotEmpty()) {
            Notification::send($admins, $notification);
        } elseif ($company->email) {
            Notification::route('mail', $company->email)->notify($notification);
        }
    }
}
