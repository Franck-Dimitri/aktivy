<?php

namespace App\Exports;

use App\Enums\AffectationStatus;
use App\Enums\EventHostessStatus;
use App\Enums\EventPackType;
use App\Enums\EventStatus;
use App\Enums\Role;
use App\Enums\SiteStatus;
use App\Enums\SiteType;
use App\Enums\VisitStatus;
use App\Models\Company;
use App\Support\Excel\Workbook;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

/**
 * Export de toutes les données d'une entreprise : un classeur Excel (un onglet par type de données)
 * et les fichiers déposés (logo, documents d'inscription, photos de sites, images produits), dans un ZIP.
 * Les secrets (mots de passe, double authentification, jetons) et les adresses IP en sont exclus.
 * Les éléments supprimés sont inclus, avec leur date de suppression.
 */
class CompanyDataExport
{
    /** Libellés des statuts qui n'ont pas d'énumération dédiée. */
    private const STATUS_LABELS = [
        'active' => 'Actif', 'pending' => 'En attente', 'rejected' => 'Refusé', 'suspended' => 'Suspendu',
        'draft' => 'Brouillon', 'submitted' => 'Envoyé',
        'open' => 'Ouvert', 'in_review' => 'En cours', 'closed' => 'Fermé',
        'normal' => 'Normale', 'urgent' => 'Urgente',
    ];

    public function __construct(private Company $company) {}

    /**
     * Écrit le ZIP et renvoie la liste des fichiers joints introuvables sur le disque.
     */
    public function write(string $zipPath): array
    {
        $folder = 'motriks-'.Str::slug($this->company->name).'-'.now()->format('Y-m-d');
        $xlsx = tempnam(sys_get_temp_dir(), 'motriks-donnees-');

        $this->writeWorkbook($xlsx);

        $zip = new ZipArchive;
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFile($xlsx, "$folder/donnees.xlsx");

        $missing = [];

        foreach ($this->files() as [$disk, $path, $target]) {
            if ($path && Storage::disk($disk)->exists($path)) {
                $zip->addFile(Storage::disk($disk)->path($path), "$folder/fichiers/$target");
            } elseif ($path) {
                $missing[] = $target;
            }
        }

        $zip->addFromString("$folder/LISEZMOI.txt", $this->readme($missing));
        $zip->close();
        @unlink($xlsx);

        return $missing;
    }

    private function writeWorkbook(string $path): void
    {
        $id = $this->company->id;
        $c = $this->company;
        $book = new Workbook($path);
        $T = Workbook::TEXT;
        $I = Workbook::INT;
        $M = Workbook::MONEY;
        $D = Workbook::DATE;
        $DT = Workbook::DATETIME;

        $book->sheet('Entreprise', ['Champ' => [$T, 28], 'Valeur' => [$T, 50]], [
            ['Identifiant', $c->id],
            ['Raison sociale', $c->name],
            ['Secteur', $c->sector],
            ['Email', $c->email],
            ['Téléphone', $c->phone],
            ['Adresse', $c->address],
            ['Ville', $c->city],
            ['Pays', $c->country],
            ['Fuseau horaire', $c->timezone],
            ['Langue', $c->locale],
            ['Devise', $c->currency],
            ['Couleur principale', $c->primary_color],
            ['Statut', $this->status($c->status?->value)],
            ['Inscrite le', $c->created_at?->format('d/m/Y H:i')],
            ['Dossier envoyé le', $c->onboarding_completed_at?->format('d/m/Y H:i')],
            ['Export généré le', now()->format('d/m/Y H:i')],
        ]);

        $roles = collect(Role::cases())->mapWithKeys(fn (Role $r) => [$r->value => $r->label()]);
        $book->sheet('Utilisateurs', [
            'ID' => [$I, 8], 'Nom' => [$T, 26], 'Email' => [$T, 30], 'Téléphone' => [$T, 16], 'Rôle' => [$T, 24],
            'Statut' => [$T, 12], 'Langue' => [$T, 8], 'Email vérifié le' => [$DT, 16], 'Dernière connexion' => [$DT, 16],
            'Créé le' => [$DT, 16], 'Supprimé le' => [$DT, 16],
        ], $this->rows(DB::table('users')->where('company_id', $id)->orderBy('id'), fn ($u) => [
            $u->id, $u->name, $u->email, $u->phone, $roles[$u->role] ?? $u->role, $this->status($u->status), $u->locale,
            $u->email_verified_at, $u->last_login_at, $u->created_at, $u->deleted_at,
        ]));

        $book->sheet('Sites', [
            'ID' => [$I, 8], 'Nom' => [$T, 26], 'Code' => [$T, 10], 'Type' => [$T, 14], 'Adresse' => [$T, 30],
            'Ville' => [$T, 14], 'Région' => [$T, 14], 'Latitude' => [$T, 12], 'Longitude' => [$T, 12],
            'Contact' => [$T, 20], 'Téléphone contact' => [$T, 16], 'Jours d’ouverture' => [$T, 20],
            'Ouverture' => [$T, 10], 'Fermeture' => [$T, 10], 'Statut' => [$T, 10], 'Notes' => [$T, 30],
            'Photos' => [$T, 30], 'Dernière visite' => [$DT, 16], 'Créé le' => [$DT, 16], 'Supprimé le' => [$DT, 16],
        ], $this->rows(DB::table('sites')->where('company_id', $id)->orderBy('id'), fn ($s) => [
            $s->id, $s->name, $s->code, $this->label(SiteType::class, $s->type), $s->address, $s->city, $s->region, $s->latitude, $s->longitude,
            $s->contact_name, $s->contact_phone, $s->opening_days, $s->opening_time, $s->closing_time, $this->label(SiteStatus::class, $s->status), $s->notes,
            implode(', ', array_map('basename', $this->sitePhotos($s))), $s->last_visit_at, $s->created_at, $s->deleted_at,
        ]));

        $book->sheet('Produits', [
            'ID' => [$I, 8], 'Nom' => [$T, 26], 'Référence' => [$T, 14], 'Description' => [$T, 34], 'Unité' => [$T, 10],
            "Prix ($c->currency)" => [$M, 14], 'Actif' => [$T, 8], 'Image' => [$T, 26], 'Créé le' => [$DT, 16], 'Supprimé le' => [$DT, 16],
        ], $this->rows(DB::table('products')->where('company_id', $id)->orderBy('id'), fn ($p) => [
            $p->id, $p->name, $p->sku, $p->description, $p->unit, $p->price, $p->is_active ? 'Oui' : 'Non',
            $p->image ? basename($p->image) : null, $p->created_at, $p->deleted_at,
        ]));

        $book->sheet('Stocks par site', [
            'Site' => [$T, 26], 'Produit' => [$T, 26], 'Stock actuel' => [$I, 12], 'Seuil d’alerte' => [$I, 12],
            'Seuil critique' => [$I, 12], 'Mis à jour le' => [$DT, 16],
        ], $this->rows(
            DB::table('site_products as sp')->leftJoin('sites as s', 's.id', '=', 'sp.site_id')->leftJoin('products as p', 'p.id', '=', 'sp.product_id')
                ->where('sp.company_id', $id)->orderBy('s.name')->orderBy('p.name')
                ->select('s.name as site', 'p.name as product', 'sp.current_stock', 'sp.alert_threshold', 'sp.critical_threshold', 'sp.updated_at'),
            fn ($r) => [$r->site, $r->product, $r->current_stock, $r->alert_threshold, $r->critical_threshold, $r->updated_at],
        ));

        $book->sheet('Affectations', [
            'ID' => [$I, 8], 'Site' => [$T, 24], 'Personne' => [$T, 24], 'Événement' => [$T, 20], 'Du' => [$D, 12], 'Au' => [$D, 12],
            'Début créneau' => [$T, 10], 'Fin créneau' => [$T, 10], 'Statut' => [$T, 12], 'Notes' => [$T, 30],
            'Créée le' => [$DT, 16], 'Supprimée le' => [$DT, 16],
        ], $this->rows(
            DB::table('affectations as a')->leftJoin('sites as s', 's.id', '=', 'a.site_id')->leftJoin('users as u', 'u.id', '=', 'a.user_id')
                ->leftJoin('events as e', 'e.id', '=', 'a.event_id')->where('a.company_id', $id)->orderBy('a.id')
                ->select('a.*', 's.name as site', 'u.name as person', 'e.name as event'),
            fn ($a) => [$a->id, $a->site, $a->person, $a->event, $a->starts_on, $a->ends_on, $a->slot_start, $a->slot_end, $this->label(AffectationStatus::class, $a->status), $a->notes, $a->created_at, $a->deleted_at],
        ));

        $book->sheet('Pointages', [
            'ID' => [$I, 8], 'Site' => [$T, 24], 'Personne' => [$T, 24], 'Arrivée' => [$DT, 16], 'Départ' => [$DT, 16],
            'Durée (min)' => [$I, 10], 'Lat. arrivée' => [$T, 12], 'Long. arrivée' => [$T, 12], 'Lat. départ' => [$T, 12],
            'Long. départ' => [$T, 12], 'Statut' => [$T, 12], 'Notes' => [$T, 30],
        ], $this->rows(
            DB::table('visits as v')->leftJoin('sites as s', 's.id', '=', 'v.site_id')->leftJoin('users as u', 'u.id', '=', 'v.user_id')
                ->where('v.company_id', $id)->orderBy('v.id')->select('v.*', 's.name as site', 'u.name as person'),
            fn ($v) => [$v->id, $v->site, $v->person, $v->checked_in_at, $v->checked_out_at, $v->duration_minutes,
                $v->checkin_latitude, $v->checkin_longitude, $v->checkout_latitude, $v->checkout_longitude, $this->label(VisitStatus::class, $v->status), $v->notes],
        ));

        $book->sheet('Rapports journaliers', [
            'ID' => [$I, 8], 'Date' => [$D, 12], 'Site' => [$T, 24], 'Hôtesse' => [$T, 24], 'Événement' => [$T, 20],
            'Statut' => [$T, 12], 'Notes' => [$T, 30], 'Incidents' => [$T, 30], 'Envoyé le' => [$DT, 16],
        ], $this->rows(
            DB::table('daily_reports as r')->leftJoin('sites as s', 's.id', '=', 'r.site_id')->leftJoin('users as u', 'u.id', '=', 'r.user_id')
                ->leftJoin('events as e', 'e.id', '=', 'r.event_id')->where('r.company_id', $id)->orderBy('r.id')
                ->select('r.*', 's.name as site', 'u.name as person', 'e.name as event'),
            fn ($r) => [$r->id, $r->report_date, $r->site, $r->person, $r->event, $this->status($r->status), $r->notes, $r->incident_notes, $r->submitted_at],
        ));

        $book->sheet('Lignes de rapports', [
            'N° rapport' => [$I, 10], 'Date' => [$D, 12], 'Site' => [$T, 24], 'Produit' => [$T, 24], 'Unité' => [$T, 9],
            "Prix unitaire ($c->currency)" => [$M, 14], 'Stock ouverture' => [$I, 12], 'Quantité vendue' => [$I, 12],
            'Stock clôture' => [$I, 12], "Chiffre d'affaires ($c->currency)" => [$M, 16], 'Remarque' => [$T, 30],
        ], $this->rows(
            DB::table('daily_report_lines as l')->join('daily_reports as r', 'r.id', '=', 'l.daily_report_id')
                ->leftJoin('sites as s', 's.id', '=', 'r.site_id')->where('r.company_id', $id)->orderBy('r.id')->orderBy('l.id')
                ->select('l.*', 'r.report_date', 's.name as site'),
            fn ($l) => [$l->daily_report_id, $l->report_date, $l->site, $l->product_name, $l->unit, $l->unit_price,
                $l->opening_stock, $l->units_sold, $l->closing_stock, $l->revenue, $l->notes],
        ));

        $book->sheet('Événements', [
            'ID' => [$I, 8], 'Nom' => [$T, 26], 'Description' => [$T, 34], 'Début' => [$D, 12], 'Fin' => [$D, 12],
            'Lieu' => [$T, 20], 'Ville' => [$T, 14], 'Statut' => [$T, 12], 'Activé le' => [$DT, 16], 'Terminé le' => [$DT, 16],
            'Créé le' => [$DT, 16], 'Supprimé le' => [$DT, 16],
        ], $this->rows(DB::table('events')->where('company_id', $id)->orderBy('id'), fn ($e) => [
            $e->id, $e->name, $e->description, $e->start_date, $e->end_date, $e->location, $e->city, $this->label(EventStatus::class, $e->status),
            $e->activated_at, $e->completed_at, $e->created_at, $e->deleted_at,
        ]));

        $eventIds = DB::table('events')->where('company_id', $id)->select('id');

        $book->sheet('Points de vente événements', [
            'ID' => [$I, 8], 'Événement' => [$T, 24], 'Site lié' => [$T, 24], 'Nom' => [$T, 24], 'Adresse' => [$T, 30], 'Ville' => [$T, 14],
        ], $this->rows(
            DB::table('event_sites as es')->join('events as e', 'e.id', '=', 'es.event_id')->leftJoin('sites as s', 's.id', '=', 'es.site_id')
                ->whereIn('es.event_id', $eventIds)->orderBy('es.id')->select('es.*', 'e.name as event', 's.name as site'),
            fn ($r) => [$r->id, $r->event, $r->site, $r->name, $r->address, $r->city],
        ));

        $book->sheet('Hôtesses événements', [
            'ID' => [$I, 8], 'Événement' => [$T, 24], 'Hôtesse' => [$T, 24], 'Point de vente' => [$T, 24],
            'Recrutée pour l’événement' => [$T, 12], 'Statut' => [$T, 12],
        ], $this->rows(
            DB::table('event_hostesses as h')->join('events as e', 'e.id', '=', 'h.event_id')->leftJoin('users as u', 'u.id', '=', 'h.user_id')
                ->leftJoin('event_sites as es', 'es.id', '=', 'h.event_site_id')->whereIn('h.event_id', $eventIds)->orderBy('h.id')
                ->select('h.*', 'e.name as event', 'u.name as person', 'es.name as pdv'),
            fn ($h) => [$h->id, $h->event, $h->person, $h->pdv, $h->recruited_for_event ? 'Oui' : 'Non', $this->label(EventHostessStatus::class, $h->status)],
        ));

        $book->sheet('Packs', [
            'ID' => [$I, 8], 'Événement' => [$T, 24], 'Nom' => [$T, 24], 'Description' => [$T, 30], 'Type' => [$T, 18],
            "Prix ($c->currency)" => [$M, 12], 'Actif' => [$T, 8],
        ], $this->rows(
            DB::table('event_packs as p')->join('events as e', 'e.id', '=', 'p.event_id')->whereIn('p.event_id', $eventIds)->orderBy('p.id')
                ->select('p.*', 'e.name as event'),
            fn ($p) => [$p->id, $p->event, $p->name, $p->description, $this->label(EventPackType::class, $p->type), $p->price, $p->active ? 'Oui' : 'Non'],
        ));

        $book->sheet('Contenu des packs', [
            'Pack' => [$T, 24], 'Produit' => [$T, 24], 'Quantité' => [$I, 10], 'Rôle' => [$T, 10], "Prix unitaire ($c->currency)" => [$M, 14],
        ], $this->rows(
            DB::table('event_pack_lines as pl')->join('event_packs as p', 'p.id', '=', 'pl.event_pack_id')->leftJoin('products as pr', 'pr.id', '=', 'pl.product_id')
                ->whereIn('p.event_id', $eventIds)->orderBy('pl.id')->select('pl.*', 'p.name as pack', 'pr.name as product'),
            fn ($l) => [$l->pack, $l->product, $l->quantity, $l->role === 'free' ? 'Offert' : 'Payant', $l->unit_price],
        ));

        $book->sheet('Tickets', [
            'ID' => [$I, 8], 'Auteur' => [$T, 22], 'Sujet' => [$T, 28], 'Message' => [$T, 40], 'Priorité' => [$T, 10],
            'Statut' => [$T, 10], 'Réponse' => [$T, 40], 'Répondu le' => [$DT, 16], 'Créé le' => [$DT, 16],
        ], $this->rows(
            DB::table('tickets as t')->leftJoin('users as u', 'u.id', '=', 't.user_id')->where('t.company_id', $id)->orderBy('t.id')
                ->select('t.*', 'u.name as author'),
            fn ($t) => [$t->id, $t->author, $t->subject, $t->body, $this->status($t->priority), $this->status($t->status), $t->response, $t->responded_at, $t->created_at],
        ));

        $book->sheet('Journal d’activité', [
            'Date' => [$DT, 16], 'Utilisateur' => [$T, 22], 'Action' => [$T, 26], 'Élément' => [$T, 16], 'ID élément' => [$I, 10],
            'Avant' => [$T, 40], 'Après' => [$T, 40],
        ], $this->rows(
            DB::table('audit_logs as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->where('a.company_id', $id)->orderBy('a.id')
                ->select('a.*', 'u.name as person'),
            fn ($a) => [$a->created_at, $a->person, $a->action, $a->auditable_type ? class_basename($a->auditable_type) : null,
                $a->auditable_id, $a->old_values, $a->new_values],
        ));

        $book->close();
    }

    /**
     * Parcourt la requête par lots pour ne pas charger toute la table en mémoire.
     */
    private function rows(Builder $query, callable $map): \Generator
    {
        foreach ($query->lazy(500) as $row) {
            yield $map($row);
        }
    }

    /**
     * Fichiers joints : [disque, chemin, chemin dans le ZIP].
     */
    private function files(): \Generator
    {
        $c = $this->company;

        if ($c->logo_path) {
            yield ['public', $c->logo_path, 'logo/'.basename($c->logo_path)];
        }

        $documents = [
            'id_card_front_path' => 'piece-identite-recto',
            'id_card_back_path' => 'piece-identite-verso',
            'registration_doc_path' => 'document-legal',
        ];

        foreach ($documents as $field => $name) {
            if ($c->{$field}) {
                yield ['local', $c->{$field}, "documents-inscription/$name.".pathinfo($c->{$field}, PATHINFO_EXTENSION)];
            }
        }

        foreach (DB::table('sites')->where('company_id', $c->id)->orderBy('id')->get(['id', 'name', 'photos']) as $site) {
            foreach ($this->sitePhotos($site) as $photo) {
                yield ['public', $photo, 'photos-sites/'.$site->id.'-'.Str::slug($site->name).'/'.basename($photo)];
            }
        }

        foreach (DB::table('products')->where('company_id', $c->id)->whereNotNull('image')->orderBy('id')->get(['id', 'name', 'image']) as $p) {
            yield ['public', $p->image, 'images-produits/'.$p->id.'-'.Str::slug($p->name).'.'.pathinfo($p->image, PATHINFO_EXTENSION)];
        }
    }

    /**
     * Libellé français d'une valeur d'énumération ; la valeur brute si elle est inconnue.
     *
     * @param  class-string<\BackedEnum>  $enum
     */
    private function label(string $enum, ?string $value): ?string
    {
        return $value === null ? null : ($enum::tryFrom($value)?->label() ?? $value);
    }

    private function status(?string $value): ?string
    {
        return $value === null ? null : (self::STATUS_LABELS[$value] ?? $value);
    }

    private function sitePhotos(object $site): array
    {
        $photos = is_string($site->photos) ? json_decode($site->photos, true) : $site->photos;

        return array_values(array_filter((array) $photos, 'is_string'));
    }

    private function readme(array $missing): string
    {
        $lines = [
            'Export des données de '.$this->company->name.' sur Motriks',
            'Généré le '.now()->format('d/m/Y à H:i'),
            '',
            'donnees.xlsx : toutes vos données, un onglet par type (entreprise, utilisateurs, sites, produits,',
            'stocks, affectations, pointages, rapports et ventes, événements, packs, tickets, journal d\'activité).',
            'Les éléments supprimés sont inclus, avec leur date de suppression.',
            '',
            'fichiers/ : logo, documents d\'inscription, photos des sites et images des produits.',
            '',
            'Par sécurité, les mots de passe, les codes de double authentification et les adresses IP',
            'ne font pas partie de cet export.',
        ];

        if ($missing) {
            $lines[] = '';
            $lines[] = 'Fichiers référencés mais introuvables sur le serveur :';
            array_push($lines, ...array_map(fn ($f) => ' - '.$f, $missing));
        }

        return implode("\r\n", $lines)."\r\n";
    }
}
