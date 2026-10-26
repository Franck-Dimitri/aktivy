<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\AffectationStatus;
use App\Enums\EventStatus;
use App\Enums\Role;
use App\Models\Company;
use App\Models\Event;
use App\Models\Site;
use App\Models\SiteProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    private function site(User $owner, string $name = 'Santa Lucia'): Site
    {
        return $owner->company->sites()->create([
            'name' => $name,
            'type' => 'autre',
            'city' => 'Douala',
            'created_by' => $owner->id,
        ]);
    }

    private function event(User $owner, EventStatus $status = EventStatus::Draft): Event
    {
        return $owner->company->events()->create([
            'name' => 'Lancement',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'status' => $status,
            'created_by' => $owner->id,
        ]);
    }

    public function test_the_telegram_webhook_is_refused_when_no_secret_is_configured()
    {
        config(['services.telegram.webhook_secret' => null]);

        $this->postJson(route('telegram.webhook'), [
            'message' => ['text' => '/backup', 'chat' => ['id' => 1], 'from' => ['id' => 1]],
        ])->assertUnauthorized();
    }

    public function test_the_telegram_bot_only_answers_whitelisted_users()
    {
        Http::fake();
        config(['services.telegram.webhook_secret' => 'secret', 'services.telegram.allowed_ids' => '']);

        $this->postJson(route('telegram.webhook'), [
            'message' => ['text' => '/backup', 'chat' => ['id' => 42], 'from' => ['id' => 42]],
        ], ['X-Telegram-Bot-Api-Secret-Token' => 'secret'])->assertOk();

        Http::assertSent(fn ($request) => str_contains($request['text'] ?? '', 'Accès non autorisé'));
        Http::assertSentCount(1);
    }

    public function test_a_supervisor_can_not_edit_the_company_manager()
    {
        $manager = User::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['company_id' => $manager->company_id]);

        $this->actingAs($supervisor)->put(route('personnel.update', $manager), [
            'name' => 'Pirate',
            'email' => 'pirate@example.com',
            'role' => Role::FieldAgent->value,
            'status' => AccountStatus::Active->value,
        ])->assertForbidden();

        $this->assertSame(Role::CompanyAdmin, $manager->fresh()->role);
    }

    public function test_a_phone_number_already_in_use_is_reported_instead_of_crashing()
    {
        $manager = User::factory()->create();
        User::factory()->fieldAgent()->create(['phone' => '+237690000001']);

        $this->actingAs($manager)->post(route('personnel.store'), [
            'name' => 'Awa',
            'phone' => '690000001',
            'role' => Role::FieldAgent->value,
            'password' => 'Motriks-2026!',
            'password_confirmation' => 'Motriks-2026!',
        ])->assertSessionHasErrors('phone');
    }

    public function test_an_affectation_can_not_be_moved_to_the_site_of_another_company()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $affectation = $manager->company->affectations()->create([
            'site_id' => $this->site($manager)->id,
            'user_id' => $agent->id,
            'starts_on' => now()->toDateString(),
            'status' => AffectationStatus::Active,
            'assigned_by' => $manager->id,
        ]);
        $foreignSite = $this->site(User::factory()->create(), 'Concurrent');

        $this->actingAs($manager)->put(route('affectations.update', $affectation), [
            'site_id' => $foreignSite->id,
            'user_id' => $agent->id,
            'starts_on' => now()->toDateString(),
            'status' => AffectationStatus::Active->value,
        ])->assertSessionHasErrors('site_id');
    }

    public function test_an_event_can_not_use_the_sites_or_hostesses_of_another_company()
    {
        $manager = User::factory()->create();
        $event = $this->event($manager);
        $other = User::factory()->create();
        $foreignAgent = User::factory()->fieldAgent()->create(['company_id' => $other->company_id]);

        $this->actingAs($manager)
            ->post(route('events.sites.store', $event), ['site_id' => $this->site($other)->id])
            ->assertSessionHasErrors('site_id');

        $this->actingAs($manager)
            ->post(route('events.hostesses.store', $event), ['mode' => 'existing', 'user_id' => $foreignAgent->id])
            ->assertSessionHasErrors('user_id');
    }

    public function test_a_running_event_can_be_closed_and_its_recruits_are_suspended()
    {
        $manager = User::factory()->create();
        $event = $this->event($manager, EventStatus::Active);
        $recruit = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $event->hostesses()->create(['user_id' => $recruit->id, 'recruited_for_event' => true]);

        $this->actingAs($manager)
            ->post(route('events.activate', $event), ['action' => 'complete'])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertSame(EventStatus::Completed, $event->fresh()->status);
        $this->assertSame(AccountStatus::Suspended, $recruit->fresh()->status);
    }

    public function test_the_stock_of_a_site_product_can_be_updated()
    {
        $manager = User::factory()->create();
        $site = $this->site($manager);
        $product = $manager->company->products()->create(['name' => 'Savon', 'unit' => 'pièce']);
        $line = SiteProduct::create([
            'company_id' => $manager->company_id,
            'site_id' => $site->id,
            'product_id' => $product->id,
            'current_stock' => 10,
        ]);

        $this->actingAs($manager)->put(route('sites.inventory.update', [$site, $line]), [
            'current_stock' => 25,
            'alert_threshold' => 10,
            'critical_threshold' => 5,
        ])->assertSessionHasNoErrors();

        $this->assertSame(25, $line->fresh()->current_stock);
    }

    public function test_affectations_stay_listed_after_their_site_is_deleted()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);
        $site = $this->site($manager);
        $affectation = $manager->company->affectations()->create([
            'site_id' => $site->id,
            'user_id' => $agent->id,
            'starts_on' => now()->toDateString(),
            'status' => AffectationStatus::Active,
            'assigned_by' => $manager->id,
        ]);

        $this->actingAs($manager)->delete(route('sites.destroy', $site));

        $this->assertSame(AffectationStatus::Completed, $affectation->fresh()->status);
        $this->actingAs($manager)->get(route('affectations.index'))->assertOk();
    }

    public function test_the_manager_of_a_pending_company_can_log_back_in_to_finish_onboarding()
    {
        $user = User::factory()->for(Company::factory()->state(['status' => AccountStatus::Pending]))->create();

        $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'password',
        ])->assertSessionHasNoErrors();

        $this->assertAuthenticatedAs($user);
        $this->get(route('dashboard'))->assertRedirect(route('onboarding.show'));
    }

    public function test_a_rejected_company_goes_back_to_review_when_it_resubmits_its_documents()
    {
        Storage::fake('local');
        $user = User::factory()->for(Company::factory()->state(['status' => AccountStatus::Rejected]))->create();

        $this->actingAs($user)->post(route('onboarding.store'), [
            'sector' => 'Autre',
            'city' => 'Douala',
            'id_card_front' => UploadedFile::fake()->image('recto.jpg'),
            'id_card_back' => UploadedFile::fake()->image('verso.jpg'),
            'registration_doc' => UploadedFile::fake()->create('rccm.pdf', 100, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $this->assertSame(AccountStatus::Pending, $user->company->fresh()->status);
    }

    public function test_only_the_manager_can_submit_the_company_documents()
    {
        $manager = User::factory()->create();
        $agent = User::factory()->fieldAgent()->create(['company_id' => $manager->company_id]);

        $this->actingAs($agent)->post(route('onboarding.store'), [
            'sector' => 'Autre',
            'city' => 'Douala',
        ])->assertForbidden();
    }
}
