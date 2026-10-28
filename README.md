
# Motriks

Plateforme SaaS de gestion d'équipes terrain et de reporting journalier pour les entreprises de distribution et de promotion commerciale.

---

## Vue d'ensemble

Motriks permet à une entreprise de piloter ses hôtesses et agents de terrain depuis un tableau de bord web, pendant que les agents saisissent leurs ventes et clôturent leur journée depuis leur smartphone.

**Flux principal :**

1. Le responsable crée ses sites (points de vente) et affecte ses hôtesses.
2. L'hôtesse prend son service sur mobile, saisit ses ventes produit par produit (compteur `+` / `−`), puis soumet son rapport.
3. Le responsable consulte en temps réel le chiffre d'affaires, les stocks et l'activité de son équipe.

---

## Stack technique

| Couche           | Technologie                                      |
| ---------------- | ------------------------------------------------ |
| Backend          | Laravel 13 (PHP 8.3)                             |
| Frontend         | React 19 + TypeScript + Inertia.js v3            |
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
- **Identifiants reçus d'un formulaire** (site, membre, événement…) : validés avec une règle limitée à l'entreprise, ex. `"exists:sites,id,company_id,{$company->id}"`. Un simple `exists:sites,id` laisserait passer l'identifiant d'une autre entreprise.

Une entreprise ne peut jamais voir ni modifier les données d'une autre.

---

## Rôles

| Rôle             | Label                | Accès                                              |
| ----------------- | -------------------- | --------------------------------------------------- |
| `super_admin`   | Super administrateur | Administration globale de la plateforme             |
| `company_admin` | Gérant              | Tableau de bord, équipe, sites, produits, rapports |
| `supervisor`    | Superviseur          | Uniquement les points de vente où il est affecté : leurs hôtesses, affectations, rapports, ventes, objectifs et tickets. Ne crée ni ne supprime de site, ne gère ni catalogue ni événements |
| `field_agent`   | Hôtesse             | Interface terrain mobile uniquement                 |
| `accountant`    | Comptable            | Lecture des rapports journaliers et des ventes, export Excel |

---

## Fonctionnalités implémentées

### Côté responsable / superviseur

- Tableau de bord avec KPIs : sites actifs, équipe en poste, visites du jour, **CA du jour/semaine, unités vendues, rapports soumis**
- CRUD des sites avec photos, coordonnées GPS, horaires et inventaire produits
- Gestion du personnel avec invitation par email et vérification d'adresse
- Affectations hôtesse ↔ site avec créneau horaire et historique
- Catalogue produits et prix par site
- Statistiques détaillées par site (visites, CA, taux de complétion, graphique 7j / 30j / 12 mois)
- Événements commerciaux : points de vente, packs promotionnels, hôtesses recrutées pour l'occasion, lancement puis clôture
- Rapports journaliers : par jour, qui a soumis, qui est en service, qui n'a pas pointé, et le détail de chaque rapport (ventes, notes, incidents)
- Ventes & objectifs : comparaison de périodes, évolution mois par mois, objectifs mensuels (entreprise, site, hôtesse), export Excel
- Tickets : réponse aux demandes des hôtesses et suivi de leur statut (ouvert → en cours → résolu)
- Export de toutes les données de l'entreprise (gérant uniquement)

### Inscription d'une entreprise

- Le gérant s'inscrit, puis dépose son dossier (pièce d'identité, document légal, logo)
- Le super administrateur valide ou rejette la demande ; un dossier rejeté peut être renvoyé
- Tant que l'entreprise n'est pas validée, le gérant n'accède qu'à son dossier

### Supervision (bot Telegram)

- Commandes `/status`, `/stats`, `/backup`, `/logs` réservées aux identifiants de `TELEGRAM_ALLOWED_IDS`
- Sauvegarde PostgreSQL chaque nuit à 02h00 dans `storage/backups` (10 dernières conservées)

### Côté hôtesse (terrain mobile)

- Prise de service avec capture GPS optionnelle
- Rapport journalier : saisie des ventes par compteur `+` / `−`, calcul automatique du stock résiduel et du CA
- Flux draft → relecture → soumission (verrouillé après soumission)
- Signalement d'incident post-soumission
- Stats personnelles du mois (visites, CA, unités vendues, rapports soumis)
- Tickets : demandes envoyées au responsable
- Objectif de chiffre d'affaires du mois, s'il a été fixé, avec sa progression
- Sans point de vente, un bandeau le lui indique sur toutes les pages

### Authentification

- Connexion par **email** ou **numéro de téléphone**
- Vérification d'email obligatoire pour les comptes invités
- Changement de mot de passe obligatoire à la première connexion
- Réinitialisation de mot de passe par email

---

## Installation locale

```bash
# 1. Cloner et installer les dépendances
git clone <repo-url> motriks
cd motriks
composer install
npm install

# 2. Configurer l'environnement
cp .env.example .env
php artisan key:generate

# 3. Renseigner la base de données dans .env
# DB_CONNECTION=pgsql
# DB_DATABASE=motriks
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
      Company/    — Dashboard, Sites, Personnel, Produits, Affectations, Rapports, Tickets, Events/
      Terrain/    — Home, Visit, DailyReport, Stats, Planning, Ventes, Tickets (interface hôtesse)
      Admin/      — Validation des inscriptions, documents
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
    events/               — Événements commerciaux
    reports/              — Rapports de ventes
    tickets/              — Demandes des hôtesses (côté responsable)
    terrain/              — Interface hôtesse (home, rapport, stats, tickets…)
    onboarding/, admin/   — Dossier d'inscription et sa validation
    landing.tsx           — Page publique
  components/
    landing/              — Footer, sections marketing
    page/                 — Page, Panel, StatusBadge, EmptyState
  lib/
    navigation.ts         — Menu par rôle

routes/
  web.php                 — Routes publiques, onboarding, administration, webhook Telegram
  company.php             — Back-office entreprise (gérant, superviseur, comptable)
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

À la soumission, les ventes sont retirées du stock **actuel** du site (`site_products.current_stock`),
et non remplacées par `closing_stock` : un réassort fait pendant la journée, ou les ventes d'une
autre hôtesse sur le même site, sont ainsi conservés.

---

## Variables d'environnement importantes

```env
APP_URL=http://localhost:8000
APP_TIMEZONE=Africa/Douala      # heure de Douala (UTC+1), utilisée pour toutes les dates
DB_CONNECTION=pgsql

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_ENCRYPTION=tls
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=...
MAIL_FROM_NAME="Motriks"

# Bot Telegram (facultatif) : sans secret ni liste d'identifiants, le webhook refuse tout
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...            # reçoit la sauvegarde et le rapport du matin
TELEGRAM_WEBHOOK_SECRET=...     # chaîne aléatoire, transmise à Telegram lors du setWebhook
TELEGRAM_ALLOWED_IDS=123,456    # identifiants Telegram autorisés à utiliser les commandes
```

---

## Déploiement

En production, la configuration et les routes sont mises en cache : après une mise à jour du code,
il faut reconstruire ces caches pour que les changements s'appliquent.

```bash
php artisan down
git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan config:cache       # avant migrate : la migration du fuseau horaire le vérifie
php artisan migrate --force
php artisan route:cache
php artisan up
```

La migration `convert_timestamps_to_douala_time` avance d'une heure les dates enregistrées en UTC
avant le passage à l'heure de Douala. Elle refuse de tourner si `app.timezone` n'est pas encore
`Africa/Douala`, d'où le `config:cache` placé avant.
