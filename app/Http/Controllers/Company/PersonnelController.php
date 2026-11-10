<?php

namespace App\Http\Controllers\Company;

use App\Support\Plans\PlanUsage;
use App\Http\Controllers\Controller;

use App\Enums\AccountStatus;
use App\Enums\AffectationStatus;
use App\Enums\Role;
use App\Models\StaffDocument;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class PersonnelController extends Controller
{
    /** Statuts qu'un responsable peut donner à un membre. */
    private const MANAGEABLE_STATUSES = [
        AccountStatus::Active,
        AccountStatus::Suspended,
    ];

    public function index(Request $request): Response
    {
        $company = $request->user()->company;

        $staff = $company->users()
            ->whereIn('role', array_column($this->manageableRoles($request->user()), 'value'))
            ->visibleTo($request->user())
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
            // Options du modal « Nouveau membre » (même source que create()).
            'roles' => $this->roleOptions($request->user()),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('personnel/create', [
            'roles' => $this->roleOptions($request->user()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'phone'    => ['nullable', 'string', 'max:25'],
            'email'    => ['nullable', 'email', 'max:255'],
            'role'     => ['required', 'string', 'in:'.implode(',', array_column($this->manageableRoles($request->user()), 'value'))],
            'password' => ['required', 'confirmed', ...User::PROVISIONAL_PASSWORD_RULES],
            'notes'    => ['nullable', 'string', 'max:500'],
        ]);

        if (empty($validated['phone']) && empty($validated['email'])) {
            return back()->withErrors(['phone' => 'Au moins un identifiant (téléphone ou e-mail) est requis.'])->withInput();
        }

        if ($errors = $this->identifierErrors($validated)) {
            return back()->withErrors($errors)->withInput();
        }

        // Limite du forfait : hôtesses d'un côté, superviseurs de l'autre (gérant et comptables non comptés)
        $limitKey = PlanUsage::keyForRole(Role::from($validated['role']));
        if ($limitKey && ($message = PlanUsage::exceeded($request->user()->company, $limitKey))) {
            return back()->withErrors(['role' => $message])->withInput();
        }

        $member = $request->user()->company->users()->create([
            'name'                  => $validated['name'],
            'phone'                 => $validated['phone'] ?? null,
            'email'                 => isset($validated['email']) ? strtolower($validated['email']) : null,
            'role'                  => $validated['role'],
            'password'              => Hash::make($validated['password']),
            'status'                => AccountStatus::Active,
            'must_change_password'  => true,
        ]);

        // Envoyer l'email de vérification si le membre a une adresse email
        if ($member->email !== null) {
            $member->sendEmailVerificationNotification();
        }

        return redirect()->route('personnel.index')
            ->with('success', 'Membre du personnel ajouté.');
    }

    public function show(Request $request, User $personnel): Response
    {
        $this->authorizeCompany($request, $personnel);

        // Performance stats
        $stats = [
            'total_visits'    => $personnel->visits()->count(),
            'visits_30d'      => $personnel->visits()->where('checked_in_at', '>=', now()->subDays(30))->count(),
            'avg_duration'    => (int) $personnel->visits()->whereNotNull('duration_minutes')->avg('duration_minutes'),
            'completed_visits'=> $personnel->visits()->where('status', 'completed')->count(),
        ];

        // Current affectations with site info
        $affectations = $personnel->affectations()
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
        $recentVisits = $personnel->visits()
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
                'id'           => $personnel->id,
                'name'         => $personnel->name,
                'role'         => $personnel->role->value,
                'role_label'   => $personnel->role->label(),
                'phone'        => $personnel->phone,
                'email'        => $personnel->email,
                'status'       => $personnel->status->value,
                'status_label' => $personnel->status === AccountStatus::Active ? 'Actif' : 'Suspendu',
            ],
            'stats'        => $stats,
            'documents'    => $personnel->documents()->with('uploader:id,name')->latest()->get()->map(fn (StaffDocument $d) => [
                'id'          => $d->id,
                'type_label'  => StaffDocument::TYPES[$d->type] ?? $d->type,
                'title'       => $d->title,
                'size'        => $d->size,
                'is_pdf'      => $d->mime === 'application/pdf',
                'uploaded_at' => $d->created_at->format('d/m/Y'),
                'uploader'    => $d->uploader?->name,
            ]),
            'document_types' => collect(StaffDocument::TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'affectations' => $affectations,
            'recent_visits'=> $recentVisits,
            // Options du modal « Modifier »
            'roles'        => $this->roleOptions($request->user()),
            'statuses'     => [
                ['value' => AccountStatus::Active->value,    'label' => 'Actif'],
                ['value' => AccountStatus::Suspended->value, 'label' => 'Suspendu'],
            ],
        ]);
    }

    public function edit(Request $request, User $personnel): Response
    {
        $this->authorizeCompany($request, $personnel);

        return Inertia::render('personnel/edit', [
            'member' => [
                'id'     => $personnel->id,
                'name'   => $personnel->name,
                'phone'  => $personnel->phone,
                'email'  => $personnel->email,
                'role'   => $personnel->role->value,
                'status' => $personnel->status->value,
            ],
            'roles'    => $this->roleOptions($request->user()),
            'statuses' => [
                ['value' => AccountStatus::Active->value,    'label' => 'Actif'],
                ['value' => AccountStatus::Suspended->value, 'label' => 'Suspendu'],
            ],
        ]);
    }

    public function update(Request $request, User $personnel): RedirectResponse
    {
        $this->authorizeCompany($request, $personnel);

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'phone'    => ['nullable', 'string', 'max:25'],
            'email'    => ['nullable', 'email', 'max:255'],
            'role'     => ['required', 'string', 'in:'.implode(',', array_column($this->manageableRoles($request->user()), 'value'))],
            'status'   => ['required', 'string', 'in:'.implode(',', array_column(self::MANAGEABLE_STATUSES, 'value'))],
            'password' => ['nullable', 'confirmed', ...User::PROVISIONAL_PASSWORD_RULES],
        ]);

        if (empty($validated['phone']) && empty($validated['email'])) {
            return back()->withErrors(['phone' => 'Au moins un identifiant (téléphone ou e-mail) est requis.'])->withInput();
        }

        if ($errors = $this->identifierErrors($validated, $personnel)) {
            return back()->withErrors($errors)->withInput();
        }

        // Changer de rôle (hôtesse → superviseur…) compte dans une autre limite du forfait
        $limitKey = PlanUsage::keyForRole(Role::from($validated['role']));
        if ($limitKey && $limitKey !== PlanUsage::keyForRole($personnel->role)
            && ($message = PlanUsage::exceeded($request->user()->company, $limitKey))) {
            return back()->withErrors(['role' => $message])->withInput();
        }

        // Activer ou désactiver un compte : le gérant seul
        abort_if($validated['status'] !== $personnel->status->value && ! $request->user()->hasRole(Role::CompanyAdmin), 403);

        $personnel->fill([
            'name'   => $validated['name'],
            'phone'  => $validated['phone'] ?? null,
            'email'  => isset($validated['email']) ? strtolower($validated['email']) : null,
            'role'   => $validated['role'],
            'status' => $validated['status'],
        ]);

        if (! empty($validated['password'])) {
            $personnel->password = Hash::make($validated['password']);
            $personnel->must_change_password = true;
        }

        $personnel->save();

        return redirect()->route('personnel.show', $personnel)
            ->with('success', 'Profil mis à jour.');
    }

    /**
     * Supprimer un compte : le gérant seul. Le compte n'est pas effacé de la base (suppression douce) :
     * il ne peut plus se connecter et disparaît de l'entreprise, mais son historique est conservé.
     */
    public function destroy(Request $request, User $personnel): RedirectResponse
    {
        $this->authorizeCompany($request, $personnel);
        abort_unless($request->user()->hasRole(Role::CompanyAdmin), 403);

        $personnel->affectations()
            ->where('status', AffectationStatus::Active)
            ->update(['status' => AffectationStatus::Completed, 'ends_on' => now()->toDateString()]);

        $personnel->delete();

        return redirect()->route('personnel.index')
            ->with('success', 'Membre supprimé.');
    }

    private function authorizeCompany(Request $request, User $personnel): void
    {
        // Le gérant n'est géré par personne ; le superviseur ne gère que les hôtesses de ses sites
        abort_unless($personnel->isManageableBy($request->user()), 403);
    }

    /**
     * Erreurs si le téléphone ou l'e-mail est déjà pris par un autre compte.
     * Le téléphone est comparé sous sa forme normalisée, celle qui est enregistrée ;
     * les comptes supprimés comptent aussi, l'index unique les inclut.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, string>
     */
    private function identifierErrors(array $validated, ?User $ignore = null): array
    {
        $taken = fn (string $column, ?string $value) => $value !== null && User::withTrashed()
            ->where($column, $value)
            ->when($ignore, fn ($q) => $q->whereKeyNot($ignore->id))
            ->exists();

        return array_filter([
            'phone' => $taken('phone', PhoneNumber::normalize($validated['phone'] ?? null))
                ? 'Ce numéro est déjà utilisé par un autre compte.' : null,
            'email' => $taken('email', isset($validated['email']) ? strtolower($validated['email']) : null)
                ? 'Cette adresse e-mail est déjà utilisée par un autre compte.' : null,
        ]);
    }

    /**
     * Rôles que $viewer peut attribuer : le superviseur ne gère que des hôtesses.
     *
     * @return array<int, Role>
     */
    private function manageableRoles(User $viewer): array
    {
        return User::manageableRolesFor($viewer);
    }

    /** @return array<int, array{value: string, label: string}> */
    private function roleOptions(User $viewer): array
    {
        return array_map(
            fn (Role $r) => ['value' => $r->value, 'label' => $r->label()],
            $this->manageableRoles($viewer),
        );
    }
}