<?php

namespace App\Http\Controllers;

use App\Enums\SiteStatus;
use App\Enums\SiteType;
use App\Models\Site;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SiteController extends Controller
{
    public function index(Request $request): Response
    {
        $company = $request->user()->company;

        $sites = $company->sites()
            ->withCount(['affectations' => fn ($q) => $q->where('status', 'active')])
            ->orderBy('name')
            ->get()
            ->map(fn (Site $site) => [
                'id' => $site->id,
                'name' => $site->name,
                'code' => $site->code,
                'type' => $site->type->value,
                'type_label' => $site->type->label(),
                'city' => $site->city,
                'region' => $site->region,
                'status' => $site->status->value,
                'status_label' => $site->status->label(),
                'active_affectations_count' => $site->affectations_count,
                'last_visit_at' => $site->last_visit_at?->diffForHumans(),
                'has_coordinates' => $site->hasCoordinates(),
            ]);

        return Inertia::render('sites/index', [
            'sites' => $sites,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('sites/create', [
            'types' => collect(SiteType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:30'],
            'type' => ['required', 'string', 'in:'.implode(',', array_column(SiteType::cases(), 'value'))],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'contact_name' => ['nullable', 'string', 'max:150'],
            'contact_phone' => ['nullable', 'string', 'max:25'],
            'opening_time' => ['nullable', 'date_format:H:i'],
            'closing_time' => ['nullable', 'date_format:H:i', 'after:opening_time'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $company = $request->user()->company;

        // Validate unique code within the company
        if (! empty($validated['code'])) {
            $exists = $company->sites()->where('code', $validated['code'])->exists();
            if ($exists) {
                return back()->withErrors(['code' => 'Ce code est déjà utilisé par un autre site.'])->withInput();
            }
        }

        $company->sites()->create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('sites.index')
            ->with('success', 'Site créé avec succès.');
    }

    public function show(Request $request, Site $site): Response
    {
        $this->authorizeCompany($request, $site);

        $affectations = $site->affectations()
            ->with('agent:id,name,phone,role')
            ->where('status', 'active')
            ->orderBy('starts_on')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'agent_name' => $a->agent->name,
                'agent_phone' => $a->agent->phone,
                'starts_on' => $a->starts_on->format('d/m/Y'),
                'ends_on' => $a->ends_on?->format('d/m/Y'),
                'slot_start' => $a->slot_start,
                'slot_end' => $a->slot_end,
                'is_current' => $a->isCurrentlyActive(),
            ]);

        $recentVisits = $site->visits()
            ->with('agent:id,name')
            ->latest('checked_in_at')
            ->limit(10)
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'agent_name' => $v->agent->name,
                'checked_in_at' => $v->checked_in_at->format('d/m/Y H:i'),
                'checked_out_at' => $v->checked_out_at?->format('H:i'),
                'duration_minutes' => $v->duration_minutes,
                'status' => $v->status->value,
                'status_label' => $v->status->label(),
            ]);

        return Inertia::render('sites/show', [
            'site' => [
                'id' => $site->id,
                'name' => $site->name,
                'code' => $site->code,
                'type' => $site->type->value,
                'type_label' => $site->type->label(),
                'address' => $site->address,
                'city' => $site->city,
                'region' => $site->region,
                'latitude' => $site->latitude,
                'longitude' => $site->longitude,
                'contact_name' => $site->contact_name,
                'contact_phone' => $site->contact_phone,
                'opening_time' => $site->opening_time,
                'closing_time' => $site->closing_time,
                'notes' => $site->notes,
                'status' => $site->status->value,
                'status_label' => $site->status->label(),
                'last_visit_at' => $site->last_visit_at?->diffForHumans(),
            ],
            'affectations' => $affectations,
            'recent_visits' => $recentVisits,
        ]);
    }

    public function edit(Request $request, Site $site): Response
    {
        $this->authorizeCompany($request, $site);

        return Inertia::render('sites/edit', [
            'site' => [
                'id' => $site->id,
                'name' => $site->name,
                'code' => $site->code,
                'type' => $site->type->value,
                'address' => $site->address,
                'city' => $site->city,
                'region' => $site->region,
                'latitude' => $site->latitude,
                'longitude' => $site->longitude,
                'contact_name' => $site->contact_name,
                'contact_phone' => $site->contact_phone,
                'opening_time' => $site->opening_time,
                'closing_time' => $site->closing_time,
                'notes' => $site->notes,
                'status' => $site->status->value,
            ],
            'types' => collect(SiteType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
            'statuses' => collect(SiteStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
        ]);
    }

    public function update(Request $request, Site $site): RedirectResponse
    {
        $this->authorizeCompany($request, $site);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:30'],
            'type' => ['required', 'string', 'in:'.implode(',', array_column(SiteType::cases(), 'value'))],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'contact_name' => ['nullable', 'string', 'max:150'],
            'contact_phone' => ['nullable', 'string', 'max:25'],
            'opening_time' => ['nullable', 'date_format:H:i'],
            'closing_time' => ['nullable', 'date_format:H:i', 'after:opening_time'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', 'string', 'in:'.implode(',', array_column(SiteStatus::cases(), 'value'))],
        ]);

        if (! empty($validated['code']) && $validated['code'] !== $site->code) {
            $exists = $request->user()->company->sites()
                ->where('code', $validated['code'])
                ->where('id', '!=', $site->id)
                ->exists();

            if ($exists) {
                return back()->withErrors(['code' => 'Ce code est déjà utilisé par un autre site.'])->withInput();
            }
        }

        $site->update($validated);

        return redirect()->route('sites.show', $site)
            ->with('success', 'Site mis à jour.');
    }

    public function destroy(Request $request, Site $site): RedirectResponse
    {
        $this->authorizeCompany($request, $site);

        $site->delete();

        return redirect()->route('sites.index')
            ->with('success', 'Site archivé.');
    }

    private function authorizeCompany(Request $request, Site $site): void
    {
        abort_if($site->company_id !== $request->user()->company_id, 403);
    }
}
