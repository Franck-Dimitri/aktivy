<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\Module;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\CompanyModule;
use App\Notifications\LiveNotification;
use App\Support\Notifications\Notify;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Activation manuelle des modules d'une entreprise par le super-administrateur.
 */
class CompanyModuleController extends Controller
{
    public function index(Company $company): Response
    {
        $rows = $company->modules()->get()->keyBy(fn (CompanyModule $m) => $m->module->value);

        return Inertia::render('admin/companies/modules', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'modules' => collect(Module::cases())->map(fn (Module $module) => [
                'key' => $module->value,
                'label' => $module->label(),
                'description' => $module->description(),
                ...$this->state($rows->get($module->value)),
            ]),
        ]);
    }

    public function update(Request $request, Company $company, string $module): RedirectResponse
    {
        $module = Module::tryFrom($module) ?? abort(404);

        $data = $request->validate([
            'ends_on' => ['nullable', 'date', 'after_or_equal:today'],
            'is_trial' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:255'],
        ], ['ends_on.after_or_equal' => 'La date de fin doit être aujourd’hui ou plus tard.']);

        $row = CompanyModule::updateOrCreate(
            ['company_id' => $company->id, 'module' => $module->value],
            [
                'starts_on' => today()->toDateString(),
                'ends_on' => $data['ends_on'] ?? null,
                'is_trial' => (bool) ($data['is_trial'] ?? false),
                'notes' => $data['notes'] ?? null,
                'activated_by' => $request->user()->id,
            ],
        );

        AuditLog::record('module.activated', $company, new: ['module' => $module->value, 'ends_on' => $row->ends_on?->toDateString(), 'trial' => $row->is_trial]);
        $this->notifyManagers($company, LiveNotification::moduleActivated($module->label(), $row->ends_on?->format('d/m/Y'), (bool) $row->is_trial));

        return back()->with('success', "{$module->label()} activé.");
    }

    public function destroy(Request $request, Company $company, string $module): RedirectResponse
    {
        $module = Module::tryFrom($module) ?? abort(404);

        $deleted = CompanyModule::where('company_id', $company->id)->where('module', $module->value)->delete();
        AuditLog::record('module.deactivated', $company, old: ['module' => $module->value]);
        if ($deleted) {
            $this->notifyManagers($company, LiveNotification::moduleDeactivated($module->label()));
        }

        return back()->with('success', "{$module->label()} désactivé.");
    }

    /** Le gérant de l'entreprise est prévenu de tout changement de son abonnement. */
    private function notifyManagers(Company $company, LiveNotification $notification): void
    {
        $managers = $company->users()->where('role', Role::CompanyAdmin)->where('status', AccountStatus::Active)->get();
        if ($managers->isNotEmpty()) {
            Notify::send($managers, $notification);
        }
    }

    /** @return array{active: bool, ends_on: string|null, is_trial: bool, expired: bool} */
    private function state(?CompanyModule $row): array
    {
        return [
            'active' => (bool) $row?->isActive(),
            'ends_on' => $row?->ends_on?->format('d/m/Y'),
            'ends_on_iso' => $row?->ends_on?->toDateString(),
            'is_trial' => (bool) $row?->is_trial,
            'expired' => $row !== null && ! $row->isActive(),
        ];
    }
}
