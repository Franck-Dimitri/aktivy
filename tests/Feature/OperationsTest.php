<?php

namespace Tests\Feature;

use App\Support\ErrorAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

/**
 * Exploitation : santé réelle, sauvegarde des fichiers hors serveur, alertes d'erreur.
 */
class OperationsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        File::delete(File::glob(storage_path('backups/motriks_fichiers_*')));

        parent::tearDown();
    }

    public function test_health_is_ok_when_the_scheduler_beats_and_the_queue_moves()
    {
        cache()->put('scheduler:heartbeat', now()->getTimestamp());

        $this->getJson(route('health'))
            ->assertOk()
            ->assertJson(['status' => 'ok', 'checks' => ['database' => 'ok', 'scheduler' => 'ok', 'queue' => 'ok', 'storage' => 'ok']]);
    }

    public function test_health_reports_a_stopped_scheduler_and_a_stuck_queue()
    {
        config(['queue.default' => 'database']);
        DB::table('jobs')->insert([
            'queue' => 'default', 'payload' => '{}', 'attempts' => 0, 'reserved_at' => null,
            'available_at' => now()->subHour()->getTimestamp(), 'created_at' => now()->subHour()->getTimestamp(),
        ]);

        $this->getJson(route('health'))
            ->assertStatus(503)
            ->assertJsonPath('status', 'ko')
            ->assertJsonPath('checks.scheduler', 'ko')
            ->assertJsonPath('checks.queue', 'ko');
    }

    public function test_uploaded_files_are_archived_encrypted_and_copied_off_the_server()
    {
        Storage::fake('offsite');
        config(['services.backup.passphrase' => 'secret', 'services.backup.disk' => 'offsite', 'services.telegram.chat_id' => null]);
        Process::fake(function ($process) {
            $command = $process->command;
            $target = $command[0] === 'tar' ? $command[array_search('-czf', $command) + 1] : $command[array_search('-out', $command) + 1];
            file_put_contents($target, 'archive');

            return Process::result();
        });

        $this->artisan('files:backup')->assertSuccessful();

        $this->assertCount(1, File::glob(storage_path('backups/motriks_fichiers_*.tar.gz.enc')));
        $this->assertCount(0, File::glob(storage_path('backups/motriks_fichiers_*.tar.gz')));
        $this->assertCount(1, Storage::disk('offsite')->files('motriks'));
    }

    public function test_identity_documents_are_never_archived_in_clear()
    {
        Process::fake();
        config(['services.backup.passphrase' => null]);

        $this->artisan('files:backup')->assertFailed();

        Process::assertNothingRan();
    }

    public function test_a_server_error_alerts_the_team_once_without_its_message()
    {
        Http::fake(['*' => Http::response(['ok' => true])]);
        config(['services.telegram.chat_id' => '42', 'services.telegram.bot_token' => 't']);
        app()->detectEnvironment(fn () => 'production');

        $error = new RuntimeException('SELECT * FROM users WHERE phone = 690000001');
        ErrorAlert::exception($error);
        ErrorAlert::exception($error);

        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => str_contains((string) $request['text'], 'RuntimeException')
            && ! str_contains((string) $request['text'], '690000001'));
    }
}
