<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Santé réelle de l'application, pour un service de surveillance externe (UptimeRobot, Better Stack…)
 * qui appelle /sante chaque minute et alerte si la réponse n'est pas 200.
 *
 * /up (Laravel) dit seulement que PHP répond. Ici : la base répond, la file d'attente avance (sinon plus
 * aucun e-mail ni notification ne part), le planificateur tourne (rappels, sauvegardes, purges) et le
 * stockage est accessible en écriture. Aucune donnée n'est exposée : seulement « ok » ou « ko » par point.
 */
class HealthController extends Controller
{
    /** Une tâche en attente depuis plus longtemps : le worker est arrêté ou débordé. */
    private const QUEUE_MAX_WAIT_SECONDS = 600;

    /** Le planificateur bat chaque minute (routes/console.php). */
    private const SCHEDULER_MAX_SILENCE_SECONDS = 180;

    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->safely(fn () => DB::select('select 1') !== []),
            'queue' => $this->safely(fn () => $this->queueMoves()),
            'scheduler' => $this->safely(fn () => now()->getTimestamp() - (int) cache()->get('scheduler:heartbeat', 0) <= self::SCHEDULER_MAX_SILENCE_SECONDS),
            'storage' => $this->safely(fn () => is_writable(storage_path('app')) && is_writable(storage_path('framework'))),
        ];

        $healthy = ! in_array(false, $checks, true);

        return response()->json(
            ['status' => $healthy ? 'ok' : 'ko', 'checks' => array_map(fn (bool $ok) => $ok ? 'ok' : 'ko', $checks)],
            $healthy ? 200 : 503,
            ['Cache-Control' => 'no-store'],
        );
    }

    private function queueMoves(): bool
    {
        // File « sync » (tests, poste local) : rien n'attend
        if (config('queue.default') !== 'database') {
            return true;
        }

        $oldest = DB::table((string) config('queue.connections.database.table', 'jobs'))
            ->whereNull('reserved_at')
            ->min('available_at');

        return $oldest === null || now()->getTimestamp() - (int) $oldest <= self::QUEUE_MAX_WAIT_SECONDS;
    }

    private function safely(callable $check): bool
    {
        try {
            return (bool) $check();
        } catch (Throwable) {
            return false;
        }
    }
}
