# Comptes de test — Motriks

URL locale : **http://localhost:8000**  
Page de connexion : **http://localhost:8000/login**

> Mot de passe universel : **`password`**  
> Gérants / superviseurs / comptables se connectent avec leur **e-mail**.  
> Les hôtesses se connectent avec leur **numéro de téléphone**.

---

## Comptes de développement principaux

### Responsable de l'entreprise (Company Admin)

| Champ        | Valeur                        |
|--------------|-------------------------------|
| Rôle         | `company_admin`               |
| E-mail       | franckdimitrio000@gmail.com   |
| Mot de passe | franckdimitrio000@gmail.com   |
| Entreprise   | Bennett Lynn Trading          |

### Hôtesse (Field Agent)

| Champ        | Valeur                        |
|--------------|-------------------------------|
| Rôle         | `field_agent`                 |
| E-mail       | franckdimitrio009@gmail.com   |
| Téléphone    | +237676383986 (ou 676383986) |
| Mot de passe | Lapersonne2020                |
| Entreprise   | Bennett Lynn Trading          |

> L'hôtesse peut se connecter soit avec son e-mail (`franckdimitrio009@gmail.com`), soit avec son numéro de téléphone (`676383986` ou `+237676383986`).

---

## Super Administrateur

| Champ    | Valeur              |
|----------|---------------------|
| Rôle     | `super_admin`       |
| E-mail   | admin@motriks.test   |
| Mot de passe | password        |

---

## Entreprise de démo — *Démo Distribution*

### Gérant (Company Admin)

| Champ    | Valeur              |
|----------|---------------------|
| Rôle     | `company_admin`     |
| E-mail   | gerant@demo.test    |
| Mot de passe | password        |

### Superviseur

| Champ    | Valeur                  |
|----------|-------------------------|
| Rôle     | `supervisor`            |
| E-mail   | superviseur@demo.test   |
| Mot de passe | password            |

### Comptable

| Champ    | Valeur                |
|----------|-----------------------|
| Rôle     | `accountant`          |
| E-mail   | comptable@demo.test   |
| Mot de passe | password          |

### Hôtesse (Field Agent)

| Champ      | Valeur           |
|------------|------------------|
| Rôle       | `field_agent`    |
| Téléphone  | +237690000001    |
| Mot de passe | password       |

> L'hôtesse n'a pas d'e-mail — elle se connecte avec son numéro de téléphone.

---

## Réinitialiser les données

```bash
php artisan migrate:fresh --seed
```
