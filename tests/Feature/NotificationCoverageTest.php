<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Models\Company;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\CompanySubmitted;
use App\Notifications\TicketAnswered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Notifications de la cloche ajoutées pour les hôtesses (réponse à leur demande)
 * et pour le super-admin (dossier d'inscription à examiner).
 */
class NotificationCoverageTest extends TestCase
{
    use RefreshDatabase;

    private function ticket(User $agent): Ticket
    {
        return Ticket::create([
            'company_id' => $agent->company_id,
            'user_id' => $agent->id,
            'subject' => 'Rupture de stock',
            'body' => 'Plus de savon au rayon.',
            'priority' => 'normal',
        ]);
    }

    public function test_the_hostess_is_notified_in_the_app_when_her_ticket_is_answered()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $ticket = $this->ticket($agent);

        $this->actingAs($manager)->put(route('tickets.update', $ticket), [
            'status' => 'in_review',
            'response' => 'Réassort livré demain matin.',
        ])->assertSessionHasNoErrors();

        // Notification enregistrée (file d'attente synchrone en test) : visible sous la cloche
        $notification = $agent->notifications()->sole();
        $this->assertSame('ticket', $notification->data['kind']);
        $this->assertSame('Réponse à votre demande', $notification->data['title']);
        $this->assertStringContainsString('Réassort livré demain matin.', $notification->data['body']);
        $this->assertSame(route('terrain.tickets.index', absolute: false), $notification->data['url']);
    }

    public function test_the_hostess_is_notified_when_her_ticket_is_resolved_without_a_new_answer()
    {
        Notification::fake();
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $ticket = $this->ticket($agent);

        $this->actingAs($manager)->put(route('tickets.update', $ticket), ['status' => 'closed'])->assertSessionHasNoErrors();

        Notification::assertSentTo($agent, TicketAnswered::class, fn ($n) => $n->title() === 'Votre demande est résolue');
    }

    public function test_saving_a_ticket_without_change_does_not_notify_again()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $ticket = $this->ticket($agent);

        $answer = ['status' => 'in_review', 'response' => 'Je m’en occupe.'];
        $this->actingAs($manager)->put(route('tickets.update', $ticket), $answer);
        $this->actingAs($manager)->put(route('tickets.update', $ticket), $answer);

        $this->assertSame(1, $agent->notifications()->count());
    }

    public function test_the_super_admin_is_notified_when_a_company_submits_its_documents()
    {
        Storage::fake('local');
        $admin = User::factory()->superAdmin()->create();
        $manager = User::factory()->for(Company::factory()->state(['status' => AccountStatus::Pending, 'city' => null]))->create();

        $this->actingAs($manager)->post(route('onboarding.store'), [
            'sector' => 'Distribution',
            'city' => 'Douala',
            'id_card_front' => UploadedFile::fake()->create('recto.pdf', 100, 'application/pdf'),
            'id_card_back' => UploadedFile::fake()->create('verso.pdf', 100, 'application/pdf'),
            'registration_doc' => UploadedFile::fake()->create('rccm.pdf', 100, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $notification = $admin->notifications()->sole();
        $this->assertSame('signup', $notification->data['kind']);
        $this->assertStringStartsWith('Nouvelle inscription', $notification->data['title']);
        $this->assertSame(route('admin.onboarding.show', $manager->company_id, absolute: false), $notification->data['url']);
    }

    public function test_a_resubmitted_file_is_flagged_as_such()
    {
        Notification::fake();
        Storage::fake('local');
        $admin = User::factory()->superAdmin()->create();
        $manager = User::factory()->for(Company::factory()->state(['status' => AccountStatus::Rejected]))->create();

        $this->actingAs($manager)->post(route('onboarding.store'), [
            'sector' => 'Distribution',
            'city' => 'Douala',
            'id_card_front' => UploadedFile::fake()->create('recto.pdf', 100, 'application/pdf'),
            'id_card_back' => UploadedFile::fake()->create('verso.pdf', 100, 'application/pdf'),
            'registration_doc' => UploadedFile::fake()->create('rccm.pdf', 100, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        Notification::assertSentTo($admin, CompanySubmitted::class, fn ($n) => str_starts_with($n->title(), 'Dossier renvoyé'));
    }
}
