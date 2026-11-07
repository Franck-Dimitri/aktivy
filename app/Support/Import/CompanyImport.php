<?php

namespace App\Support\Import;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Enums\SiteType;
use App\Models\Company;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Import des fichiers existants d'une entreprise : sites, produits, personnel.
 *
 * Toutes les lignes sont contrôlées avant d'écrire quoi que ce soit : au moindre problème,
 * rien n'est importé et chaque erreur est signalée avec son numéro de ligne. Les éléments
 * déjà présents (même code, même nom, même téléphone…) sont ignorés, jamais dupliqués.
 */
class CompanyImport
{
    /** Au-delà, mieux vaut découper le fichier. */
    public const MAX_ROWS = 500;

    /**
     * Colonnes reconnues par type : clé => [intitulé du modèle, autres intitulés acceptés, exemple].
     */
    public const COLUMNS = [
        'sites' => [
            'name' => ['Nom', ['nom du site', 'site', 'point de vente', 'magasin'], 'Santa Lucia Akwa'],
            'code' => ['Code', ['code site'], 'SL-AKWA'],
            'type' => ['Type', ['type de commerce'], 'Supermarché'],
            'city' => ['Ville', [], 'Douala'],
            'region' => ['Région', ['region'], 'Littoral'],
            'address' => ['Adresse', [], 'Boulevard de la Liberté'],
            'latitude' => ['Latitude', ['lat'], '4.0511'],
            'longitude' => ['Longitude', ['long', 'lng'], '9.7679'],
            'contact_name' => ['Contact', ['nom du contact', 'responsable'], 'M. Ebongue'],
            'contact_phone' => ['Téléphone contact', ['telephone', 'tel contact'], '+237 699 00 00 00'],
        ],
        'produits' => [
            'name' => ['Nom', ['produit', 'designation', 'libelle'], 'Savon karité 250 g'],
            'sku' => ['Code', ['sku', 'reference', 'ref'], 'SAV-250'],
            'unit' => ['Unité', ['unite'], 'pièce'],
            'price' => ['Prix', ['prix unitaire', 'prix de vente'], '500'],
        ],
        'personnel' => [
            'name' => ['Nom', ['nom et prenom', 'nom complet', 'hotesse'], 'Awa Ngono'],
            'phone' => ['Téléphone', ['telephone', 'tel', 'numero'], '690000001'],
            'email' => ['E-mail', ['email', 'mail', 'adresse e mail'], ''],
            'role' => ['Rôle', ['role', 'fonction', 'poste'], 'Hôtesse'],
        ],
    ];

    private const ROLES = [
        'hotesse' => Role::FieldAgent, 'agent' => Role::FieldAgent, 'agent terrain' => Role::FieldAgent, 'promotrice' => Role::FieldAgent,
        'superviseur' => Role::Supervisor, 'responsable' => Role::Supervisor,
        'comptable' => Role::Accountant, 'lecteur' => Role::Accountant,
    ];

    /** @var array<int, string> */
    public array $errors = [];

    public int $created = 0;

    /** Mot de passe provisoire chiffré une seule fois pour tout le fichier (bcrypt est volontairement lent). */
    private ?string $passwordHash = null;

    public int $skipped = 0;

    public function __construct(private Company $company, private string $type, private ?User $by = null, private ?string $password = null) {}

    /**
     * @param  array<int, array<string, string>>  $rows
     */
    public function run(array $rows): bool
    {
        if ($rows === []) {
            $this->errors[] = 'Le fichier ne contient aucune ligne à importer.';

            return false;
        }

        if (count($rows) > self::MAX_ROWS) {
            $this->errors[] = 'Le fichier contient '.count($rows).' lignes : '.self::MAX_ROWS.' au maximum par import.';

            return false;
        }

        $prepared = [];
        $seen = [];

        foreach ($rows as $line => $raw) {
            $row = $this->map($raw);

            if ($row['name'] === '') {
                $this->errors[] = "Ligne {$line} : le nom est obligatoire.";

                continue;
            }

            [$data, $key, $error] = match ($this->type) {
                'sites' => $this->site($row),
                'produits' => $this->product($row),
                'personnel' => $this->member($row),
            };

            if ($error) {
                $this->errors[] = "Ligne {$line} : {$error}";

                continue;
            }

            // Doublon dans le fichier ou déjà présent : ignoré
            if (isset($seen[$key]) || $data === null) {
                $this->skipped++;

                continue;
            }

            $seen[$key] = true;
            $prepared[] = $data;
        }

        if ($this->errors !== []) {
            return false;
        }

        DB::transaction(function () use ($prepared) {
            foreach ($prepared as $data) {
                $this->persist($data);
                $this->created++;
            }
        });

        return true;
    }

    /** Ligne du fichier ramenée aux clés connues, quel que soit l'intitulé utilisé. */
    private function map(array $raw): array
    {
        $row = [];

        foreach (self::COLUMNS[$this->type] as $key => [$label, $aliases]) {
            $row[$key] = '';

            foreach ([$label, ...$aliases] as $header) {
                $value = $raw[Spreadsheet::normalize($header)] ?? null;

                if ($value !== null && $value !== '') {
                    $row[$key] = $value;

                    break;
                }
            }
        }

        return $row;
    }

    private function site(array $row): array
    {
        $type = $row['type'] === '' ? SiteType::Autre : $this->siteType($row['type']);

        if ($type === null) {
            return [null, null, "type « {$row['type']} » inconnu (".collect(SiteType::cases())->map->label()->join(', ').').'];
        }

        // Excel en français écrit « 4,05 » : virgule décimale ramenée au point
        foreach (['latitude', 'longitude'] as $coordinate) {
            $row[$coordinate] = str_replace([' ', ','], ['', '.'], $row[$coordinate]);
        }

        $error = $this->check($row, [
            'name' => ['max:255'], 'code' => ['nullable', 'max:30'], 'city' => ['required', 'max:100'],
            'region' => ['nullable', 'max:100'], 'address' => ['nullable', 'max:500'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'], 'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'contact_name' => ['nullable', 'max:150'], 'contact_phone' => ['nullable', 'max:25'],
        ]);

        if ($error) {
            return [null, null, $error];
        }

        $key = $row['code'] !== '' ? 'code:'.Str::lower($row['code']) : 'nom:'.Str::lower($row['name'].'|'.$row['city']);
        $exists = $this->company->sites()
            ->when($row['code'] !== '', fn ($q) => $q->where('code', $row['code']), fn ($q) => $q->whereRaw('LOWER(name) = ?', [Str::lower($row['name'])])->whereRaw('LOWER(city) = ?', [Str::lower($row['city'])]))
            ->exists();

        $data = ['kind' => 'site', ...array_map(fn ($v) => $v === '' ? null : $v, $row), 'type' => $type->value];

        return [$exists ? null : $data, $key, null];
    }

    private function product(array $row): array
    {
        $row['price'] = str_replace([' ', "\u{00A0}", ','], ['', '', '.'], $row['price']);

        $error = $this->check($row, [
            'name' => ['max:255'], 'sku' => ['nullable', 'max:60'], 'unit' => ['nullable', 'max:30'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
        ]);

        if ($error) {
            return [null, null, $error];
        }

        $key = $row['sku'] !== '' ? 'sku:'.Str::lower($row['sku']) : 'nom:'.Str::lower($row['name']);
        $exists = $this->company->products()
            ->when($row['sku'] !== '', fn ($q) => $q->where('sku', $row['sku']), fn ($q) => $q->whereRaw('LOWER(name) = ?', [Str::lower($row['name'])]))
            ->exists();

        return [$exists ? null : [
            'kind' => 'product', 'name' => $row['name'], 'sku' => $row['sku'] ?: null,
            'unit' => $row['unit'] ?: 'pièce', 'price' => $row['price'] === '' ? null : (float) $row['price'],
        ], $key, null];
    }

    private function member(array $row): array
    {
        $role = $row['role'] === '' ? Role::FieldAgent : (self::ROLES[Spreadsheet::normalize($row['role'])] ?? null);

        if ($role === null) {
            return [null, null, "rôle « {$row['role']} » inconnu (Hôtesse, Superviseur ou Comptable)."];
        }

        $phone = $row['phone'] === '' ? null : PhoneNumber::normalize($row['phone']);
        $email = $row['email'] === '' ? null : Str::lower($row['email']);

        if ($row['phone'] !== '' && $phone === null) {
            return [null, null, "numéro « {$row['phone']} » invalide."];
        }

        if (! $phone && ! $email) {
            return [null, null, 'un téléphone ou un e-mail est obligatoire pour se connecter.'];
        }

        $error = $this->check(['name' => $row['name'], 'email' => $email], ['name' => ['max:255'], 'email' => ['nullable', 'email', 'max:255']]);

        if ($error) {
            return [null, null, $error];
        }

        $existing = User::withTrashed()
            ->where(fn ($q) => $q->when($phone, fn ($q) => $q->orWhere('phone', $phone))->when($email, fn ($q) => $q->orWhere('email', $email)))
            ->first();

        // Un numéro ou un e-mail ne sert qu'à un seul compte sur toute la plateforme
        if ($existing && $existing->company_id !== $this->company->id) {
            return [null, null, 'ce téléphone ou cet e-mail est déjà utilisé par un autre compte.'];
        }

        return [$existing ? null : [
            'kind' => 'member', 'name' => $row['name'], 'phone' => $phone, 'email' => $email, 'role' => $role,
        ], 'id:'.($phone ?? $email), null];
    }

    private function siteType(string $value): ?SiteType
    {
        $wanted = Spreadsheet::normalize($value);

        foreach (SiteType::cases() as $case) {
            if (in_array($wanted, [Spreadsheet::normalize($case->value), Spreadsheet::normalize($case->label())], true)) {
                return $case;
            }
        }

        return null;
    }

    /** Première erreur de validation de la ligne, ou null. */
    private function check(array $row, array $rules): ?string
    {
        $validator = Validator::make($row, $rules, [], [
            'name' => 'nom', 'city' => 'ville', 'latitude' => 'latitude', 'longitude' => 'longitude',
            'price' => 'prix', 'email' => 'e-mail', 'code' => 'code', 'sku' => 'code',
        ]);

        return $validator->fails() ? $validator->errors()->first() : null;
    }

    private function persist(array $data): void
    {
        $kind = $data['kind'];
        unset($data['kind']);

        match ($kind) {
            'site' => $this->company->sites()->create([...$data, 'created_by' => $this->by?->id]),
            'product' => $this->company->products()->create([...$data, 'created_by' => $this->by?->id]),
            'member' => $this->createMember($data),
        };
    }

    private function createMember(array $data): void
    {
        $member = $this->company->users()->create([
            ...$data,
            // Déjà chiffré : le cast « hashed » du modèle ne le rechiffre pas
            'password' => $this->passwordHash ??= Hash::make((string) $this->password),
            'status' => AccountStatus::Active,
            // Mot de passe provisoire commun : chacun choisit le sien à la première connexion
            'must_change_password' => true,
        ]);

        if ($member->email !== null) {
            // Par la file d'attente : 500 e-mails ne retiennent pas la requête
            dispatch(fn () => $member->sendEmailVerificationNotification());
        }
    }
}
