<?php

namespace App\Enums;

/**
 * Forfaits Motriks. Chaque forfait ouvre des fonctions (les modules, internes à l'application)
 * et fixe des limites. Prix mensuels en FCFA, tels que présentés dans la plaquette commerciale.
 */
enum Plan: string
{
    case Starter = 'starter';
    case Pro = 'pro';
    case Business = 'business';
    case Entreprise = 'entreprise';

    /** Pack hôtesses : +5 hôtesses et +5 points de vente par mois, sans changer de forfait. */
    public const PACK_PRICE = 11500;

    public const PACK_HOSTESSES = 5;

    public const PACK_SITES = 5;

    /** Pack superviseur : +1 superviseur par mois, pour les forfaits où leur nombre est limité. */
    public const SUPERVISOR_PACK_PRICE = 1500;

    public const SUPERVISOR_PACK_SUPERVISORS = 1;

    public function label(): string
    {
        return 'Motriks '.$this->shortLabel();
    }

    public function shortLabel(): string
    {
        return match ($this) {
            self::Starter => 'Starter',
            self::Pro => 'Pro',
            self::Business => 'Business',
            self::Entreprise => 'Entreprise',
        };
    }

    /** Prix mensuel en FCFA. */
    public function price(): int
    {
        return match ($this) {
            self::Starter => 0,
            self::Pro => 14500,
            self::Business => 48000,
            self::Entreprise => 88000,
        };
    }

    public function audience(): string
    {
        return match ($this) {
            self::Starter => 'Pour découvrir Motriks avec une hôtesse et un point de vente. Gratuit pour toujours, dans ses limites.',
            self::Pro => 'Pour la PME qui pilote son réseau de vente : stocks, rappels et documents à son nom.',
            self::Business => 'Pour les agences et les marques qui mènent des campagnes en point de vente.',
            self::Entreprise => 'Pour les grands réseaux et les groupes, avec un interlocuteur dédié.',
        };
    }

    /**
     * Fonctions ouvertes par le forfait.
     *
     * @return list<Module>
     */
    public function modules(): array
    {
        return match ($this) {
            self::Starter => [Module::Terrain],
            self::Pro => [Module::Terrain, Module::Stocks, Module::Reporting, Module::Photos, Module::Requests, Module::Events],
            self::Business, self::Entreprise => Module::cases(),
        };
    }

    /**
     * Limites du forfait ; null = illimité. Le gérant est toujours inclus et les comptables ne sont pas
     * comptés : seuls les superviseurs ont une limite au back-office.
     *
     * @return array{hostesses: int|null, sites: int|null, supervisors: int|null, events_per_month: int|null, packs_per_month: int|null, photos_per_report: int, history_days: int|null, pdf_per_month: int|null, excel_per_month: int|null, exports_per_month: int|null}
     */
    public function limits(): array
    {
        return match ($this) {
            self::Starter => ['hostesses' => 1, 'sites' => 1, 'supervisors' => 0, 'events_per_month' => 0, 'packs_per_month' => 1, 'photos_per_report' => 0, 'history_days' => 30, 'pdf_per_month' => 5, 'excel_per_month' => 0, 'exports_per_month' => 0],
            self::Pro => ['hostesses' => 7, 'sites' => 7, 'supervisors' => 2, 'events_per_month' => 1, 'packs_per_month' => 3, 'photos_per_report' => 2, 'history_days' => 730, 'pdf_per_month' => 30, 'excel_per_month' => 10, 'exports_per_month' => 1],
            self::Business => ['hostesses' => 35, 'sites' => 35, 'supervisors' => 6, 'events_per_month' => 3, 'packs_per_month' => 10, 'photos_per_report' => 6, 'history_days' => null, 'pdf_per_month' => 150, 'excel_per_month' => 50, 'exports_per_month' => 2],
            self::Entreprise => ['hostesses' => 120, 'sites' => 120, 'supervisors' => null, 'events_per_month' => null, 'packs_per_month' => null, 'photos_per_report' => 6, 'history_days' => null, 'pdf_per_month' => null, 'excel_per_month' => null, 'exports_per_month' => null],
        };
    }

    /** Les packs hôtesses (+5 hôtesses / +5 points de vente) ne s'ajoutent qu'aux forfaits payants. */
    public function acceptsPacks(): bool
    {
        return $this !== self::Starter;
    }

    /** Les packs superviseur ne servent qu'aux forfaits payants où les superviseurs sont limités. */
    public function acceptsSupervisorPacks(): bool
    {
        return $this->acceptsPacks() && $this->limits()['supervisors'] !== null;
    }

    /**
     * Les deux packs d'extension, pour les pages (prix et contenu).
     *
     * @return array{hostesses: array{price: int, hostesses: int, sites: int}, supervisors: array{price: int, supervisors: int}}
     */
    public static function packCatalog(): array
    {
        return [
            'hostesses' => ['price' => self::PACK_PRICE, 'hostesses' => self::PACK_HOSTESSES, 'sites' => self::PACK_SITES],
            'supervisors' => ['price' => self::SUPERVISOR_PACK_PRICE, 'supervisors' => self::SUPERVISOR_PACK_SUPERVISORS],
        ];
    }

    /**
     * Points forts affichés dans la comparaison des forfaits.
     *
     * @return list<string>
     */
    public function highlights(): array
    {
        return match ($this) {
            self::Starter => [
                'Suivi terrain sur téléphone, même sans réseau',
                'Rapports journaliers et chiffres du jour',
                'Import Excel de vos fichiers',
                'Historique des 30 derniers jours',
            ],
            self::Pro => [
                'Gestion des stocks et alertes de stock bas',
                'Correction et validation des rapports',
                'Rappels automatiques et notifications push',
                'Ventes et objectifs par hôtesse',
                'Documents PDF à vos couleurs et exports Excel',
                '1 événement et 3 packs par mois',
            ],
            self::Business => [
                'Tout Pro, plus 3 événements et 10 packs par mois',
                '6 photos par rapport',
                'Documents du personnel',
                'Historique illimité',
                'Mise en service offerte, support WhatsApp',
            ],
            self::Entreprise => [
                'Tout Business, sans limite d’événements ni de packs',
                'Superviseurs illimités',
                'PDF et exports illimités',
                'Mise en service sur place',
                'Interlocuteur dédié',
            ],
        };
    }

    /** Premier forfait qui ouvre une fonction : pour dire « disponible à partir de Motriks Pro ». */
    public static function lowestWith(Module $module): self
    {
        foreach (self::cases() as $plan) {
            if (in_array($module, $plan->modules(), true)) {
                return $plan;
            }
        }

        return self::Entreprise;
    }

    /** Forfait suivant, pour proposer de monter en gamme quand une limite est atteinte. */
    public function next(): ?self
    {
        return match ($this) {
            self::Starter => self::Pro,
            self::Pro => self::Business,
            self::Business => self::Entreprise,
            self::Entreprise => null,
        };
    }
}
