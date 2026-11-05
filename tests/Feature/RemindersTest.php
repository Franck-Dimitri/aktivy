<?php

namespace Tests\Feature;

use App\Enums\AffectationStatus;
use App\Enums\Role;
use App\Models\CompanyModule;
use App\Models\ReminderLog;
use App\Models\Site;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\HostessesNotCheckedIn;
use App\Notifications\ReminderNotification;
use App\Support\Reminders\ReminderEngine;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Rappels automatiques : au bon moment, à la bonne personne, une seule fois, jamais la nuit,
 * et selon les réglages de l'entreprise.
 */
class RemindersTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $hostess;

    private Site $site;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();

        $this->manager = User::factory()->create();
        $this->hostess = User::factory()->fieldAgent()->create(['company_id' => $this->manager->company_id, 'name' => 'Awa']);
        $this->site = $this->manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $this->manager->id]);
        $this->manager->company->affectations()->create([
            'site_id' => $this->site->id, 'user_id' => $this->hostess->id, 'assigned_by' => $this->manager->id,
            'starts_on' => '2026-11-01', 'slot_start' => '08:00', 'slot_end' => '16:00', 'status' => AffectationStatus::Active,
        ]);
    }

    /** Exécute le moteur à cette heure de Douala. */
    private function runAt(string $time): array
    {
        $at = CarbonImmutable::parse("2026-11-05 {$time}", 'Africa/Douala');
        $this->travelTo($at);

        return (new ReminderEngine)->run($at);
    }

    private function sent(User $to, string $type): int
    {
        return Notification::sent($to, ReminderNotification::class)->filter(fn ($n) => $n->type === $type)->count();
    }

    private function checkIn(string $at): int
    {
        $now = now();

        return DB::table('visits')->insertGetId(['company_id' => $this->hostess->company_id, 'site_id' => $this->site->id, 'user_id' => $this->hostess->id, 'checked_in_at' => "2026-11-05 {$at}:00", 'status' => 'in_progress', 'created_at' => $now, 'updated_at' => $now]);
    }

    public function test_the_hostess_is_reminded_before_her_shift_only_once()
    {
        $this->runAt('07:20');
        $this->assertSame(0, $this->sent($this->hostess, 'shift_upcoming'), 'Trop tôt : 40 min avant');

        $this->runAt('07:35');
        $this->runAt('07:36');
        $this->assertSame(1, $this->sent($this->hostess, 'shift_upcoming'));
    }

    public function test_a_late_hostess_and_her_managers_are_told_once()
    {
        $this->runAt('08:20');
        $this->assertSame(0, $this->sent($this->hostess, 'shift_late'));

        $this->runAt('08:31');
        $this->runAt('09:10');
        $this->assertSame(1, $this->sent($this->hostess, 'shift_late'));
        Notification::assertSentToTimes($this->manager, HostessesNotCheckedIn::class, 1);
    }

    public function test_no_reminder_once_she_has_checked_in()
    {
        $this->checkIn('07:50');
        $this->runAt('08:45');

        $this->assertSame(0, $this->sent($this->hostess, 'shift_late'));
        Notification::assertNotSentTo($this->manager, HostessesNotCheckedIn::class);
    }

    public function test_closing_reminder_when_she_is_still_on_duty_after_her_shift()
    {
        $this->checkIn('07:55');
        $this->runAt('15:50');
        $this->assertSame(0, $this->sent($this->hostess, 'closing'));

        $this->runAt('16:01');
        $this->runAt('16:30');
        $this->assertSame(1, $this->sent($this->hostess, 'closing'));
    }

    public function test_evening_reminders_for_the_hostess_and_the_managers()
    {
        $visit = $this->checkIn('07:55');
        DB::table('daily_reports')->insert(['company_id' => $this->hostess->company_id, 'site_id' => $this->site->id, 'user_id' => $this->hostess->id, 'visit_id' => $visit, 'report_date' => '2026-11-05', 'status' => 'draft', 'created_at' => now(), 'updated_at' => now()]);

        $this->runAt('18:40');
        Notification::assertSentTo($this->manager, ReminderNotification::class, fn ($n) => $n->type === 'missing_reports' && str_contains($n->body(), 'Awa'));
        $this->assertSame(0, $this->sent($this->hostess, 'report_not_sent'), 'Rappel hôtesse prévu à 19:00');

        $this->runAt('19:05');
        $this->assertSame(1, $this->sent($this->hostess, 'report_not_sent'));
    }

    public function test_nothing_is_sent_at_night()
    {
        $this->checkIn('07:55');
        $this->assertSame([], $this->runAt('22:30'));
        Notification::assertNothingSent();
    }

    public function test_each_company_chooses_its_reminders_and_times()
    {
        $company = $this->manager->company;
        $company->forceFill(['reminder_settings' => ['shift_upcoming' => false, 'shift_late_minutes' => 60]])->save();

        $this->runAt('07:45');
        $this->assertSame(0, $this->sent($this->hostess, 'shift_upcoming'));

        $this->runAt('08:40');
        $this->assertSame(0, $this->sent($this->hostess, 'shift_late'), 'Retard signalé à 60 min seulement');

        $this->runAt('09:01');
        $this->assertSame(1, $this->sent($this->hostess, 'shift_late'));
    }

    public function test_managers_hear_about_low_stock_and_unanswered_requests()
    {
        $product = DB::table('products')->insertGetId(['company_id' => $this->manager->company_id, 'name' => 'Jus', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('site_products')->insert(['company_id' => $this->manager->company_id, 'site_id' => $this->site->id, 'product_id' => $product, 'current_stock' => 2, 'alert_threshold' => 10, 'critical_threshold' => 3, 'created_at' => now(), 'updated_at' => now()]);
        $this->travelTo(CarbonImmutable::parse('2026-11-05 05:00', 'Africa/Douala'));
        $ticket = Ticket::create(['company_id' => $this->manager->company_id, 'user_id' => $this->hostess->id, 'subject' => 'Rupture', 'body' => 'Plus de jus.', 'priority' => 'normal', 'status' => 'open']);

        $this->runAt('08:50');
        Notification::assertNotSentTo($this->manager, ReminderNotification::class, fn ($n) => $n->type === 'low_stock');

        $this->runAt('09:05');
        Notification::assertSentTo($this->manager, ReminderNotification::class, fn ($n) => $n->type === 'low_stock' && str_contains($n->body(), 'critique'));
        Notification::assertSentTo($this->manager, ReminderNotification::class, fn ($n) => $n->type === 'ticket_unanswered');

        $this->runAt('11:00');
        $this->assertSame(1, $this->sent($this->manager, 'ticket_unanswered'), 'Une seule relance par demande');
        $this->assertTrue(ReminderLog::where('key', "ticket-unanswered:{$ticket->id}")->exists());
    }

    public function test_the_day_before_an_event_and_expiring_subscriptions()
    {
        $event = $this->manager->company->events()->create(['name' => 'Foire', 'start_date' => '2026-11-06', 'end_date' => '2026-11-08', 'city' => 'Douala', 'created_by' => $this->manager->id]);
        $event->forceFill(['status' => 'active'])->save();
        $event->hostesses()->create(['user_id' => $this->hostess->id]);

        $admin = User::factory()->superAdmin()->create();
        CompanyModule::where('company_id', $this->manager->company_id)->where('module', 'stocks')->update(['ends_on' => '2026-11-12']);

        $this->runAt('17:05');

        Notification::assertSentTo($this->manager, ReminderNotification::class, fn ($n) => $n->type === 'event_tomorrow');
        Notification::assertSentTo($this->hostess, ReminderNotification::class, fn ($n) => $n->type === 'event_tomorrow');
        Notification::assertSentTo($admin, ReminderNotification::class, fn ($n) => $n->type === 'subscriptions_expiring' && str_contains($n->title(), '7 jours'));
    }

    public function test_the_command_runs()
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-05 07:40', 'Africa/Douala'));
        $this->artisan('reminders:run')->assertSuccessful();
        $this->assertSame(1, $this->sent($this->hostess, 'shift_upcoming'));
        $this->assertSame(Role::FieldAgent, $this->hostess->role);
    }
}
