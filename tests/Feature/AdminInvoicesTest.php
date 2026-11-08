<?php

namespace Tests\Feature;

use App\Enums\Plan;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Factures côté administration : liste de toutes les factures, filtres, aperçu du PDF.
 */
class AdminInvoicesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->admin = User::factory()->superAdmin()->create();
    }

    private function pay(User $manager, string $method = 'orange_money', string $reference = 'OM-1'): SubscriptionPayment
    {
        $this->actingAs($this->admin)->post(route('admin.subscriptions.payments.store', $manager->company), [
            'amount' => 36000,
            'method' => $method,
            'reference' => $reference,
            'paid_at' => today()->toDateString(),
            'plan' => Plan::Business->value,
            'extra_packs' => 0,
            'period_end' => today()->addMonth()->toDateString(),
        ])->assertSessionHasNoErrors();

        return SubscriptionPayment::latest('id')->firstOrFail();
    }

    public function test_the_admin_sees_every_invoice_with_totals()
    {
        $this->pay(User::factory()->create());
        $this->pay(User::factory()->create(), 'mtn_momo', 'MTN-2');

        $this->actingAs($this->admin)->get(route('admin.invoices.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/invoices/index')
                ->has('invoices.data', 2)
                ->where('summary.count', 2)
                ->where('summary.total', 72000)
                ->where('summary.companies', 2));
    }

    public function test_invoices_can_be_searched_and_filtered()
    {
        $first = User::factory()->create();
        $first->company->update(['name' => 'Brasserie du Centre']);
        $this->pay($first);
        $this->pay(User::factory()->create(), 'mtn_momo', 'MTN-2');

        $this->actingAs($this->admin)->get(route('admin.invoices.index', ['q' => 'Brasserie']))
            ->assertInertia(fn ($page) => $page->has('invoices.data', 1)->where('invoices.data.0.company', 'Brasserie du Centre'));

        $this->actingAs($this->admin)->get(route('admin.invoices.index', ['moyen' => 'mtn_momo']))
            ->assertInertia(fn ($page) => $page->has('invoices.data', 1)->where('invoices.data.0.reference', 'MTN-2'));

        $this->actingAs($this->admin)->get(route('admin.invoices.index', ['annee' => today()->year - 1]))
            ->assertInertia(fn ($page) => $page->has('invoices.data', 0));
    }

    public function test_the_preview_is_the_pdf_inline_and_reserved_to_the_admin()
    {
        $manager = User::factory()->create();
        $payment = $this->pay($manager);

        $preview = $this->actingAs($this->admin)->get(route('admin.invoices.preview', $payment))->assertOk();
        $this->assertStringStartsWith('inline;', $preview->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF', $preview->getContent());

        // Le gérant passe par son propre espace, pas par l'administration
        $this->actingAs($manager)->get(route('admin.invoices.preview', $payment))->assertForbidden();
        $this->actingAs($manager)->get(route('admin.invoices.index'))->assertForbidden();
    }
}
