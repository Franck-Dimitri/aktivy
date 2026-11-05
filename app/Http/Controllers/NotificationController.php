<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Notifications de l'utilisateur, celles de la cloche.
 */
class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('notifications/index', [
            'notifications' => $this->latest($request, 50),
        ]);
    }

    /**
     * Aperçu affiché sous la cloche : les plus récentes et le nombre de non lues.
     * Chargé à l'ouverture du panneau, pour ne rien ajouter aux autres pages.
     */
    public function recent(Request $request): JsonResponse
    {
        return response()->json([
            'unread' => $request->user()->unreadNotifications()->count(),
            'notifications' => $this->latest($request, 6),
        ]);
    }

    /**
     * Ouvre ce dont parle la notification et la marque comme lue.
     */
    public function open(Request $request, string $notification): RedirectResponse
    {
        $notification = $request->user()->notifications()->findOrFail($notification);
        $notification->markAsRead();

        return redirect($notification->data['url'] ?? route('notifications.index'));
    }

    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function latest(Request $request, int $limit)
    {
        return $request->user()->notifications()
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (DatabaseNotification $n) => [
                'id' => $n->id,
                'kind' => $n->data['kind'] ?? null,
                'title' => $n->data['title'] ?? '',
                'body' => $n->data['body'] ?? '',
                'read' => $n->read_at !== null,
                'date' => $n->created_at->diffForHumans(),
                // Pour regrouper par jour et afficher l'heure exacte
                'at' => $n->created_at->toIso8601String(),
            ]);
    }
}
