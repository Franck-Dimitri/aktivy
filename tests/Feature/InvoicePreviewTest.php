<?php

namespace Tests\Feature;

use App\Enums\Plan;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Support\Billing\InvoiceDocument;
use App\Support\Pdf\FrenchNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Facture PDF : aperçu dans l'application (inline) et téléchargement (attachment), même document,
 * réservé au gérant de l'entreprise facturée (et au super admin).
 */
class InvoicePreviewTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private SubscriptionPayment $payment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->manager = User::factory()->create();
        $this->actingAs(User::factory()->superAdmin()->create())->post(route('admin.subscriptions.payments.store', $this->manager->company), [
            'amount' => 62500,
            'method' => 'orange_money',
            'reference' => 'OM-48213977',
            'paid_at' => today()->toDateString(),
            'plan' => Plan::Business->value,
            'extra_packs' => 0,
            'period_end' => today()->addMonth()->toDateString(),
        ]);
        $this->payment = SubscriptionPayment::firstOrFail();
    }

    public function test_the_preview_shows_the_pdf_inline_and_the_download_is_an_attachment()
    {
        $preview = $this->actingAs($this->manager)->get(route('company.invoices.preview', $this->payment))->assertOk();
        $this->assertSame('application/pdf', $preview->headers->get('Content-Type'));
        $this->assertStringStartsWith('inline;', $preview->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF', $preview->getContent());

        $download = $this->actingAs($this->manager)->get(route('company.invoices.download', $this->payment))->assertOk();
        $this->assertStringStartsWith('attachment;', $download->headers->get('Content-Disposition'));
        $this->assertStringContainsString(InvoiceDocument::filename($this->payment), $download->headers->get('Content-Disposition'));

        // Même PDF, servi depuis le cache
        $this->assertSame($preview->getContent(), $download->getContent());
    }

    public function test_another_company_does_not_see_the_invoice()
    {
        $other = User::factory()->create();

        $this->actingAs($other)->get(route('company.invoices.preview', $this->payment))->assertNotFound();
        $this->actingAs($other)->get(route('company.invoices.download', $this->payment))->assertNotFound();
    }

    public function test_only_the_manager_of_the_company_may_open_it()
    {
        $accountant = User::factory()->accountant()->create(['company_id' => $this->manager->company_id]);

        $this->assertTrue(Gate::forUser($this->manager)->allows('view', $this->payment));
        $this->assertFalse(Gate::forUser($accountant)->allows('view', $this->payment));
        $this->actingAs($accountant)->get(route('company.invoices.preview', $this->payment))->assertForbidden();
    }

    public function test_guests_are_sent_to_the_login_page()
    {
        auth()->logout();

        $this->get(route('company.invoices.preview', $this->payment))->assertRedirect(route('login'));
    }

    public function test_the_invoice_shows_the_motriks_logo_and_the_logo_of_the_company()
    {
        Storage::fake('public');
        // Un vrai JPEG (lisible sans l'extension GD) : celui de Motriks fait l'affaire
        Storage::disk('public')->put('logos/client.jpg', (string) file_get_contents(resource_path('images/motriks-logo-pdf.jpg')));
        $this->manager->company->update(['logo_path' => 'logos/client.jpg']);

        $data = InvoiceDocument::data($this->payment->fresh());

        $this->assertStringStartsWith('data:image/jpeg;base64,', $data['logo']);
        $this->assertStringStartsWith('data:image/jpeg;base64,', $data['client']['logo']);
        $this->assertStringStartsWith('%PDF', InvoiceDocument::pdf($this->payment->fresh()));
    }

    public function test_the_invoice_carries_the_amount_in_french_words()
    {
        $this->assertSame('Soixante-deux mille cinq cents francs CFA', InvoiceDocument::data($this->payment)['totals']['words']);
        $this->assertSame('quatre-vingts', FrenchNumber::words(80));
        $this->assertSame('quatre-vingt-un', FrenchNumber::words(81));
        $this->assertSame('deux cents', FrenchNumber::words(200));
        $this->assertSame('deux cent un', FrenchNumber::words(201));
        $this->assertSame('vingt et un mille', FrenchNumber::words(21000));
        $this->assertSame('mille', FrenchNumber::words(1000));
        $this->assertSame('un million deux cent mille', FrenchNumber::words(1200000));
    }
}
