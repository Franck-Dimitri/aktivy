<?php

namespace App\Listeners;

use App\Http\Controllers\Admin\ImpersonationController;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Request;

class RecordSuccessfulLogin
{
    /**
     * Remember when and from where the user last logged in.
     */
    public function handle(Login $event): void
    {
        if (! $event->user instanceof User) {
            return;
        }

        // Basculement « en tant que » (entrée ou sortie) : ni dernière connexion, ni journal de connexion
        if (app()->bound(ImpersonationController::SWITCHING)) {
            return;
        }

        $event->user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => Request::ip(),
        ])->saveQuietly();

        AuditLog::record('auth.login', $event->user, actor: $event->user);
    }
}
