<?php

namespace App\Http\Controllers;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class PersonnelController extends Controller
{
    /** Roles that belong to a company and can be managed here. */
    private const MANAGEABLE_ROLES = [
        Role::Supervisor,
        Role::FieldAgent,
        Role::Accountant,
    ];

    public function index(Request $request): Response
    {
        $company = $request->user()->company;

        $staff = $company->users()
            ->whereIn('role', array_column(self::MANAGEABLE_ROLES, 'value'))
            ->withCount('visits')
            ->with(['activeVisit.site:id,name'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id'           => $u->id,
                'name'         => $u->name,
                'role'         => $u->role->value,
                'role_label'   => $u->role->label(),
                'phone'        => $u->phone,
                'status'       => $u->status->value,
                'status_label' => $u->status === AccountStatus::Active ? 'Actif' : 'Suspendu',
                'visits_count' => $u->visits_count,
                'on_site_now'  => $u->activeVisit->first()?->site?->name,
            ]);

        return Inertia::render('personnel/index', [
            'staff' => $staff,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('personnel/create', [
            'roles' => $this->roleOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'phone'    => ['nullable', 'string', 'max:25'],
            'email'    => ['nullable', 'email', 'max:255'],
            'role'     => ['required', 'string', 'in:'.implode(',', array_column(self::MANAGEABLE_ROLES, 'value'))],
            'password' => ['required', 'confirmed', Password::defaults()],
            'notes'    => ['nullable', 'string', 'max:500'],
        ]);

        if (empty($validated['phone']) && empty($validated['email'])) {
            return back()->withErrors(['phone' => 'Au moins un identifiant (téléphone ou e-mail) est requis.'])->withInput();
        }

        $request->user()->company->users()->create([
            'name'                  => $validated['name'],
            'phone'                 => $validated['phone'] ?? null,
            'email'                 => $validated['email'] ?? null,
            'role'                  => $validated['role'],
            'password'              => Hash::make($validated['password']),
            'status'                => AccountStatus::Active,
            'must_change_password'  => true,
        ]);

        return redirect()->route('personnel.index')
            ->with('success', 'Membre du personnel ajouté.');
    }

    public function show(Request $request, User $user): Response
    {
        $this->authorizeCompany($request, $user);

        // Performance stats
        $stats = [
            'total_visits'    => $user->visits()->count(),
            'visits_30d'      => $user->visits()->where('checked_in_at', '>=', now()->subDays(30))->count(),
            'avg_duration'    => (int) $user->visits()->whereNotNull('duration_minutes')->avg('duration_minutes'),
            'completed_visits'=> $user->visits()->where('status', 'completed')->count(),
        ];

        // Current affectations with site info
        $affectations = $user->affectations()
            ->with('site:id,name,city,type')
            ->where('status', 'active')
            ->orderBy('starts_on')
            ->get()
            ->map(fn ($a) => [
                'id'         => $a->id,
                'site_id'    => $a->site_id,
                'site_name'  => $a->site->name,
                'site_city'  => $a->site->city,
                'site_type'  => $a->site->type->label(),
                'starts_on'  => $a->starts_on->format('d/m/Y'),
                'ends_on'    => $a->ends_on?->format('d/m/Y'),
                'slot_start' => $a->slot_start,
                'slot_end'   => $a->slot_end,
                'is_current' => $a->isCurrentlyActive(),
            ]);

        // Recent visits with site
        $recentVisits = $user->visits()
            ->with('site:id,name')
            ->latest('checked_in_at')
            ->limit(10)
            ->get()
            ->map(fn ($v) => [
                'id'               => $v->id,
                'site_name'        => $v->site->name,
                'checked_in_at'    => $v->checked_in_at->format('d/m/Y H:i'),
                'checked_out_at'   => $v->checked_out_at?->format('H:i'),
                'duration_minutes' => $v->duration_minutes,
                'status'           => $v->status->value,
                'status_label'     => $v->status->label(),
            ]);

        return Inertia::render('personnel/show', [
            'member' => [
                'id'           => $user->id,
                'name'         => $user->name,
                'role'         => $user->role->value,
                'role_label'   => $user->role->label(),
                'phone'        => $user->phone,
                'email'        => $user->email,
                'status'       => $user->status->value,
                'status_label' => $user->status === AccountStatus::Active ? 'Actif' : 'Suspendu',
            ],
            'stats'        => $stats,
            'affectations' => $affectations,
            'recent_visits'=> $recentVisits,
        ]);
    }

    public function edit(Request $request, User $user): Response
    {
        $this->authorizeCompany($request, $user);

        return Inertia::render('personnel/edit', [
            'member' => [
                'id'     => $user->id,
                'name'   => $user->name,
                'phone'  => $user->phone,
                'email'  => $user->email,
                'role'   => $user->role->value,
                'status' => $user->status->value,
            ],
            'roles'    => $this->roleOptions(),
            'statuses' => [
                ['value' => AccountStatus::Active->value,    'label' => 'Actif'],
                ['value' => AccountStatus::Suspended->value, 'label' => 'Suspendu'],
            ],
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorizeCompany($request, $user);

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'phone'    => ['nullable', 'string', 'max:25'],
            'email'    => ['nullable', 'email', 'max:255'],
            'role'     => ['required', 'string', 'in:'.implode(',', array_column(self::MANAGEABLE_ROLES, 'value'))],
            'status'   => ['required', 'string', 'in:'.implode(',', array_column(AccountStatus::cases(), 'value'))],
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ]);

        if (empty($validated['phone']) && empty($validated['email'])) {
            return back()->withErrors(['phone' => 'Au moins un identifiant (téléphone ou e-mail) est requis.'])->withInput();
        }

        $user->fill([
            'name'   => $validated['name'],
            'phone'  => $validated['phone'] ?? null,
            'email'  => $validated['email'] ?? null,
            'role'   => $validated['role'],
            'status' => $validated['status'],
        ]);

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
            $user->must_change_password = true;
        }

        $user->save();

        return redirect()->route('personnel.show', $user)
            ->with('success', 'Profil mis à jour.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->authorizeCompany($request, $user);

        $user->delete();

        return redirect()->route('personnel.index')
            ->with('success', 'Membre archivé.');
    }

    private function authorizeCompany(Request $request, User $user): void
    {
        abort_if($user->company_id !== $request->user()->company_id, 403);
    }

    /** @return array<int, array{value: string, label: string}> */
    private function roleOptions(): array
    {
        return array_map(
            fn (Role $r) => ['value' => $r->value, 'label' => $r->label()],
            self::MANAGEABLE_ROLES,
        );
    }
}
