<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Journal d'audit de toute la plateforme, consultable et filtrable par le super administrateur.
 */
class AuditLogController extends Controller
{
    /** Familles d'actions proposées dans le filtre (préfixe des actions enregistrées). */
    private const GROUPS = [
        'auth.login_failed' => 'Échecs de connexion',
        'auth.' => 'Connexions',
        'company.' => 'Entreprises',
        'plan.' => 'Forfaits',
        'module.' => 'Modules (ancien)',
        'subscription.' => 'Abonnements',
        'manager.' => 'Aide aux gérants',
        'admin.' => 'Connexions « en tant que »',
        'support.' => 'Support',
        'reports.' => 'Exports',
        'import.' => 'Imports',
        'user.' => 'Comptes',
        'daily_report.' => 'Rapports',
        'staff.' => 'Personnel',
    ];

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'company' => ['nullable', 'integer'],
            'group' => ['nullable', 'string', 'max:40'],
            'q' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $logs = AuditLog::query()
            ->with(['user:id,name,email', 'company:id,name'])
            ->when($filters['company'] ?? null, fn (Builder $q, $id) => $q->where('company_id', $id))
            ->when($filters['group'] ?? null, function (Builder $q, string $group) {
                if (! array_key_exists($group, self::GROUPS)) {
                    return;
                }
                // « Connexions » ne mélange pas les échecs, qui ont leur propre filtre
                $group === 'auth.'
                    ? $q->where('action', 'auth.login')
                    : $q->where('action', 'like', $group.'%');
            })
            ->when($filters['q'] ?? null, fn (Builder $q, string $term) => $q->whereHas('user', fn (Builder $u) => $u
                ->where('name', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")))
            ->when($filters['from'] ?? null, fn (Builder $q, $from) => $q->whereDate('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, $to) => $q->whereDate('created_at', '<=', $to))
            ->latest('created_at')
            ->latest('id')
            ->paginate(50)
            ->withQueryString()
            ->through(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'user' => $log->user?->name,
                'user_email' => $log->user?->email,
                'company_id' => $log->company_id,
                'company' => $log->company?->name,
                'ip' => $log->ip_address,
                'at' => $log->created_at?->format('d/m/Y H:i'),
                'time' => $log->created_at?->format('H:i'),
                'day' => $log->created_at?->toDateString(),
                'day_label' => $log->created_at ? $this->dayLabel($log->created_at) : null,
                'details' => $this->details($log),
            ]);

        $since = now()->subDay();
        $last24h = AuditLog::query()->where('created_at', '>=', $since)->selectRaw('action, count(*) as total')->groupBy('action')->pluck('total', 'action');

        return Inertia::render('admin/audit/index', [
            'logs' => $logs,
            'filters' => [
                'company' => isset($filters['company']) ? (int) $filters['company'] : null,
                'group' => $filters['group'] ?? null,
                'q' => $filters['q'] ?? '',
                'from' => $filters['from'] ?? '',
                'to' => $filters['to'] ?? '',
            ],
            'groups' => collect(self::GROUPS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values(),
            'companies' => Company::orderBy('name')->get(['id', 'name']),
            'failed_last_24h' => (int) ($last24h['auth.login_failed'] ?? 0),
            // Les dernières 24 heures en un coup d'œil
            'last_24h' => [
                'total' => (int) $last24h->sum(),
                'logins' => (int) ($last24h['auth.login'] ?? 0),
                'failed' => (int) ($last24h['auth.login_failed'] ?? 0),
                'admin' => (int) $last24h->filter(fn ($n, $action) => str_starts_with($action, 'admin.')
                    || str_starts_with($action, 'subscription.')
                    || str_starts_with($action, 'plan.')
                    || str_ends_with($action, '_by_admin')
                    || str_starts_with($action, 'manager.'))->sum(),
            ],
        ]);
    }

    /** « Aujourd’hui », « Hier », puis « Mardi 3 novembre 2026 ». */
    private function dayLabel(\DateTimeInterface $at): string
    {
        $day = Carbon::instance($at)->locale('fr');

        return match (true) {
            $day->isToday() => 'Aujourd’hui',
            $day->isYesterday() => 'Hier',
            default => ucfirst($day->isoFormat('dddd D MMMM YYYY')),
        };
    }

    /** Noms des valeurs enregistrées, en français. */
    private const KEYS = [
        'invoice' => 'facture', 'amount' => 'montant', 'method' => 'moyen', 'modules' => 'modules',
        'period_end' => 'jusqu’au', 'ends_on' => 'fin', 'trial' => 'essai', 'module' => 'module',
        'emailed' => 'envoyée par e-mail', 'resolved' => 'close', 'admin' => 'administrateur',
        'manager' => 'gérant', 'status' => 'statut', 'format' => 'format', 'from' => 'du', 'to' => 'au',
        'login' => 'identifiant', 'plan' => 'forfait', 'extra_packs' => 'packs', 'name' => 'nom', 'par_admin' => 'par l’administrateur',
    ];

    /**
     * Résumé lisible des valeurs enregistrées, sans données sensibles.
     */
    private function details(AuditLog $log): ?string
    {
        $values = array_merge($log->old_values ?? [], $log->new_values ?? []);
        unset($values['password'], $values['token'], $values['remember_token']);

        if ($values === []) {
            return null;
        }

        return collect($values)
            ->map(fn ($v, $k) => (self::KEYS[$k] ?? $k).' : '.(is_array($v) ? implode(', ', array_map(fn ($x) => is_scalar($x) ? (string) $x : json_encode($x), $v)) : (is_bool($v) ? ($v ? 'oui' : 'non') : (string) $v)))
            ->take(6)
            ->implode(' · ');
    }
}
