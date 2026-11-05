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

        // Objectifs en vigueur : fixés cette semaine ou reconduits depuis une semaine précédente
        $thisWeek = WeeklyTarget::effective($ids, $weekStart);
        $lastWeek = WeeklyTarget::effective($ids, $lastStart);

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
                // Semaine depuis laquelle l'objectif est reconduit (null s'il a été fixé cette semaine)
                'since' => ($t = $thisWeek->get($h->id)) && $t->week_start->lt($weekStart) ? $t->week_start->toDateString() : null,
                'actual' => (float) ($actual[$h->id] ?? 0),
                'last_target' => $lastWeek->get($h->id)?->amount,
                'last_actual' => (float) ($lastActual[$h->id] ?? 0),
            ]),
        ]);
    }

    /**
     * Enregistre les objectifs à partir d'une semaine : ils restent en place les semaines suivantes
     * tant qu'ils ne sont pas changés. Un montant vide retire l'objectif à partir de cette semaine.
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

        // Ce qui s'appliquait jusque-là (semaines précédentes) et ce qui est déjà fixé pour cette semaine
        $inherited = WeeklyTarget::latestFor($ids, $weekStart->subDay());
        $atWeek = WeeklyTarget::whereIn('user_id', $ids)->whereDate('week_start', $weekStart->toDateString())->get()->keyBy('user_id');
        $changed = [];

        DB::transaction(function () use ($data, $inherited, $atWeek, $weekStart, $user, &$changed) {
            foreach ($data['targets'] as $row) {
                $userId = $row['user_id'];
                $desired = (int) ($row['amount'] ?? 0);
                $before = (int) ($inherited->get($userId)?->amount ?? 0);
                $current = (int) ($atWeek->get($userId)?->amount ?? $before);

                if ($desired === $current) {
                    continue;
                }

                if ($desired === $before) {
                    // Retour à l'objectif reconduit : la ligne de cette semaine n'a plus lieu d'être
                    $atWeek->get($userId)?->delete();
                } else {
                    // 0 enregistré = objectif retiré à partir de cette semaine
                    WeeklyTarget::updateOrCreate(
                        ['user_id' => $userId, 'week_start' => $weekStart->toDateString()],
                        ['company_id' => $user->company_id, 'amount' => $desired, 'updated_by' => $user->id],
                    );
                }

                if ($desired > 0) {
                    $changed[$userId] = $desired;
                }
            }
        });

        $currency = $user->company->currency ?: 'XAF';
        foreach (User::whereIn('id', array_keys($changed))->get() as $hostess) {
            Notify::send($hostess, new WeeklyTargetSet($changed[$hostess->id], $currency, $weekStart));
        }

        return back()->with('success', 'Objectifs enregistrés. Ils restent en place les semaines suivantes.');
    }
}
