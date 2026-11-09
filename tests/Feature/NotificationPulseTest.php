<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\LiveNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationPulseTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_pulse_changes_when_a_notification_arrives_or_is_read()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->getJson(route('notifications.pulse'))
            ->assertOk()
            ->assertExactJson(['latest' => null, 'unread' => 0]);

        $user->notifyNow(new LiveNotification('test', 'stock', 'Stock bas', 'Il reste 2 cartons.', 'dashboard'));
        $id = $user->notifications()->value('id');

        $this->getJson(route('notifications.pulse'))->assertExactJson(['latest' => $id, 'unread' => 1]);

        $this->post(route('notifications.read-all'));

        $this->getJson(route('notifications.pulse'))->assertExactJson(['latest' => $id, 'unread' => 0]);
    }

    public function test_the_pulse_only_reports_the_notifications_of_the_user()
    {
        $user = User::factory()->create();
        User::factory()->create()->notifyNow(new LiveNotification('test', 'stock', 'Stock bas', 'Il reste 2 cartons.', 'dashboard'));

        $this->actingAs($user)->getJson(route('notifications.pulse'))->assertExactJson(['latest' => null, 'unread' => 0]);
    }

    public function test_the_pulse_requires_a_session()
    {
        $this->getJson(route('notifications.pulse'))->assertUnauthorized();
    }
}
