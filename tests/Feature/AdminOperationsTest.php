<?php

namespace Tests\Feature;

use App\Enums\Plan;
use App\Http\Controllers\Admin\ImpersonationController;
use App\Models\AuditLog;
use App\Models\SubscriptionPayment;
use App\Models\SupportRequest;
use App\Models\User;
use App\Notifications\LiveNotification;
use App\Notifications\PlanExpiring;
use App\Notifications\SupportReplied;
use App\Support\Billing\InvoiceDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Administration, priorité 2 : abonnements et factures, journal d'audit, boîte de support,
 * connexion « en tant que ».
 */
class AdminOperationsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->admin = User::factory()->superAdmin()->create();
        $this->manager = User::factory()->create();
    }

    /** Entreprise en essai : le forfait de la fabrique (sans fin) est remplacé par l'essai de 7 jours. */
    private function startTrial(): void
    {
        $this->manager->company->setPlan(Plan::Starter);
        $this->manager->company->startTrial();
    }

    private function pay(array $overrides = []): TestResponse
    {
        return $this->actingAs($this->admin)->post(route('admin.subscriptions.payments.store', $this->manager->company), [
            'amount' => 48000 + Plan::PACK_PRICE,
            'method' => 'orange_money',
            'reference' => 'OM-123456',
            'paid_at' => today()->toDateString(),
            'plan' => Plan::Business->value,
            'extra_packs' => 1,
            'period_end' => today()->addMonth()->toDateString(),
            ...$overrides,
        ]);
    }

    // ── Abonnements ───────────────────────────────────────────────────────

    public function test_only_the_super_admin_opens_the_operations_pages()
    {
        foreach ([route('admin.subscriptions.index'), route('admin.audit.index'), route('admin.support.index')] as $url) {
            $this->actingAs($this->manager)->get($url)->assertForbidden();
            $this->actingAs($this->admin)->get($url)->assertOk();
        }
    }

    public function test_a_payment_creates_a_numbered_invoice_and_sets_the_plan()
    {
        Notification::fake();
        $this->startTrial();

        $this->pay()->assertSessionHasNoErrors();
        $this->pay(['amount' => 14500, 'plan' => Plan::Pro->value, 'extra_packs' => 0])->assertSessionHasNoErrors();

        $payments = SubscriptionPayment::orderBy('id')->get();
        $year = now()->format('Y');
        $this->assertSame(["FAC-{$year}-0001", "FAC-{$year}-0002"], $payments->pluck('invoice_number')->all());
        $this->assertSame(Plan::Business, $payments->first()->plan);
        $this->assertSame(1, $payments->first()->extra_packs);

        $company = $this->manager->company->fresh();
        $this->assertSame(Plan::Pro, $company->currentPlan());
        $this->assertFalse($company->plan_trial, 'un forfait payé sort de l’essai');
        $this->assertSame(today()->addMonth()->toDateString(), $company->plan_ends_on->toDateString());

        Notification::assertSentTo($this->manager, LiveNotification::class, fn ($n) => $n->type === 'payment_received');
        $this->assertDatabaseHas('audit_logs', ['action' => 'subscription.payment_recorded', 'company_id' => $this->manager->company_id]);
    }

    public function test_a_payment_with_supervisor_packs_sets_them_and_lists_them_on_the_invoice()
    {
        Notification::fake();

        $this->pay(['amount' => 14500 + 2 * Plan::SUPERVISOR_PACK_PRICE, 'plan' => Plan::Pro->value, 'extra_packs' => 0, 'supervisor_packs' => 2])
            ->assertSessionHasNoErrors();

        $payment = SubscriptionPayment::firstOrFail();
        $this->assertSame(2, $payment->supervisor_packs);

        $company = $this->manager->company->fresh();
        $this->assertSame(2, $company->plan_supervisor_packs);
        $this->assertSame(4, $company->planLimits()['supervisors']);
        $this->assertContains('2 packs superviseur (+1 superviseur chacun)', InvoiceDocument::data($payment)['lines'][0]['details']);

        // Entreprise : superviseurs illimités, le pack superviseur n'est pas retenu
        $this->pay(['amount' => 88000, 'plan' => Plan::Entreprise->value, 'extra_packs' => 0, 'supervisor_packs' => 2])->assertSessionHasNoErrors();
        $this->assertSame(0, SubscriptionPayment::latest('id')->firstOrFail()->supervisor_packs);
        $this->assertSame(0, $this->manager->company->fresh()->plan_supervisor_packs);
    }

    public function test_the_invoices_page_lists_every_invoice_and_the_subscription_page_only_the_last()
    {
        $this->pay();
        $this->pay(['paid_at' => today()->toDateString()]);
        $last = SubscriptionPayment::latest('paid_at')->latest('id')->firstOrFail();

        $this->actingAs($this->manager)->get(route('company.invoices.index'))
            ->assertInertia(fn ($page) => $page->component('company/invoices')
                ->has('invoices', 2)
                ->where('summary.count', 2)
                ->where('invoices.0.invoice_number', $last->invoice_number));

        $this->actingAs($this->manager)->get(route('company.subscription'))
            ->assertInertia(fn ($page) => $page->has('payments', 1)->where('paymentsCount', 2));
    }

    public function test_a_payment_needs_a_paid_plan_and_an_end_date()
    {
        $this->pay(['period_end' => null])->assertSessionHasErrors('period_end');
        $this->pay(['plan' => Plan::Starter->value])->assertSessionHasErrors('plan');
        $this->pay(['paid_at' => today()->addDay()->toDateString()])->assertSessionHasErrors('paid_at');
        $this->assertSame(0, SubscriptionPayment::count());
    }

    public function test_the_invoice_is_a_pdf_for_the_admin_and_the_company_manager_only()
    {
        $this->pay();
        $payment = SubscriptionPayment::firstOrFail();

        $admin = $this->actingAs($this->admin)->get(route('admin.subscriptions.invoice', $payment))->assertOk();
        $this->assertStringStartsWith('%PDF', $admin->getContent());

        $own = $this->actingAs($this->manager)->get(route('company.invoices.show', $payment))->assertOk();
        $this->assertStringStartsWith('%PDF', $own->getContent());

        $this->actingAs(User::factory()->create())->get(route('company.invoices.show', $payment))->assertNotFound();

        $this->actingAs($this->manager)->get(route('company.subscription'))
            ->assertInertia(fn ($page) => $page->where('payments.0.invoice_number', $payment->invoice_number));
    }

    public function test_a_reminder_is_sent_for_the_next_deadline_only_when_there_is_one()
    {
        Notification::fake();

        // Forfait de la fabrique : sans date de fin, rien à rappeler
        $this->actingAs($this->admin)->post(route('admin.subscriptions.remind', $this->manager->company))->assertStatus(422);

        $this->startTrial();
        $this->actingAs($this->admin)->post(route('admin.subscriptions.remind', $this->manager->company))->assertSessionHasNoErrors();

        Notification::assertSentTo($this->manager, PlanExpiring::class);
    }

    // ── Journal d'audit ───────────────────────────────────────────────────

    public function test_the_audit_log_can_be_filtered_on_failed_logins()
    {
        AuditLog::record('auth.login_failed', $this->manager, new: ['login' => $this->manager->email], actor: $this->manager);
        AuditLog::record('auth.login', $this->manager, actor: $this->manager);

        $this->actingAs($this->admin)->get(route('admin.audit.index', ['group' => 'auth.login_failed']))
            ->assertInertia(fn ($page) => $page
                ->component('admin/audit/index')
                ->where('logs.data', fn ($rows) => collect($rows)->every(fn ($r) => $r['action'] === 'auth.login_failed') && count($rows) === 1)
                ->where('failed_last_24h', 1));
    }

    // ── Support ───────────────────────────────────────────────────────────

    public function test_help_and_contact_messages_are_kept_in_the_support_inbox()
    {
        Mail::fake();

        $this->actingAs($this->manager)->post(route('help.support'), [
            'topic' => 'bug',
            'message' => 'Le rapport ne s’envoie pas depuis ce matin.',
        ])->assertSessionHasNoErrors();
        auth()->logout();

        $this->post(route('contact'), [
            'name' => 'Awa Prospect',
            'email' => 'awa@example.com',
            'subject' => 'Demande de démonstration',
            'message' => 'Nous avons 12 hôtesses, pouvez-vous nous montrer l’application ?',
            'form_token' => encrypt(now()->subMinute()->timestamp),
            'website' => '',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('support_requests', ['source' => 'help', 'company_id' => $this->manager->company_id, 'status' => 'new']);
        $this->assertDatabaseHas('support_requests', ['source' => 'contact', 'email' => 'awa@example.com']);
    }

    public function test_the_admin_replies_by_email_and_can_close_the_request()
    {
        Notification::fake();
        $request = SupportRequest::create([
            'source' => 'contact', 'topic' => 'Tarifs', 'name' => 'Awa', 'email' => 'awa@example.com', 'message' => 'Combien coûte la formule Pro ?',
        ]);

        $this->actingAs($this->admin)->post(route('admin.support.reply', $request), [
            'body' => 'Bonjour Awa, la formule Pro coûte 14 500 FCFA par mois.',
            'resolve' => true,
        ])->assertSessionHasNoErrors();

        Notification::assertSentTo(new AnonymousNotifiable, SupportReplied::class, fn ($n, $channels, $notifiable) => array_key_exists('awa@example.com', (array) $notifiable->routes['mail']));
        $this->assertSame('resolved', $request->fresh()->status);
        $this->assertTrue($request->replies()->first()->emailed);
    }

    public function test_the_support_inbox_searches_and_opens_a_request_in_the_reply_window()
    {
        $tarifs = SupportRequest::create(['source' => 'contact', 'topic' => 'Tarifs', 'name' => 'Awa Mbarga', 'email' => 'awa@example.com', 'message' => 'Combien coûte Pro ?']);
        SupportRequest::create(['source' => 'help', 'topic' => 'Rapport bloqué', 'name' => 'Paul', 'company_id' => $this->manager->company_id, 'message' => 'Le rapport ne part pas.']);

        // Recherche sur le nom, l'e-mail, le sujet ou l'entreprise
        $this->actingAs($this->admin)->get(route('admin.support.index', ['q' => 'awa@']))
            ->assertInertia(fn ($page) => $page->component('admin/support/index')->has('requests.data', 1)->where('requests.data.0.topic', 'Tarifs')->where('selected', null));
        $this->actingAs($this->admin)->get(route('admin.support.index', ['q' => $this->manager->company->name]))
            ->assertInertia(fn ($page) => $page->has('requests.data', 1)->where('requests.data.0.topic', 'Rapport bloqué'));

        // Un lien direct ouvre la boîte de réception, demande ouverte dans la fenêtre de réponse
        $this->actingAs($this->admin)->get(route('admin.support.show', $tarifs))
            ->assertRedirect(route('admin.support.index', ['demande' => $tarifs->uuid]));
        $this->actingAs($this->admin)->get(route('admin.support.index', ['demande' => $tarifs->uuid]))
            ->assertInertia(fn ($page) => $page->where('selected.id', $tarifs->id)->where('selected.email', 'awa@example.com')->has('selected.replies', 0));

        $this->actingAs($this->manager)->get(route('admin.support.index'))->assertForbidden();
    }

    // ── Connexion « en tant que » ─────────────────────────────────────────

    public function test_the_admin_sees_the_manager_space_and_comes_back()
    {
        $lastLogin = $this->manager->last_login_at;

        $this->actingAs($this->admin)
            ->post(route('admin.companies.managers.impersonate', [$this->manager->company, $this->manager]))
            ->assertRedirect();

        $this->assertAuthenticatedAs($this->manager);
        $this->assertSame($this->admin->id, session(ImpersonationController::SESSION_KEY));
        $this->assertEquals($lastLogin, $this->manager->fresh()->last_login_at, 'ce n’est pas une connexion du gérant');
        $this->assertDatabaseMissing('audit_logs', ['action' => 'auth.login', 'user_id' => $this->manager->id]);

        $this->get(route('dashboard'))->assertInertia(fn ($page) => $page->where('auth.impersonator.id', $this->admin->id));

        // Les actions faites pendant la session sont marquées dans le journal
        AuditLog::record('reports.exported', $this->manager->company, new: ['format' => 'pdf']);
        $this->assertSame($this->admin->name, AuditLog::where('action', 'reports.exported')->first()->new_values['par_admin']);

        $this->post(route('impersonation.stop'))->assertRedirect(route('admin.companies.show', $this->manager->company));
        $this->assertAuthenticatedAs($this->admin);
        $this->assertNull(session(ImpersonationController::SESSION_KEY));
        $this->assertDatabaseHas('audit_logs', ['action' => 'admin.impersonation_started']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'admin.impersonation_ended']);
    }

    public function test_personal_settings_are_blocked_while_impersonating()
    {
        $this->actingAs($this->admin)->post(route('admin.companies.managers.impersonate', [$this->manager->company, $this->manager]));
        $hash = $this->manager->fresh()->password;

        $this->put(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'Nouveau-Motriks-2026!',
            'password_confirmation' => 'Nouveau-Motriks-2026!',
        ]);

        $this->assertSame($hash, $this->manager->fresh()->password);
    }

    public function test_impersonation_is_refused_when_it_does_not_make_sense()
    {
        $invited = User::factory()->mustChangePassword()->create();
        $this->actingAs($this->admin)->post(route('admin.companies.managers.impersonate', [$invited->company, $invited]))->assertStatus(422);

        $other = User::factory()->create()->company;
        $this->actingAs($this->admin)->post(route('admin.companies.managers.impersonate', [$other, $this->manager]))->assertNotFound();

        $this->actingAs($this->manager)->post(route('admin.companies.managers.impersonate', [$this->manager->company, $this->manager]))->assertForbidden();

        // Sans session « en tant que », le retour est refusé
        $this->actingAs($this->manager)->post(route('impersonation.stop'))->assertForbidden();
    }
}
