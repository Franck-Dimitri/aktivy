<?php

namespace App\Support;

class PhoneNumber
{
    /**
     * Normalize a phone number to the E.164 format (e.g. +237676383986).
     *
     * Numbers typed without an international prefix are given the
     * platform's default country code.
     */
    public static function normalize(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $value = trim($value);
        $international = str_starts_with($value, '+') || str_starts_with($value, '00');
        $digits = preg_replace('/\D/', '', $value);

        if ($international) {
            $digits = str_starts_with($value, '00') ? substr($digits, 2) : $digits;
        } else {
            $digits = config('aktivy.phone_country_code').$digits;
        }

        return strlen($digits) >= 8 && strlen($digits) <= 15 ? '+'.$digits : null;
    }

    /**
     * Determine if the given login identifier looks like a phone number.
     */
    public static function looksLikePhone(string $value): bool
    {
        return ! str_contains($value, '@') && preg_match('/^[\d\s().+-]+$/', $value) === 1;
    }
}
