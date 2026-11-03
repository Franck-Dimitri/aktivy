<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Centre d'aide : guides courts selon le rôle, et contact du support.
 */
class HelpController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('help/index');
    }
}
