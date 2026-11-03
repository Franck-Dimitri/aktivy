<?php

namespace App\Support;

use Inertia\Inertia;

/**
 * Message affiché en toast sur la page suivante (cf. resources/js/hooks/use-flash-toast.ts).
 *
 * Les contrôleurs peuvent aussi simplement faire `->with('success', '…')` ou `->with('error', '…')` :
 * HandleInertiaRequests convertit ces messages de session en toast.
 */
class Toast
{
    public static function success(string $message): void
    {
        self::flash('success', $message);
    }

    public static function error(string $message): void
    {
        self::flash('error', $message);
    }

    public static function info(string $message): void
    {
        self::flash('info', $message);
    }

    public static function warning(string $message): void
    {
        self::flash('warning', $message);
    }

    private static function flash(string $type, string $message): void
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);
    }
}
