<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WeeklyTarget;
use App\Notifications\WeeklyTargetSet;
use App\Support\Notifications\Notify;
use App\Support\Reports\SalesReport;
use App\Support\Targets\WeeklyTargets;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Objectifs hebdomadaires des hôtesses, fixés (ou non) par le gérant ou leur superviseur.
 * Chargés à l'ouverture du formulaire ; seules la semaine en cours et la suivante se règlent.
 */
class WeeklyTargetController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate(['week' => ['nullable', Rule::in(['current', 'next'])]]);

        $today = WeeklyTargets::today($user);
        $current = WeeklyTarget::weekOf($today);
        $weekStart = $request->input('week') === 'next' ? $current->addWeek() : $current;
        $weekEnd = $weekStart->addDays(6)->endOfDay();
        $lastStart = $weekStart->subWeek();

        $hostesses = WeeklyTargets::hostesses($user, $weekStart)
            ->with(['affectations' => fn ($a) => $a->ongoing()->with('site:id,name')])
            ->orderBy('name')
            ->get(['id', 'name']);
        $ids = $hostesses->pluck('id');

        $targets = WeeklyTarget::whereIn('user_id', $ids)
            ->whereIn('week_start', [$weekStart->toDateString(), $lastStart->toDateString()])
            ->get();
        $thisWeek = $targets->filter(fn ($t) => $t->week_start->equalTo($weekStart))->keyBy('user_id');
        $lastWeek = $targets->filter(fn ($t) => $t->week_start->equalTo($lastStart))->keyBy('user_id');

        $siteIds = $user->managedSiteIds();
        $company = $user->company;
        $lastActual = (new SalesReport($company, $lastStart, $lastStart->addDays(6)->endOfDay(), allowedSiteIds: $siteIds))->revenueByHostess();
        $actual = $weekStart->lte($today)
            ? (new SalesReport($company, $weekStart, $today->endOfDay(), allowedSiteIds: $siteIds))->revenueByHostess()
            : [];

        return response()->json([
            'week' => $weekStart->equalTo($current) ? 'current' : 'next',
            'week_start' => $weekStart->toDateString(),
            'week_end' => $weekEnd->toDateString(),
            'days_elapsed' => $weekStart->equalTo($current) ? $today->dayOfWeekIso : 0,
            'currency' => $company->currency ?: 'XAF',
            'hostesses' => $hostesses->map(fn (User $h) => [
                'user_id' => $h->id,
                'name' => $h->name,
                'sites' => $h->affectations->pluck('site.name')->filter()->unique()->values(),
                'target' => $thisWeek->get($h->id)?->amount,
                'actual' => (float) ($actual[$h->id] ?? 0),
                'last_target' => $lastWeek->get($h->id)?->amount,
                'last_actual' => (float) ($lastActual[$h->id] ?? 0),
            ]),
        ]);
    }

    /**
     * Enregistre les objectifs d'une semaine : un montant vide retire l'objectif de l'hôtesse.
     * Les hôtesses dont l'objectif est nouveau ou modifié en sont prévenues sous la cloche.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $current = WeeklyTarget::weekOf(WeeklyTargets::today($user));

        $data = $request->validate([
            'week_start' => ['required', 'date', Rule::in([$current->toDateString(), $current->addWeek()->toDateString()])],
            'targets' => ['present', 'array', 'max:500'],
            'targets.*.user_id' => ['required', 'integer', 'distinct'],
            'targets.*.amount' => ['nullable', 'integer', 'min:0', 'max:1000000000000'],
        ], [
            'week_start.in' => 'Seuls les objectifs de cette semaine et de la suivante peuvent être fixés.',
            'targets.*.amount.integer' => 'Un objectif doit être un montant entier, sans décimales.',
        ]);

        $weekStart = CarbonImmutable::parse($data['week_start']);
        $ids = collect($data['targets'])->pluck('user_id');

        // Chaque hôtesse doit être gérée par ce responsable
        $allowed = WeeklyTargets::hostesses($user, $weekStart)->whereIn('id', $ids)->pluck('id');
        abort_if($allowed->count() !== $ids->unique()->count(), 403, 'Certaines hôtesses ne font pas partie de votre équipe.');

        $existing = WeeklyTarget::where('week_start', $weekStart->toDateString())->whereIn('user_id', $ids)->get()->keyBy('user_id');
        $changed = [];

        DB::transaction(function () use ($data, $existing, $weekStart, $user, &$changed) {
            foreach ($data['targets'] as $row) {
                $target = $existing->get($row['user_id']);
                $amount = (int) ($row['amount'] ?? 0);

                if ($amount === 0) {
                    $target?->delete();

                    continue;
                }

                if ($target?->amount === $amount) {
                    continue;
                }

                WeeklyTarget::updateOrCreate(
                    ['user_id' => $row['user_id'], 'week_start' => $weekStart->toDateString()],
                    ['company_id' => $user->company_id, 'amount' => $amount, 'updated_by' => $user->id],
                );
                $changed[$row['user_id']] = $amount;
            }
        });

        $currency = $user->company->currency ?: 'XAF';
        foreach (User::whereIn('id', array_keys($changed))->get() as $hostess) {
            Notify::send($hostess, new WeeklyTargetSet($changed[$hostess->id], $currency, $weekStart));
        }

        return back()->with('success', 'Objectifs de la semaine enregistrés.');
    }
}
