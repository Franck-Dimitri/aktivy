
# Aktivy

Plateforme SaaS de gestion d'équipes terrain et de reporting journalier pour les entreprises de distribution et de promotion commerciale.

---

## Vue d'ensemble

Aktivy permet à une entreprise de piloter ses hôtesses et agents de terrain depuis un tableau de bord web, pendant que les agents saisissent leurs ventes et clôturent leur journée depuis leur smartphone.

**Flux principal :**

1. Le responsable crée ses sites (points de vente) et affecte ses hôtesses.
2. L'hôtesse prend son service sur mobile, saisit ses ventes produit par produit (compteur `+` / `−`), puis soumet son rapport.
3. Le responsable consulte en temps réel le chiffre d'affaires, les stocks et l'activité de son équipe.

---

## Stack technique

| Couche           | Technologie                                      |
| ---------------- | ------------------------------------------------ |
| Backend          | Laravel 11 (PHP 8.3)                             |
| Frontend         | React 19 + TypeScript + Inertia.js v2            |
| Styles           | Tailwind CSS v4                                  |
| Base de données | PostgreSQL                                       |
| Auth             | Laravel Fortify (email **ou** téléphone) |
| Routes typées   | Laravel Wayfinder                                |
| Composants UI    | Radix UI + shadcn/ui                             |
| Graphiques       | Recharts                                         |
| Notifications    | Sonner                                           |

---

## Architecture multi-tenant

Chaque enregistrement métier porte un `company_id`. L'isolation est garantie à deux niveaux :

- **Création** : toujours via `$user->company->relation()->create(...)` — le FK est injecté automatiquement.
- **Lecture / modification** : `abort_if($model->company_id !== $user->company_id, 403)` dans chaque action sensible.

Une entreprise ne peut jamais voir ni modifier les données d'une autre.

---

## Rôles

| Rôle             | Label                | Accès                                              |
| ----------------- | -------------------- | --------------------------------------------------- |
| `super_admin`   | Super administrateur | Administration globale de la plateforme             |
| `company_admin` | Gérant              | Tableau de bord, équipe, sites, produits, rapports |
| `supervisor`    | Superviseur          | Même périmètre que le gérant                    |
| `field_agent`   | Hôtesse             | Interface terrain mobile uniquement                 |
| `accountant`    | Comptable            | Lecture des rapports financiers                     |

---

## Fonctionnalités implémentées

### Côté responsable / superviseur

- Tableau de bord avec KPIs : sites actifs, équipe en poste, visites du jour, **CA du jour/semaine, unités vendues, rapports soumis**
- CRUD des sites avec photos, coordonnées GPS, horaires et inventaire produits
- Gestion du personnel avec invitation par email et vérification d'adresse
- Affectations hôtesse ↔ site avec créneau horaire et historique
- Catalogue produits et prix par site
- Statistiques détaillées par site (visites, CA, taux de complétion, graphique 7j / 30j / 12 mois)

### Côté hôtesse (terrain mobile)

- Prise de service avec capture GPS optionnelle
- Rapport journalier : saisie des ventes par compteur `+` / `−`, calcul automatique du stock résiduel et du CA
- Flux draft → relecture → soumission (verrouillé après soumission)
- Signalement d'incident post-soumission
- Stats personnelles du mois (visites, CA, unités vendues, rapports soumis)

### Authentification

- Connexion par **email** ou **numéro de téléphone**
- Vérification d'email obligatoire pour les comptes invités
- Changement de mot de passe obligatoire à la première connexion
- Réinitialisation de mot de passe par email

---

## Installation locale

```bash
# 1. Cloner et installer les dépendances
git clone <repo-url> aktivy
cd aktivy
composer install
npm install

# 2. Configurer l'environnement
cp .env.example .env
php artisan key:generate

# 3. Renseigner la base de données dans .env
# DB_CONNECTION=pgsql
# DB_DATABASE=aktivy
# DB_USERNAME=...
# DB_PASSWORD=...

# 4. Migrer et seeder
php artisan migrate --seed

# 5. Lancer les serveurs
php artisan serve          # http://localhost:8000
npm run dev                # Vite HMR
```

---

## Comptes de test

Voir [`TEST_ACCOUNTS.md`](TEST_ACCOUNTS.md) pour la liste complète des comptes.

```bash
# Réinitialiser toutes les données
php artisan migrate:fresh --seed
```

---

## Structure des dossiers clés

```
app/
  Enums/          — Role, SiteType, SiteStatus, VisitStatus
  Http/
    Controllers/
      Company/    — Dashboard, Sites, Personnel, Produits, Affectations
      Terrain/    — Home, Visit, DailyReport (interface hôtesse)
      Auth/       — ChangePassword
  Middleware/     — EnsurePasswordIsChanged, EnsureUserHasRole
  Models/         — Company, User, Site, Affectation, Visit, DailyReport, DailyReportLine, Product, SiteProduct

resources/js/
  pages/
    dashboard.tsx         — Tableau de bord responsable
    sites/                — CRUD sites + détail avec stats
    personnel/            — Gestion équipe
    affectations/         — Planification
    products/             — Catalogue
    terrain/              — Interface hôtesse (home + rapport)
    landing.tsx           — Page publique
  components/
    landing/              — Footer, sections marketing
    page/                 — Page, Panel, StatusBadge, EmptyState
  lib/
    navigation.ts         — Menu par rôle

routes/
  web.php                 — Routes publiques + auth + dashboard
  terrain.php             — Routes terrain (field_agent uniquement)
```

---

## Modèle de données — reporting journalier

```
Visit (check-in / check-out + GPS)
  └── DailyReport (1 par visite, statut: draft → submitted)
        └── DailyReportLine (1 par produit)
              opening_stock  ← snapshot au check-in
              units_sold     ← saisi par l'hôtesse
              closing_stock  ← calculé (opening − sold)
              revenue        ← calculé (sold × unit_price)
```

À la soumission, `site_products.current_stock` est mis à jour avec `closing_stock`.

---

## Variables d'environnement importantes

```env
APP_URL=http://localhost:8000
DB_CONNECTION=pgsql

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_ENCRYPTION=tls
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=...
MAIL_FROM_NAME="Aktivy"
```
