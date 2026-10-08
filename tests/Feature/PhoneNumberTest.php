<?php

namespace Tests\Feature;

use App\Support\PhoneNumber;
use Tests\TestCase;

class PhoneNumberTest extends TestCase
{
    public function test_numbers_are_normalized_to_e164()
    {
        $this->assertSame('+237676383986', PhoneNumber::normalize('676 38 39 86'));
        $this->assertSame('+237676383986', PhoneNumber::normalize('+237 676-38-39-86'));
        $this->assertSame('+2250701020304', PhoneNumber::normalize('00225 07 01 02 03 04'));
    }

    public function test_the_default_country_code_is_configurable()
    {
        config(['aktivy.phone_country_code' => '221']);

        $this->assertSame('+221771234567', PhoneNumber::normalize('77 123 45 67'));
    }

    public function test_invalid_numbers_are_rejected()
    {
        $this->assertNull(PhoneNumber::normalize(null));
        $this->assertNull(PhoneNumber::normalize('  '));
        $this->assertNull(PhoneNumber::normalize('+12'));
    }

    public function test_email_addresses_are_not_mistaken_for_phone_numbers()
    {
        $this->assertTrue(PhoneNumber::looksLikePhone('676 38 39 86'));
        $this->assertFalse(PhoneNumber::looksLikePhone('awa@example.com'));
        $this->assertFalse(PhoneNumber::looksLikePhone('awa'));
    }
}
