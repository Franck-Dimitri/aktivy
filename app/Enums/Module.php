<?php

namespace App\Enums;

/**
 * Modules payants de la plateforme. Le socle (tableau de bord, sites, personnel, affectations,
 * produits, paramètres, import, aide, export des données) reste toujours gratuit.
 */
enum Module: string
{
    case Terrain = 'terrain';
    case Stocks = 'stocks';
    case Reporting = 'reporting';
    case Events = 'events';
    case Photos = 'photos';
    case Requests = 'demandes';

    public function label(): string
    {
        return match ($this) {
            self::Terrain => 'Suivi terrain',
            self::Stocks => 'Stocks & réassorts',
            self::Reporting => 'Reporting & documents',
            self::Events => 'Événements & packs',
            self::Photos => 'Preuves photo',
            self::Requests => 'Demandes des hôtesses',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Terrain => 'Espace hôtesse sur téléphone : prise de service, saisie des ventes, clôture. Rapports journaliers et activité du jour.',
            self::Stocks => 'Réassorts, journal des mouvements de stock et alertes quand un produit passe sous son seuil.',
            self::Reporting => 'Ventes & objectifs, exports Excel et PDF aux couleurs de l’entreprise.',
            self::Events => 'Opérations commerciales avec leurs points de vente, hôtesses et packs promotionnels.',
            self::Photos => 'Photos du stand ou du rayon jointes aux rapports.',
            self::Requests => 'Demandes envoyées par les hôtesses et réponses du responsable.',
        };
    }
}
