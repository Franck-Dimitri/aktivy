<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Fortify\Features;
use Tests\TestCase;

class VerificationNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::emailVerification());
    }

    public function test_sends_verification_notification(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->post(route('verification.send'))
            ->assertRedirect(route('home'));

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_does_not_send_verification_notification_if_email_is_verified(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('verification.send'))
            ->assertRedirect(route('dashboard', absolute: false));

        Notification::assertNothingSent();
    }

    public function test_verification_email_uses_the_branded_template(): void
    {
        $user = User::factory()->unverified()->create(['name' => 'Awa Diop']);

        $mail = (new VerifyEmail)->toMail($user);
        $html = (string) $mail->render();

        $this->assertSame('emails.verify-email', $mail->view);
        $this->assertStringContainsString('Confirmez votre adresse email', $mail->subject);
        $this->assertStringContainsString('Bonjour Awa Diop', $html);
        $this->assertStringContainsString(e($user->company->name), $html);
        $this->assertStringContainsString(e($mail->viewData['url']), $html);
        $this->assertStringContainsString('/email/verify/'.$user->id.'/', $mail->viewData['url']);
    }
}
