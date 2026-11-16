<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Durées de conservation de la page « Confidentialité », appliquées chaque nuit par data:purge.
 */
class DataRetentionTest extends TestCase
{
    use RefreshDatabase;

    private function notification(User $user, int $daysAgo, bool $read): void
    {
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'test',
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'data' => '{}',
            'read_at' => $read ? now()->subDays($daysAgo) : null,
            'created_at' => now()->subDays($daysAgo),
            'updated_at' => now()->subDays($daysAgo),
        ]);
    }

    public function test_old_notifications_and_audit_entries_are_purged_recent_ones_kept()
    {
        $user = User::factory()->create();
        $this->notification($user, 10, read: true);   // récente : gardée
        $this->notification($user, 100, read: true);  // lue, ancienne : effacée
        $this->notification($user, 100, read: false); // non lue, < 180 jours : gardée
        $this->notification($user, 200, read: false); // très ancienne : effacée

        DB::table('audit_logs')->insert([
            ['company_id' => $user->company_id, 'user_id' => $user->id, 'action' => 'ancien', 'created_at' => now()->subMonths(13)],
            ['company_id' => $user->company_id, 'user_id' => $user->id, 'action' => 'recent', 'created_at' => now()->subMonth()],
        ]);

        $this->artisan('data:purge')->assertSuccessful();

        $this->assertSame(2, DB::table('notifications')->count());
        $this->assertSame(['recent'], DB::table('audit_logs')->pluck('action')->all());
    }

    public function test_an_account_deleted_90_days_ago_loses_its_personal_data_but_its_sales_stay()
    {
        Storage::fake('local');
        $manager = User::factory()->create();
        $hostess = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id, 'name' => 'Awa Ndongo', 'phone' => '+237690001234']);
        Storage::disk('local')->put('staff-documents/cni.jpg', 'image');
        $hostess->documents()->create([
            'company_id' => $manager->company_id, 'type' => 'id_card', 'title' => 'CNI', 'path' => 'staff-documents/cni.jpg',
            'original_name' => 'cni.jpg', 'mime' => 'image/jpeg', 'size' => 5, 'uploaded_by' => $manager->id,
        ]);
        $site = $manager->company->sites()->create(['name' => 'Akwa', 'type' => 'autre', 'city' => 'Douala', 'created_by' => $manager->id]);
        $visit = $manager->company->visits()->create([
            'site_id' => $site->id, 'user_id' => $hostess->id, 'checked_in_at' => now()->subMonths(4),
            'checkin_latitude' => 4.05, 'checkin_longitude' => 9.7, 'status' => 'completed',
        ]);

        $hostess->delete();
        $this->travel(91)->days();

        $this->artisan('data:purge')->assertSuccessful();

        $hostess = User::withTrashed()->find($hostess->id);
        $this->assertSame('Compte supprimé', $hostess->name);
        $this->assertNull($hostess->phone);
        $this->assertStringEndsWith('@supprime.invalid', $hostess->email);
        $this->assertNotNull($hostess->anonymized_at);
        $this->assertSame(0, $hostess->documents()->count());
        Storage::disk('local')->assertMissing('staff-documents/cni.jpg');
        $this->assertNull($visit->fresh()->checkin_latitude);
        // La visite reste à l'entreprise (historique, ventes)
        $this->assertNotNull($visit->fresh());
    }

    public function test_a_recently_deleted_account_is_left_untouched()
    {
        $hostess = User::factory()->fieldAgent()->create(['name' => 'Awa Ndongo']);
        $hostess->delete();

        $this->artisan('data:purge')->assertSuccessful();

        $this->assertSame('Awa Ndongo', User::withTrashed()->find($hostess->id)->name);
    }
}
