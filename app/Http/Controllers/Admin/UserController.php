<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\AffectationStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use App\Notifications\CompanyInvitation;
use App\Support\PhoneNumber;
use App\Support\Plans\PlanUsage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tous les comptes des entreprises clientes : recherche, correction des coordonnées et du rôle,
 * suspension, suppression (douce) et restauration, aide à la connexion.
 *
 * Le super administrateur ne voit ni ne choisit jamais un mot de passe : il envoie un lien.
 */
class UserController extends Controller
{
    private const PER_PAGE = 30;

    /** Rôles qu'un compte d'entreprise peut recevoir ici (le gérant reste gérant). */
    private const STAFF_ROLES = [Role::Supervisor, Role::FieldAgent, Role::Accountant];

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'company' => ['nullable', 'integer'],
            'role' => ['nullable', Rule::in(array_map(fn (Role $r) => $r->value, Role::cases()))],
            'status' => ['nullable', Rule::in(['active', 'suspended', 'deleted', 'unconfirmed'])],
        ]);

        $users = $this->clients()
            ->with('company:id,name,status')
            ->when($filters['q'] ?? null, function (Builder $q, string $term) {
                $like = '%'.Str::lower($term).'%';
                $digits = preg_replace('/\D+/', '', $term);
                $q->where(fn (Builder $w) => $w
                    ->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                    ->when(strlen($digits) >= 3, fn (Builder $w) => $w->orWhere('phone', 'like', "%{$digits}%")));
            })
            ->when($filters['company'] ?? null, fn (Builder $q, $id) => $q->where('company_id', $id))
            ->when($filters['role'] ?? null, fn (Builder $q, $role) => $q->where('role', $role))
            ->when($filters['status'] ?? null, fn (Builder $q, $status) => match ($status) {
                'deleted' => $q->onlyTrashed(),
                'unconfirmed' => $q->whereNotNull('email')->whereNull('email_verified_at'),
                default => $q->where('status', $status),
            })
            ->orderBy('name')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (User $u) => $this->present($u));

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'filters' => [
                'q' => $filters['q'] ?? '',
                'company' => isset($filters['company']) ? (string) $filters['company'] : '',
                'role' => $filters['role'] ?? '',
                'status' => $filters['status'] ?? '',
            ],
            'companies' => Company::orderBy('name')->get(['id', 'name'])->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]),
            'roles' => collect(Role::cases())->reject(fn (Role $r) => $r === Role::SuperAdmin)
                ->map(fn (Role $r) => ['value' => $r->value, 'label' => $r->label()])->values(),
            'staff_roles' => array_map(fn (Role $r) => $r->value, self::STAFF_ROLES),
            'counts' => [
                'total' => $this->clients()->count(),
                'hostesses' => $this->clients()->where('role', Role::FieldAgent)->count(),
                'suspended' => $this->clients()->where('status', AccountStatus::Suspended)->count(),
                'deleted' => $this->clients()->onlyTrashed()->count(),
            ],
        ]);
    }

    /**
     * Corrige le nom, l'e-mail, le téléphone et, hors gérant, le rôle. Une nouvelle adresse
     * doit être confirmée : le compte reçoit l'invitation (gérant pas encore entré) ou un e-mail de confirmation.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorizeClient($user);

        $request->merge([
            'email' => ($email = Str::lower(trim((string) $request->input('email')))) === '' ? null : $email,
            'phone' => PhoneNumber::normalize($request->input('phone')),
        ]);

        $isManager = $user->role === Role::CompanyAdmin;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            // Le gérant se connecte et reçoit tout par e-mail : l'adresse reste obligatoire pour lui
            'email' => [$isManager ? 'required' : 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($user->id)],
            'role' => $isManager ? ['prohibited'] : ['required', Rule::in(array_map(fn (Role $r) => $r->value, self::STAFF_ROLES))],
        ], [
            'email.unique' => 'Cette adresse e-mail est déjà utilisée par un autre compte.',
            'phone.unique' => 'Ce numéro est déjà utilisé par un autre compte.',
            'role.prohibited' => 'Le rôle d’un gérant ne se change pas ici.',
        ], ['name' => 'Le nom', 'email' => 'L’e-mail', 'phone' => 'Le téléphone', 'role' => 'Le rôle']);

        if (! $isManager && empty($data['email']) && empty($data['phone'])) {
            return back()->withErrors(['phone' => 'Au moins un identifiant (téléphone ou e-mail) est requis pour se connecter.']);
        }

        // Passer d'hôtesse au back-office (ou l'inverse) compte dans une autre limite du forfait
        $newRole = $isManager ? $user->role : Role::from($data['role']);
        $limitKey = PlanUsage::keyForRole($newRole);
        if ($user->company && $limitKey && $limitKey !== PlanUsage::keyForRole($user->role)
            && ($message = PlanUsage::exceeded($user->company, $limitKey))) {
            return back()->withErrors(['role' => $message]);
        }

        $old = $user->only('name', 'email', 'phone', 'role');
        $emailChanged = ($data['email'] ?? null) !== $user->email;

        $user->forceFill([
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'role' => $newRole,
            'email_verified_at' => $emailChanged ? null : $user->email_verified_at,
        ])->save();

        $now = $user->only('name', 'email', 'phone', 'role');
        $flat = fn (array $a) => array_map(fn ($v) => $v instanceof Role ? $v->value : (string) $v, $a);
        $changed = array_keys(array_diff_assoc($flat($now), $flat($old)));

        if ($changed === []) {
            return back()->with('success', 'Aucune modification.');
        }

        AuditLog::record('user.updated_by_admin', $user, array_intersect_key($flat($old), array_flip($changed)), array_intersect_key($flat($now), array_flip($changed)));

        if ($emailChanged && $user->email !== null) {
            $invitation = $isManager && $user->must_change_password && $user->company;
            $invitation
                ? $user->notify(new CompanyInvitation($user->company))
                : $user->sendEmailVerificationNotification();

            return back()->with('success', 'Compte mis à jour. Un e-mail de '.($invitation ? 'invitation' : 'confirmation')." part à {$user->email}.");
        }

        return back()->with('success', 'Compte mis à jour.');
    }

    /** Bloque la connexion du compte ; il est déconnecté à sa prochaine action. */
    public function suspend(User $user): RedirectResponse
    {
        $this->authorizeClient($user);

        if ($user->status === AccountStatus::Suspended) {
            return back()->with('success', 'Ce compte est déjà suspendu.');
        }

        $user->forceFill(['status' => AccountStatus::Suspended])->save();
        AuditLog::record('user.suspended_by_admin', $user);

        return back()->with('success', "{$user->name} est suspendu(e) : ce compte ne peut plus se connecter.");
    }

    public function reactivate(User $user): RedirectResponse
    {
        $this->authorizeClient($user);
        abort_unless($user->status === AccountStatus::Suspended, 422, 'Ce compte n’est pas suspendu.');

        $user->forceFill(['status' => AccountStatus::Active])->save();
        AuditLog::record('user.reactivated_by_admin', $user);

        return back()->with('success', "{$user->name} peut de nouveau se connecter.");
    }

    /**
     * Suppression douce, comme celle du gérant : le compte ne se connecte plus et quitte ses
     * points de vente, mais son historique reste. Une entreprise garde toujours un gérant.
     */
    public function destroy(User $user): RedirectResponse
    {
        $this->authorizeClient($user);

        if ($user->role === Role::CompanyAdmin
            && User::where('company_id', $user->company_id)->where('role', Role::CompanyAdmin)->whereKeyNot($user->id)->doesntExist()) {
            return back()->with('error', 'C’est le seul gérant de l’entreprise : modifiez-le plutôt que de le supprimer.');
        }

        $user->affectations()
            ->where('status', AffectationStatus::Active)
            ->update(['status' => AffectationStatus::Completed, 'ends_on' => now()->toDateString()]);

        $user->delete();
        AuditLog::record('user.deleted_by_admin', $user);

        return back()->with('success', "{$user->name} est supprimé(e). Le compte peut être restauré.");
    }

    public function restore(int $user): RedirectResponse
    {
        $account = User::onlyTrashed()->findOrFail($user);
        $this->authorizeClient($account);

        $account->restore();
        AuditLog::record('user.restored_by_admin', $account);

        return back()->with('success', "{$account->name} est restauré(e). Pensez à l’affecter de nouveau à ses points de vente.");
    }

    public function resendVerification(User $user): RedirectResponse
    {
        $this->authorizeClient($user);
        abort_if($user->email === null, 422, 'Ce compte n’a pas d’adresse e-mail.');

        if ($user->hasVerifiedEmail()) {
            return back()->with('success', 'Cette adresse est déjà confirmée.');
        }

        $user->sendEmailVerificationNotification();
        AuditLog::record('user.verification_resent', $user);

        return back()->with('success', "E-mail de confirmation renvoyé à {$user->email}.");
    }

    public function sendPasswordReset(User $user): RedirectResponse
    {
        $this->authorizeClient($user);
        abort_if($user->email === null, 422, 'Ce compte n’a pas d’adresse e-mail : son gérant peut lui donner un mot de passe provisoire.');

        $status = Password::broker()->sendResetLink(['email' => $user->email]);
        if ($status !== Password::RESET_LINK_SENT) {
            return back()->with('error', __($status));
        }

        AuditLog::record('user.password_reset_sent', $user);

        return back()->with('success', "Lien de nouveau mot de passe envoyé à {$user->email}.");
    }

    /** Comptes des entreprises clientes, supprimés compris (le filtre « Supprimés » les isole). */
    private function clients(): Builder
    {
        return User::withTrashed()->where('role', '!=', Role::SuperAdmin);
    }

    private function authorizeClient(User $user): void
    {
        abort_if($user->role === Role::SuperAdmin, 404);
    }

    /** @return array<string, mixed> */
    private function present(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'role' => $u->role->value,
            'role_label' => $u->role->label(),
            'status' => $u->trashed() ? 'deleted' : $u->status->value,
            'verified' => $u->email === null || $u->email_verified_at !== null,
            'invited' => (bool) $u->must_change_password,
            'last_login' => $u->last_login_at?->format('d/m/Y à H:i'),
            'created_at' => $u->created_at?->format('d/m/Y'),
            'deleted_at' => $u->deleted_at?->format('d/m/Y'),
            'company' => $u->company ? ['id' => $u->company->id, 'name' => $u->company->name] : null,
        ];
    }
}
