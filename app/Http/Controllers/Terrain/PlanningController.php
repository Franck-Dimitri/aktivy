<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PlanningController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user  = $request->user();
        $today = now()->toDateString();

        // Affectations actives et à venir (non terminées)
        $upcoming = Affectation::with('site:id,name,city,type,address')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhere('ends_on', '>=', $today))
            ->orderBy('starts_on')
            ->get()
            ->map(fn ($a) => [
                'id'           => $a->id,
                'site_name'    => $a->site->name,
                'site_city'    => $a->site->city,
                'site_type'    => $a->site->type->label(),
                'site_address' => $a->site->address,
                'starts_on'    => $a->starts_on->toDateString(),
                'ends_on'      => $a->ends_on?->toDateString(),
                'slot_start'   => $a->slot_start,
                'slot_end'     => $a->slot_end,
                'is_active'    => $a->starts_on->toDateString() <= $today
                                  && ($a->ends_on === null || $a->ends_on->toDateString() >= $today),
            ]);

        // 90 derniers jours de visites pour le calendrier
        $visits = $user->visits()
            ->where('checked_in_at', '>=', now()->subDays(89)->startOfDay())
            ->orderByDesc('checked_in_at')
            ->get()
            ->map(fn ($v) => [
                'id'               => $v->id,
                'date'             => $v->checked_in_at->toDateString(),
                'checked_in_at'    => $v->checked_in_at->format('H:i'),
                'checked_out_at'   => $v->checked_out_at?->format('H:i'),
                'duration_minutes' => $v->duration_minutes,
                'status'           => $v->status->value,
            ]);

        // Stats agrégées par période
        $statsFor = fn (string $from) => [
            'visits'        => $user->visits()->where('checked_in_at', '>=', $from)->count(),
            'total_minutes' => (int) $user->visits()
                                    ->where('checked_in_at', '>=', $from)
                                    ->whereNotNull('duration_minutes')
                                    ->sum('duration_minutes'),
            'reports'       => DB::table('daily_reports')
                                    ->where('user_id', $user->id)
                                    ->where('status', 'submitted')
                                    ->where('report_date', '>=', $from)
                                    ->count(),
        ];

        $stats = [
            'week'  => $statsFor(now()->startOfWeek()->toDateString()),
            'month' => $statsFor(now()->startOfMonth()->toDateString()),
            'year'  => $statsFor(now()->startOfYear()->toDateString()),
        ];

        return Inertia::render('terrain/planning', [
            'upcoming' => $upcoming,
            'visits'   => $visits,
            'stats'    => $stats,
        ]);
    }
}
