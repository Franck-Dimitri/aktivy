<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\AppNotification;
use App\Notifications\CompanyApproved;
use App\Notifications\CompanyRejected;
use App\Notifications\HostessesNotCheckedIn;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Messages\MailMessage;
use Tests\TestCase;

/**
 * Tous les e-mails passent par le gabarit Motriks (HTML + texte), en français, sans celui de Laravel.
 */
class EmailTemplatesTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: string, 1: string} HTML et texte rendus */
    private function render(MailMessage $mail): array
    {
        [$html, $text] = $mail->view;

        return [view($html, $mail->viewData)->render(), view($text, $mail->viewData)->render()];
    }

    public function test_the_missing_check_in_alert_lists_the_hostesses_in_the_motriks_template()
    {
        $manager = User::factory()->create(['name' => 'Rosnel']);
        $mail = (new HostessesNotCheckedIn(['Awa (Akwa, attendue à 08:00)', 'Brenda (Bonapriso)']))->toMail($manager);
        [$html, $text] = $this->render($mail);

        $this->assertSame(['emails.notification', 'emails.text.notification'], $mail->view);
        $this->assertSame('2 hôtesses n’ont pas pointé', $mail->subject);
        foreach ([$html, $text] as $body) {
            $this->assertStringContainsString('Bonjour Rosnel', $body);
            $this->assertStringContainsString('Awa (Akwa, attendue à 08:00)', $body);
            $this->assertStringContainsString('Brenda (Bonapriso)', $body);
            $this->assertStringContainsString(route('daily-reports.index'), $body);
        }
        $this->assertStringContainsString('Prise de service', $html);
        $this->assertStringContainsString('#039855', $html);
        $this->assertStringContainsString(e($manager->company->name), $html);
        // Plus aucune trace du gabarit par défaut de Laravel
        $this->assertStringNotContainsString('Regards', $html);
        $this->assertStringNotContainsString('If you\'re having trouble', $html);
    }

    public function test_every_app_notification_renders_its_email()
    {
        $manager = User::factory()->create();

        foreach (glob(app_path('Notifications/*.php')) as $file) {
            $class = 'App\\Notifications\\'.basename($file, '.php');
            if (! is_subclass_of($class, AppNotification::class) || (new \ReflectionClass($class))->isAbstract()) {
                continue;
            }
            $this->assertTrue(method_exists($class, 'toMail'), $class);
        }

        // Les e-mails d'inscription et de mot de passe utilisent aussi le gabarit
        $company = $manager->company;
        foreach ([
            (new CompanyApproved($company))->toMail($manager),
            (new CompanyRejected($company, 'Pièce d’identité illisible.'))->toMail($manager),
            (new ResetPassword('jeton-123'))->toMail($manager),
        ] as $mail) {
            [$html, $text] = $this->render($mail);
            $this->assertStringContainsString('Pilotez vos équipes terrain', $html);
            $this->assertStringContainsString('Pilotez vos équipes terrain', $text);
            $this->assertStringContainsString('#039855', $html);
            $this->assertStringNotContainsString('#4FC031', $html);
        }
    }

    public function test_the_reset_password_email_links_to_the_reset_form()
    {
        $user = User::factory()->create(['email' => 'awa@example.cm']);
        $mail = (new ResetPassword('jeton-123'))->toMail($user);
        [$html] = $this->render($mail);

        $this->assertSame('Réinitialisez votre mot de passe · '.config('app.name'), $mail->subject);
        $this->assertStringContainsString(e(route('password.reset', ['token' => 'jeton-123', 'email' => 'awa@example.cm'])), $html);
    }
}
