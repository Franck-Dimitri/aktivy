# 🚀 Sprint 1 : Périmètres & Guide d'Équipe — Aktivy

Ce document définit la répartition des rôles, les branches Git et le périmètre fonctionnel des **3 développeurs** pour le **Sprint 1 (Fondations & Socle MVP)**, conformément au **Cahier des charges fonctionnel et technique (v2.1)**.

---

## 🌿 1. Règles & Organisation Git

* **Branche de production :** `main` (aucun push direct).
* **Branche d'intégration du Sprint :** `develop` (toutes les PR pointent vers cette branche).
* **Chaque développeur travaille sur sa propre branche `feature/...`**.
* **Workflow :** `git pull` ➔ travail sur la branche ➔ `git push` ➔ Pull Request vers `develop` validée par au moins un collègue.

---

## 👤 2. Développeur 1 : Onboarding, Authentification & Sécurité

* **Branche Git :** `feature/onboarding-and-auth`
* **Périmètre fonctionnel :** **FN-01, FN-02, FN-03**
* **Objectif :** Poser la porte d'entrée de la plateforme, l'inscription des entreprises et la gestion des accès.

### 📋 Tâches détaillées :
1. **Onboarding Entreprise (FN-02)** :
   * Formulaire d'inscription d'une nouvelle entreprise cliente (`Company` : nom, logo, couleur principale, téléphone, email).
   * Création automatique du premier compte Administrateur d'entreprise.
2. **Authentification complète (FN-01)** :
   * Connexion (`Login`), déconnexion (`Logout`), persistance de session et mot de passe oublié.
3. **Gestion des 5 Rôles (FN-03)** :
   * Configuration des profils :
     1. `super_admin` (Éditeur plateforme)
     2. `company_admin` (Gérant / Administrateur client)
     3. `supervisor` (Responsable d'équipe / Superviseur)
     4. `field_agent` (Hôtesse / Agent terrain sur smartphone)
     5. `accountant` (Comptable / Lecteur rapports)
4. **Redirections intelligentes après connexion** :
   * Si `field_agent` ➔ Redirection automatique vers l'interface mobile terrain (`/terrain`).
   * Si `company_admin` ou `supervisor` ➔ Redirection vers le tableau de bord web (`/dashboard`).
   * Si `super_admin` ➔ Redirection vers l'espace d'administration globale (`/admin`).
5. **Isolation des données (Multi-tenancy)** :
   * Middleware / Trait Eloquent `BelongsToCompany` garantissant qu'aucune entreprise ne peut voir les données d'une autre.

---

## 👤 3. Développeur 2 : Points de Vente, Hôtesses & Affectations

* **Branche Git :** `feature/sites-and-personnel`
* **Périmètre fonctionnel :** **FN-04, FN-05**
* **Objectif :** Créer le carnet d'adresses opérationnel de l'entreprise (les lieux et les personnes).

### 📋 Tâches détaillées :
1. **Gestion des Points de Vente / Sites (FN-05)** :
   * CRUD des sites : nom du lieu (ex: *Carrefour Almadies*, *Auchan Mermoz*), code site, ville, adresse, coordonnées GPS (latitude/longitude), contact sur place.
   * Statut actif/inactif du site.
2. **Gestion des Hôtesses & Agents de terrain (FN-04)** :
   * Fiches complètes : nom, prénom, numéro de téléphone, numéro de pièce d'identité, photo/avatar.
   * Statuts : Actif, Inactif, Archivé (archivage logique : pas de suppression définitive pour conserver l'historique).
3. **Module d'Affectations (FN-05)** :
   * Interface permettant au superviseur d'affecter une hôtesse à un site précis :
     * Date de début et date de fin.
     * Créneau horaire / Shift (Matin, Soir, Journée entière).
   * Historique complet des affectations passées et en cours.
4. **Interfaces Superviseur (React + Inertia)** :
   * Tableau de bord liste des sites et fiches hôtesses avec recherche et filtres.

---

## 👤 4. Développeur 3 : Cœur Terrain, Saisie Rapide & Clôture

* **Branche Git :** `feature/field-reporting-daily`
* **Périmètre fonctionnel :** **FN-07, FN-08, FN-09, FN-10**
* **Objectif :** Créer la journée de travail de l'hôtesse sur smartphone (ultra-rapide, zéro calcul, pensée pour le terrain).

### 📋 Tâches détaillées :
1. **Prise de service mobile (FN-07)** :
   * Vue mobile : l'hôtesse voit directement son site actif du jour (*« Vous êtes affectée à Carrefour Dakar »*).
   * Bouton de prise de poste avec confirmation.
2. **Saisie rapide en moins de 2 minutes (FN-07)** :
   * Compteurs tactiles ergonomiques `+` et `-` pour saisir les ventes d'articles sans avoir à taper au clavier.
   * Contrôles de cohérence bloquants (refus d'une saisie impossible).
3. **Calculs automatiques en temps réel (FN-08)** :
   * Déduction automatique des totaux : quantités vendues, montants encaissés, stock restant déduit du stock d'ouverture.
   * Zéro calcul à la main pour l'hôtesse.
4. **Clôture journalière & Justification des écarts (FN-09)** :
   * Écran de fin de journée récapitulant les ventes et l'argent liquide attendu.
   * Si un écart est constaté : champ obligatoire de **motif de justification**.
   * Validation finale de clôture envoyée au superviseur.
5. **Préparation du Mode Hors-Ligne (FN-10)** :
   * Conservation des saisies en local si la connexion internet est coupée dans le magasin, et synchronisation automatique au retour du réseau.

---

## 🛠️ 5. Démarrage Rapide pour l'Équipe

Chaque développeur récupère le projet à jour et se place sur sa branche :

```bash
# 1. Récupérer toutes les branches créées sur GitHub
git pull

# 2. Se placer sur sa branche respective :
# Développeur 1 :
git checkout feature/onboarding-and-auth

# Développeur 2 :
git checkout feature/sites-and-personnel

# Développeur 3 :
git checkout feature/field-reporting-daily
```

---

## 🔄 6. Synthèse des Livrables du Sprint

| Développeur | Branche | Écrans Clés Livrés |
| :--- | :--- | :--- |
| **Dev 1** | `feature/onboarding-and-auth` | Inscription entreprise, Login, redirection par rôle, isolation tenant. |
| **Dev 2** | `feature/sites-and-personnel` | Annuaire des magasins/sites, fiches hôtesses RH, module d'affectation. |
| **Dev 3** | `feature/field-reporting-daily` | Interface mobile hôtesse, compteurs `+ / -`, calculs automatiques, clôture journalière. |
