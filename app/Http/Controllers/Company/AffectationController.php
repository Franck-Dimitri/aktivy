<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;

use App\Enums\AffectationStatus;
use App\Enums\Role;
use App\Models\Affectation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AffectationController extends Controller
{
    private const ASSIGNABLE_ROLES = [Role::Supervisor, Role::FieldAgent];

    public function index(Request $request): Response
    {
        $company = $request->user()->company;

        $affectations = $company->affectations()
            ->with(['agent:id,name,role,phone', 'site:id,name,city,type'])
            ->orderByRaw("CASE status WHEN 'active' THEN 0 ELSE 1 END")
            ->orderByDesc('starts_on')
            ->get()
            ->map(fn (Affectation $a) => [
                'id'          => $a->id,
                'agent_id'    => $a->user_id,
                'agent_name'  => $a->agent->name,
                'agent_role'  => $a->agent->role->value,
                'agent_phone' => $a->agent->phone,
                'site_id'     => $a->site_id,
                'site_name'   => $a->site->name,
                'site_city'   => $a->site->city,
                'site_type'   => $a->site->type->label(),
                'starts_on'   => $a->starts_on->format('d/m/Y'),
                'ends_on'     => $a->ends_on?->format('d/m/Y'),
                'slot_start'  => $a->slot_start,
                'slot_end'    => $a->slot_end,
                'status'      => $a->status->value,
                'status_label'=> $a->status->label(),
                'is_current'  => $a->isCurrentlyActive(),
                'notes'       => $a->notes,
            ]);

        $stats = [
            'total'     => $affectations->count(),
            'active'    => $affectations->where('status', 'active')->count(),
            'current'   => $affectations->where('is_current', true)->count(),
            'completed' => $affectations->where('status', 'completed')->count(),
        ];

        return Inertia::render('affectations/index', [
            'affectations' => $affectations->values(),
            'stats'        => $stats,

            // Listes en lecture seule pour la modification dans la fenêtre flottante
            // (mêmes requêtes que edit()).
            'sites' => $company->sites()
                ->orderBy('name')
                ->get(['id', 'name', 'city'])
                ->map(fn ($s) => ['value' => $s->id, 'label' => "{$s->name} ({$s->city})"]),
            'staff' => $company->users()
                ->whereIn('role', array_column(self::ASSIGNABLE_ROLES, 'value'))
                ->orderBy('name')
                ->get(['id', 'name', 'role', 'phone'])
                ->map(fn ($u) => [
                    'value'      => $u->id,
                    'label'      => $u->name,
                    'role_label' => $u->role->label(),
                    'phone'      => $u->phone,
                ]),
            'statuses' => collect(AffectationStatus::cases())
                ->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()]),
        ]);
    }

    public function create(Request $request): Response
    {
        $company = $request->user()->company;

        return Inertia::render('affectations/create', [
            'sites' => $company->sites()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'city', 'type'])
                ->map(fn ($s) => [
                    'value' => $s->id,
                    'label' => "{$s->name} ({$s->city})",
                ]),
            'staff' => $company->users()
                ->whereIn('role', array_column(self::ASSIGNABLE_ROLES, 'value'))
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'role', 'phone'])
                ->map(fn ($u) => [
                    'value'      => $u->id,
                    'label'      => $u->name,
                    'role_label' => $u->role->label(),
                    'phone'      => $u->phone,
                ]),
            'default_site_id' => (int) $request->query('site_id', 0) ?: null,
            'default_agent_id'=> (int) $request->query('agent_id', 0) ?: null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $company = $request->user()->company;

        $validated = $request->validate([
            'site_id'    => ['required', 'integer', 'exists:sites,id'],
            'user_id'    => ['required', 'integer', 'exists:users,id'],
            'starts_on'  => ['required', 'date'],
            'ends_on'    => ['nullable', 'date', 'after_or_equal:starts_on'],
            'slot_start' => ['nullable', 'date_format:H:i'],
            'slot_end'   => ['nullable', 'date_format:H:i', 'after:slot_start'],
            'notes'      => ['nullable', 'string', 'max:500'],
        ]);

        // Verify site and agent belong to this company
        abort_if(
            ! $company->sites()->where('id', $validated['site_id'])->exists(),
            403,
        );
        abort_if(
            ! $company->users()->where('id', $validated['user_id'])->exists(),
            403,
        );

        $company->affectations()->create([
            ...$validated,
            'assigned_by' => $request->user()->id,
            'status'      => AffectationStatus::Active,
        ]);

        return redirect()->route('affectations.index')
            ->with('success', 'Affectation créée.');
    }

    public function edit(Request $request, Affectation $affectation): Response
    {
        $this->authorizeCompany($request, $affectation);

        $company = $request->user()->company;

        return Inertia::render('affectations/edit', [
            'affectation' => [
                'id'         => $affectation->id,
                'site_id'    => $affectation->site_id,
                'user_id'    => $affectation->user_id,
                'starts_on'  => $affectation->starts_on->format('Y-m-d'),
                'ends_on'    => $affectation->ends_on?->format('Y-m-d'),
                'slot_start' => $affectation->slot_start,
                'slot_end'   => $affectation->slot_end,
                'status'     => $affectation->status->value,
                'notes'      => $affectation->notes,
            ],
            'sites' => $company->sites()
                ->orderBy('name')
                ->get(['id', 'name', 'city'])
                ->map(fn ($s) => ['value' => $s->id, 'label' => "{$s->name} ({$s->city})"]),
            'staff' => $company->users()
                ->whereIn('role', array_column(self::ASSIGNABLE_ROLES, 'value'))
                ->orderBy('name')
                ->get(['id', 'name', 'role', 'phone'])
                ->map(fn ($u) => [
                    'value'      => $u->id,
                    'label'      => $u->name,
                    'role_label' => $u->role->label(),
                    'phone'      => $u->phone,
                ]),
            'statuses' => collect(AffectationStatus::cases())
                ->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()]),
        ]);
    }

    public function update(Request $request, Affectation $affectation): RedirectResponse
    {
        $this->authorizeCompany($request, $affectation);

        $validated = $request->validate([
            'site_id'    => ['required', 'integer', 'exists:sites,id'],
            'user_id'    => ['required', 'integer', 'exists:users,id'],
            'starts_on'  => ['required', 'date'],
            'ends_on'    => ['nullable', 'date', 'after_or_equal:starts_on'],
            'slot_start' => ['nullable', 'date_format:H:i'],
            'slot_end'   => ['nullable', 'date_format:H:i', 'after:slot_start'],
            'status'     => ['required', 'string', 'in:'.implode(',', array_column(AffectationStatus::cases(), 'value'))],
            'notes'      => ['nullable', 'string', 'max:500'],
        ]);

        $affectation->update($validated);

        return redirect()->route('affectations.index')
            ->with('success', 'Affectation mise à jour.');
    }

    public function destroy(Request $request, Affectation $affectation): RedirectResponse
    {
        $this->authorizeCompany($request, $affectation);

        $affectation->delete();

        return redirect()->route('affectations.index')
            ->with('success', 'Affectation supprimée.');
    }

    /**
     * Swap the agent on an active affectation: complete the current one and create a new one atomically.
     */
    public function permuter(Request $request, Affectation $affectation): RedirectResponse
    {
        $this->authorizeCompany($request, $affectation);

        $company = $request->user()->company;

        $validated = $request->validate([
            'user_id'    => ['required', 'integer', 'exists:users,id'],
            'starts_on'  => ['required', 'date'],
            'ends_on'    => ['nullable', 'date', 'after_or_equal:starts_on'],
            'slot_start' => ['nullable', 'date_format:H:i'],
            'slot_end'   => ['nullable', 'date_format:H:i', 'after:slot_start'],
            'notes'      => ['nullable', 'string', 'max:500'],
        ]);

        abort_if(
            ! $company->users()->where('id', $validated['user_id'])->exists(),
            403,
        );

        DB::transaction(function () use ($affectation, $validated, $request, $company) {
            $affectation->update([
                'status'  => AffectationStatus::Completed,
                'ends_on' => now()->toDateString(),
            ]);

            $company->affectations()->create([
                'site_id'     => $affectation->site_id,
                'user_id'     => $validated['user_id'],
                'starts_on'   => $validated['starts_on'],
                'ends_on'     => $validated['ends_on'] ?? null,
                'slot_start'  => $validated['slot_start'] ?? null,
                'slot_end'    => $validated['slot_end'] ?? null,
                'notes'       => $validated['notes'] ?? null,
                'assigned_by' => $request->user()->id,
                'status'      => AffectationStatus::Active,
            ]);
        });

        return back()->with('success', 'Hôtesse permutée avec succès.');
    }

    private function authorizeCompany(Request $request, Affectation $affectation): void
    {
        abort_if($affectation->company_id !== $request->user()->company_id, 403);
    }
}