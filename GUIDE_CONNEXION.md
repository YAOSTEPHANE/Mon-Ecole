# Guide de connexion — École à jour

## 🚀 Démarrage Rapide

### 1. Démarrer l'application

Assurez-vous que le serveur backend et le frontend sont démarrés :

```powershell
# Depuis la racine du projet
npm run dev
```

Ou séparément :

**Terminal 1 - Backend :**
```powershell
cd server
npm run dev
```

**Terminal 2 - Frontend :**
```powershell
cd web
npm run dev
```

### 2. Accéder à l'interface

Ouvrez votre navigateur et allez sur :
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:5000

## 📝 Créer un compte

### Méthode 1 : Script PowerShell (RECOMMANDÉ - Le plus simple)

Utilisez le script PowerShell fourni pour créer facilement un compte :

```powershell
# Depuis la racine du projet
.\creer-compte-admin.ps1
```

Le script vous guidera étape par étape pour créer votre compte administrateur.

### Méthode 2 : Vérifier les comptes existants

Si vous avez exécuté le seed, vous pouvez vérifier les comptes existants :

```powershell
.\verifier-comptes.ps1
```

Cela testera les comptes par défaut créés par le seed.

### Méthode 3 : Via l'API (Manuel)

Utilisez PowerShell, curl ou Postman pour créer votre premier compte administrateur :

```powershell
# Créer un compte ADMIN
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "email": "admin@school.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  }'
```

**Ou avec curl (si installé) :**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  }'
```

### Méthode 2 : Via l'interface web (si une page d'inscription existe)

Pour l'instant, l'interface ne propose que la connexion. Utilisez la méthode API pour créer des comptes.

## 🔐 Se connecter

### Via l'interface web

1. Ouvrez http://localhost:3000 dans votre navigateur
2. Vous verrez la page de connexion
3. Entrez vos identifiants :
   - **Email** : L'email que vous avez utilisé lors de l'inscription
   - **Mot de passe** : Votre mot de passe
4. Cliquez sur "Se connecter"

### Via l'API (pour tester)

```powershell
# Se connecter
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "email": "admin@school.com",
    "password": "admin123"
  }'

# Le token sera dans $response.token
Write-Host "Token: $($response.token)"
```

## 👥 Rôles disponibles

Lors de la création d'un compte, vous pouvez choisir parmi ces rôles :

- **ADMIN** : Accès complet (gestion des élèves, classes, enseignants, statistiques)
- **TEACHER** : Gestion des cours, notes, absences et devoirs
- **STUDENT** : Consultation de ses notes, emploi du temps, absences et devoirs
- **PARENT** : Suivi des enfants (notes, absences, emploi du temps)

## 📍 Redirections après connexion

Après une connexion réussie, vous serez automatiquement redirigé vers :

- **ADMIN** → `/admin` (Tableau de bord administrateur)
- **TEACHER** → `/teacher` (Tableau de bord enseignant)
- **STUDENT** → `/student` (Espace élève)
- **PARENT** → `/parent` (Espace parent)

## 🔧 Exemples de comptes de test

### Créer un compte ADMIN
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "email": "admin@school.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  }'
```

**⚠️ IMPORTANT :** Si vous avez exécuté le seed (`npm run prisma:seed`), les comptes par défaut utilisent le mot de passe `password123` (pas `admin123`).

Comptes du seed :
- **Admin** : `admin@school.com` / `password123`
- **Enseignant** : `teacher1@school.com` / `password123`
- **Élève** : `student1@school.com` / `password123`
- **Parent** : `parent1@school.com` / `password123`

### Créer un compte ENSEIGNANT
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "email": "teacher@school.com",
    "password": "teacher123",
    "firstName": "Jean",
    "lastName": "Dupont",
    "role": "TEACHER"
  }'
```

### Créer un compte ÉLÈVE
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "email": "student@school.com",
    "password": "student123",
    "firstName": "Marie",
    "lastName": "Martin",
    "role": "STUDENT"
  }'
```

### Créer un compte PARENT
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "email": "parent@school.com",
    "password": "parent123",
    "firstName": "Pierre",
    "lastName": "Durand",
    "role": "PARENT"
  }'
```

## 🛠️ Dépannage

### Erreur "Identifiants invalides"
- Vérifiez que vous avez bien créé le compte
- Vérifiez l'email et le mot de passe (attention aux majuscules/minuscules)
- Assurez-vous que le serveur backend est démarré
- Vérifiez que l'utilisateur est actif (`isActive: true`)

### Erreur de connexion au serveur
- Vérifiez que le backend tourne sur le port 5000
- Vérifiez les logs du serveur pour plus de détails
- Vérifiez que MongoDB est connecté et accessible
- Testez l'API directement : `http://localhost:5000/api/auth/login`

### Le token n'est pas sauvegardé
- Vérifiez que les cookies/localStorage sont activés dans votre navigateur
- Essayez en navigation privée pour tester
- Vérifiez la console du navigateur (F12) pour les erreurs

### Problème de connexion - Checklist complète

1. **Vérifier que le serveur backend est démarré :**
   ```powershell
   # Le serveur doit afficher quelque chose comme :
   # Server running on port 5000
   ```

2. **Vérifier que MongoDB est connecté :**
   ```powershell
   # Vérifiez les logs du serveur pour des erreurs de connexion MongoDB
   ```

3. **Tester l'API directement :**
   ```powershell
   # Test de connexion
   $body = @{
       email = "admin@school.com"
       password = "admin123"
   } | ConvertTo-Json
   
   try {
       $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
           -Method POST `
           -ContentType "application/json" `
           -Body $body
       Write-Host "Connexion réussie! Token: $($response.token.Substring(0, 20))..."
   } catch {
       Write-Host "Erreur: $($_.Exception.Message)"
       Write-Host "Détails: $($_.ErrorDetails.Message)"
   }
   ```

4. **Vérifier la console du navigateur (F12) :**
   - Onglet Console : cherchez les erreurs en rouge
   - Onglet Network : vérifiez que la requête vers `/api/auth/login` est bien envoyée
   - Vérifiez le statut de la réponse (200 = OK, 401 = non autorisé, 500 = erreur serveur)

5. **Vérifier les variables d'environnement :**
   - Le fichier `server/.env` doit exister
   - `DATABASE_URL` doit être correctement configuré
   - `JWT_SECRET` doit être défini

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs du serveur backend
2. Vérifiez la console du navigateur (F12)
3. Assurez-vous que MongoDB est connecté et accessible

