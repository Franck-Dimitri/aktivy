<?php

namespace App\Enums;

enum Role: string
{
    case SuperAdmin = 'super_admin';
    case CompanyAdmin = 'company_admin';
    case Supervisor = 'supervisor';
    case FieldAgent = 'field_agent';
    case Accountant = 'accountant';

    /**
     * Get the human readable name of the role.
     */
    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Administrateur',
            self::CompanyAdmin => "Administrateur d'entreprise",
            self::Supervisor => 'Responsable / Superviseur',
            self::FieldAgent => 'Hôtesse / Agent terrain',
            self::Accountant => 'Lecteur / Comptable',
        };
    }

    /**
     * Determine if the role belongs to a client company.
     */
    public function belongsToCompany(): bool
    {
        return $this !== self::SuperAdmin;
    }

    /**
     * Get the name of the route the role lands on after logging in.
     */
    public function homeRoute(): string
    {
        return match ($this) {
            self::SuperAdmin => 'admin.dashboard',
            self::FieldAgent => 'terrain.home',
            default => 'dashboard',
        };
    }
}
