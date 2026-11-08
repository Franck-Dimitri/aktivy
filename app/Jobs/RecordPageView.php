<?php

namespace App\Jobs;

use App\Models\PageView;
use App\Support\Traffic\UserAgent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Carbon;

/**
 * Enregistre une vue de page publique, hors de la requête (voir TrackPageView).
 * Reçoit l'empreinte anonyme déjà calculée : l'adresse IP ne transite jamais par la file d'attente.
 */
class RecordPageView implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    /** Une statistique perdue ne vaut pas de nouvelles tentatives. */
    public int $tries = 1;

    /**
     * @param  array{path: string, referrer_host: ?string, utm_source: ?string, utm_medium: ?string, utm_campaign: ?string, user_agent: ?string, language: ?string, country: ?string, visitor: string}  $view
     */
    public function __construct(public array $view, public string $viewedAt) {}

    public function handle(): void
    {
        $agent = UserAgent::parse($this->view['user_agent']);

        if ($agent['bot']) {
            return;
        }

        PageView::create([
            'path' => $this->view['path'],
            'referrer_host' => $this->view['referrer_host'],
            'utm_source' => $this->view['utm_source'],
            'utm_medium' => $this->view['utm_medium'],
            'utm_campaign' => $this->view['utm_campaign'],
            'device' => $agent['device'],
            'browser' => $agent['browser'],
            'os' => $agent['os'],
            'language' => $this->view['language'],
            'country' => $this->view['country'],
            'visitor' => $this->view['visitor'],
            'viewed_at' => Carbon::parse($this->viewedAt),
        ]);
    }
}
