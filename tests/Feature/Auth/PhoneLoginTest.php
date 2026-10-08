<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PhoneLoginTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string}>
     */
    public static function phoneFormats(): array
    {
        return [
            'local' => ['676383986'],
            'local with spaces' => ['676 38 39 86'],
            'international' => ['+237 676383986'],
            'international with 00' => ['00237676383986'],
        ];
    }

    #[DataProvider('phoneFormats')]
    public function test_field_agents_can_log_in_with_their_phone_number(string $typed)
    {
        $user = User::factory()->fieldAgent()->create(['phone' => '676 38 39 86']);

        $this->assertSame('+237676383986', $user->phone);

        $response = $this->post(route('login.store'), [
            'login' => $typed,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('terrain.home', absolute: false));
    }

    public function test_users_can_not_log_in_with_an_unknown_phone_number()
    {
        User::factory()->fieldAgent()->create(['phone' => '676383986']);

        $this->post(route('login.store'), [
            'login' => '699999999',
            'password' => 'password',
        ])->assertSessionHasErrors('login');

        $this->assertGuest();
    }

    public function test_an_unusable_phone_number_never_matches_users_without_a_phone()
    {
        User::factory()->create(['phone' => null]);

        $this->post(route('login.store'), [
            'login' => '12',
            'password' => 'password',
        ])->assertSessionHasErrors('login');

        $this->assertGuest();
    }

    public function test_field_agents_without_an_email_can_use_the_app_without_verification()
    {
        $user = User::factory()->fieldAgent()->create();

        $this->assertNull($user->email);
        $this->actingAs($user)->get(route('terrain.home'))->assertOk();
    }

    public function test_phone_numbers_are_unique()
    {
        User::factory()->fieldAgent()->create(['phone' => '676383986']);

        $this->expectException(UniqueConstraintViolationException::class);

        User::factory()->fieldAgent()->create(['phone' => '+237 676383986']);
    }
}
