<?php

namespace App\Support\Reminders;

use App\Models\Company;
use Carbon\CarbonImmutable;

/**
 * Réglages des rappels automatiques d'une entreprise, avec des valeurs par défaut sensées.
 * Stockés dans companies.reminder_settings (JSON) ; seules les clés connues sont retenues.
 */
class ReminderSettings
{
    /** Valeurs par défaut ; les heures sont celles de l'entreprise (Africa/Douala par défaut). */
    public const DEFAULTS = [
        // Hôtesse
        'shift_upcoming' => true,
        'shift_upcoming_minutes' => 30,   // avant le début du créneau
        'shift_late' => true,
        'shift_late_minutes' => 30,       // après le début du créneau, sans pointage
        'closing' => true,
        'closing_minutes' => 0,           // après la fin du créneau, service toujours en cours
        'report' => true,
        'report_time' => '19:00',         // rapport du jour pas encore envoyé
        // Responsable
        'missing_reports' => true,
        'missing_reports_time' => '18:30',
        'low_stock' => true,
        'low_stock_time' => '09:00',
        'tickets' => true,
        'tickets_hours' => 4,             // demande sans réponse depuis
        'event_tomorrow' => true,
        'event_tomorrow_time' => '17:00',
        // Sans créneau fixé dans l'affectation
        'default_start' => '08:00',
        'default_end' => '17:00',
        // Aucun rappel pendant la nuit
        'quiet_start' => '21:00',
        'quiet_end' => '06:30',
    ];

    /** Bornes des réglages numériques (minutes / heures). */
    public const LIMITS = [
        'shift_upcoming_minutes' => [5, 180],
        'shift_late_minutes' => [5, 240],
        'closing_minutes' => [0, 180],
        'tickets_hours' => [1, 72],
    ];

    /** @param  array<string, mixed>  $values */
    private function __construct(private array $values) {}

    public static function for(Company $company): self
    {
        return new self([...self::DEFAULTS, ...array_intersect_key((array) $company->reminder_settings, self::DEFAULTS)]);
    }

    public function enabled(string $key): bool
    {
        return (bool) ($this->values[$key] ?? false);
    }

    public function int(string $key): int
    {
        return (int) $this->values[$key];
    }

    public function time(string $key): string
    {
        return (string) $this->values[$key];
    }

    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->values;
    }

    /** Heure d'aujourd'hui (fuseau de l'entreprise) à partir de « HH:MM ». */
    public function at(CarbonImmutable $now, string $hhmm): CarbonImmutable
    {
        return $now->setTimeFromTimeString($hhmm);
    }

    /** Nuit : de quiet_start à quiet_end (la plage peut passer minuit). */
    public function isQuiet(CarbonImmutable $now): bool
    {
        $t = $now->format('H:i');
        [$start, $end] = [$this->time('quiet_start'), $this->time('quiet_end')];

        return $start <= $end ? ($t >= $start && $t < $end) : ($t >= $start || $t < $end);
    }
}
