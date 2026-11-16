<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\Excel\Workbook;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * « Mes données » : chaque utilisateur (hôtesse comprise) télécharge ce que Motriks garde sur lui, dans un
 * classeur Excel lisible (droit d'accès aux données personnelles). Seulement ses propres données :
 * compte, affectations, pointages (avec positions), rapports, documents déposés (liste), demandes, journal
 * de ses connexions et actions. Les fichiers eux-mêmes (pièces d'identité, photos) restent consultables
 * dans l'application. Le classeur est préparé à la demande et effacé dès qu'il est envoyé.
 */
class PersonalDataExportController extends Controller
{
    public function __invoke(Request $request): BinaryFileResponse
    {
        $user = $request->user();
        $path = storage_path('app/private/'.Str::uuid().'.xlsx');
        $book = new Workbook($path);

        $this->account($book, $user);
        $this->affectations($book, $user);
        $this->visits($book, $user);
        $this->reports($book, $user);
        $this->documents($book, $user);
        $this->tickets($book, $user);
        $this->journal($book, $user);

        $book->close();

        AuditLog::record('account.personal_data_exported', $user, actor: $user);

        return response()
            ->download($path, 'mes-donnees-motriks-'.now()->format('Y-m-d').'.xlsx')
            ->deleteFileAfterSend();
    }

    private function account(Workbook $book, User $user): void
    {
        $rows = [
            ['Nom', $user->name],
            ['E-mail', $user->email],
            ['Téléphone', $user->phone],
            ['Rôle', $user->role->label()],
            ['Entreprise', $user->company?->name],
            ['Compte créé le', $user->created_at?->format('d/m/Y H:i')],
            ['Dernière connexion', $user->last_login_at?->format('d/m/Y H:i')],
            ['Adresse e-mail confirmée', $user->email_verified_at ? 'oui' : 'non'],
            ['Double authentification', $user->two_factor_confirmed_at ? 'activée' : 'non activée'],
            ['Appareils recevant les notifications', (string) $user->pushSubscriptions()->count()],
            ['Clés d’accès (passkeys)', (string) DB::table('passkeys')->where('user_id', $user->id)->count()],
        ];

        $book->sheet('Mon compte', ['Information' => [Workbook::TEXT, 34], 'Valeur' => [Workbook::TEXT, 40]], $rows, [
            ['Données personnelles gardées par Motriks · '.now()->format('d/m/Y H:i')],
        ]);
    }

    private function affectations(Workbook $book, User $user): void
    {
        $rows = DB::table('affectations as a')
            ->join('sites as s', 's.id', '=', 'a.site_id')
            ->where('a.user_id', $user->id)
            ->orderByDesc('a.starts_on')
            ->get(['s.name', 's.city', 'a.starts_on', 'a.ends_on', 'a.slot_start', 'a.slot_end', 'a.status'])
            ->map(fn ($a) => [$a->name, $a->city, $a->starts_on, $a->ends_on, trim(($a->slot_start ?? '').' – '.($a->slot_end ?? ''), ' –'), $a->status]);

        $book->sheet('Affectations', [
            'Point de vente' => [Workbook::TEXT, 26], 'Ville' => [Workbook::TEXT, 14],
            'Début' => [Workbook::DATE, 12], 'Fin' => [Workbook::DATE, 12],
            'Horaires' => [Workbook::TEXT, 14], 'Statut' => [Workbook::TEXT, 12],
        ], $rows);
    }

    private function visits(Workbook $book, User $user): void
    {
        $rows = DB::table('visits as v')
            ->join('sites as s', 's.id', '=', 'v.site_id')
            ->where('v.user_id', $user->id)
            ->orderByDesc('v.checked_in_at')
            ->cursor()
            ->map(fn ($v) => [
                $v->checked_in_at, $v->checked_out_at, $v->name, $v->duration_minutes, $v->status,
                $v->checkin_latitude, $v->checkin_longitude, $v->checkout_latitude, $v->checkout_longitude,
                $v->checkin_synced_at ? 'oui' : 'non',
            ]);

        $book->sheet('Pointages', [
            'Arrivée' => [Workbook::DATETIME, 16], 'Départ' => [Workbook::DATETIME, 16],
            'Point de vente' => [Workbook::TEXT, 24], 'Durée (min)' => [Workbook::INT, 11], 'Statut' => [Workbook::TEXT, 12],
            'Latitude arrivée' => [Workbook::TEXT, 14], 'Longitude arrivée' => [Workbook::TEXT, 14],
            'Latitude départ' => [Workbook::TEXT, 14], 'Longitude départ' => [Workbook::TEXT, 14],
            'Envoyé hors ligne' => [Workbook::TEXT, 12],
        ], $rows);
    }

    private function reports(Workbook $book, User $user): void
    {
        $rows = DB::table('daily_reports as r')
            ->join('sites as s', 's.id', '=', 'r.site_id')
            ->leftJoin('daily_report_lines as l', 'l.daily_report_id', '=', 'r.id')
            ->where('r.user_id', $user->id)
            ->groupBy('r.id', 'r.report_date', 's.name', 'r.status', 'r.submitted_at', 'r.notes', 'r.incident_notes')
            ->orderByDesc('r.report_date')
            ->select('r.report_date', 's.name', 'r.status', 'r.submitted_at', 'r.notes', 'r.incident_notes',
                DB::raw('COALESCE(SUM(l.units_sold), 0) as units'), DB::raw('COALESCE(SUM(l.revenue), 0) as revenue'))
            ->cursor()
            ->map(fn ($r) => [$r->report_date, $r->name, $r->status, $r->submitted_at, (int) $r->units, (float) $r->revenue, $r->notes, $r->incident_notes]);

        $book->sheet('Rapports', [
            'Date' => [Workbook::DATE, 12], 'Point de vente' => [Workbook::TEXT, 24], 'Statut' => [Workbook::TEXT, 11],
            'Envoyé le' => [Workbook::DATETIME, 16], 'Unités vendues' => [Workbook::INT, 12],
            'Chiffre d’affaires (FCFA)' => [Workbook::MONEY, 16], 'Remarque' => [Workbook::TEXT, 30], 'Incident' => [Workbook::TEXT, 30],
        ], $rows);
    }

    private function documents(Workbook $book, User $user): void
    {
        $rows = $user->documents()->orderByDesc('created_at')->get()
            ->map(fn ($d) => [$d->title, $d->type, $d->original_name, $d->created_at?->format('d/m/Y')]);

        $book->sheet('Documents', [
            'Titre' => [Workbook::TEXT, 26], 'Type' => [Workbook::TEXT, 16],
            'Fichier d’origine' => [Workbook::TEXT, 28], 'Déposé le' => [Workbook::TEXT, 12],
        ], $rows, [['Liste des documents déposés à votre nom (les fichiers restent consultables dans Motriks).']]);
    }

    private function tickets(Workbook $book, User $user): void
    {
        $rows = DB::table('tickets')->where('user_id', $user->id)->orderByDesc('created_at')
            ->get(['created_at', 'subject', 'body', 'status', 'response'])
            ->map(fn ($t) => [$t->created_at, $t->subject, $t->body, $t->status, $t->response]);

        $book->sheet('Demandes', [
            'Date' => [Workbook::DATETIME, 16], 'Sujet' => [Workbook::TEXT, 26], 'Message' => [Workbook::TEXT, 40],
            'Statut' => [Workbook::TEXT, 12], 'Réponse' => [Workbook::TEXT, 40],
        ], $rows);
    }

    private function journal(Workbook $book, User $user): void
    {
        $rows = DB::table('audit_logs')->where('user_id', $user->id)->orderByDesc('created_at')->limit(5000)
            ->get(['created_at', 'action', 'ip_address', 'user_agent'])
            ->map(fn ($l) => [$l->created_at, $l->action, $l->ip_address, $l->user_agent]);

        $book->sheet('Journal', [
            'Date' => [Workbook::DATETIME, 16], 'Action' => [Workbook::TEXT, 30],
            'Adresse IP' => [Workbook::TEXT, 16], 'Appareil' => [Workbook::TEXT, 40],
        ], $rows, [['Vos connexions et actions enregistrées (12 mois au plus).']]);
    }
}
