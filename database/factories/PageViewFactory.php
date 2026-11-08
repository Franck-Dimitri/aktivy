<?php

namespace Database\Factories;

use App\Models\PageView;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PageView>
 */
class PageViewFactory extends Factory
{
    public function definition(): array
    {
        return [
            'path' => fake()->randomElement(['/', '/contact', '/login', '/register', '/conditions']),
            'referrer_host' => fake()->optional(0.4)->randomElement(['google.com', 'facebook.com', 'l.instagram.com', 'linkedin.com']),
            'utm_source' => null,
            'utm_medium' => null,
            'utm_campaign' => null,
            'device' => fake()->randomElement(['mobile', 'mobile', 'mobile', 'desktop', 'tablet']),
            'browser' => fake()->randomElement(['Chrome', 'Safari', 'Opera Mini', 'Firefox']),
            'os' => fake()->randomElement(['Android', 'iOS', 'Windows', 'macOS']),
            'language' => 'fr',
            'country' => null,
            'visitor' => substr(fake()->sha256(), 0, 16),
            'viewed_at' => now()->subMinutes(fake()->numberBetween(0, 60 * 24 * 6)),
        ];
    }
}
