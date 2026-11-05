<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Centre d'aide : coordonnées du support et demande envoyée depuis l'application.
 */
class HelpCenterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['motriks.support.email' => 'support@motriks.com', 'motriks.support.whatsapp' => '+237 690 00 00 00']);
    }

    public function test_the_help_center_gives_the_support_channels()
    {
        $this->actingAs(User::factory()->create())->get(route('help'))
            ->assertInertia(fn ($page) => $page
                ->component('help/index')
                ->where('support.email', 'support@motriks.com')
                ->where('support.whatsapp', '237690000000')
                ->has('support.topics', 4));
    }

    public function test_without_a_number_there_is_no_whatsapp_button()
    {
        config(['motriks.support.whatsapp' => null]);

        $this->actingAs(User::factory()->create())->get(route('help'))
            ->assertInertia(fn ($page) => $page->where('support.whatsapp', null));
    }

    public function test_a_support_request_is_emailed_with_the_user_and_company_attached()
    {
        $sent = [];
        Event::listen(MessageSending::class, function (MessageSending $e) use (&$sent) {
            $sent[] = $e->message;
        });
        $user = User::factory()->create(['name' => 'Rosnel', 'email' => 'rosnel@mundo.cm']);

        $this->actingAs($user)->post(route('help.support'), [
            'topic' => 'bug',
            'message' => 'Le bouton Réassort ne répond pas sur la fiche du site.',
            'page' => '/sites/3',
        ])->assertSessionHasNoErrors()->assertSessionHas('success');

        $this->assertCount(1, $sent);
        $mail = $sent[0];
        $this->assertSame('support@motriks.com', $mail->getTo()[0]->getAddress());
        $this->assertSame('rosnel@mundo.cm', $mail->getReplyTo()[0]->getAddress());
        $this->assertStringContainsString('Quelque chose ne fonctionne pas', $mail->getSubject());
        $html = $mail->getHtmlBody();
        $this->assertStringContainsString('Le bouton Réassort ne répond pas', $html);
        $this->assertStringContainsString(e($user->company->name), $html);
        $this->assertStringContainsString('/sites/3', $html);
    }

    public function test_a_support_request_needs_a_real_message_and_a_known_topic()
    {
        $this->actingAs(User::factory()->create())->post(route('help.support'), ['topic' => 'autre', 'message' => 'Court'])
            ->assertSessionHasErrors(['topic', 'message']);
    }
}
