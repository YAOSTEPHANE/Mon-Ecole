# Guide d'installation — École à jour

## Prérequis

- Node.js (v18 ou supérieur)
- MongoDB (v6 ou supérieur) - Local ou MongoDB Atlas (cloud)
- npm ou yarn

## Installation

### 1. Installer les dépendances

```bash
# Installer toutes les dépendances (root, server et web)
npm run install:all
```

Ou manuellement :

```bash
# Root
npm install

# Backend
cd server
npm install

# Frontend
cd ../web
npm install
```

### 2. Configuration de la base de données

#### Option A : MongoDB Local

1. Installer MongoDB sur votre machine (voir le [guide d’installation MongoDB](https://www.mongodb.com/docs/manual/installation/))

2. Démarrer MongoDB :
```bash
# Windows
mongod

# Linux/Mac
sudo systemctl start mongod
# ou
brew services start mongodb-community
```

#### Option B : MongoDB Atlas (Cloud - Recommandé)

1. Créer un compte gratuit sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créer un cluster gratuit
3. Obtenir la chaîne de connexion

2. Configurer les variables d'environnement :

**Sur Windows PowerShell :**
```powershell
cd server
Copy-Item env.template .env
```

**Sur Linux/Mac :**
```bash
cd server
cp env.template .env
```

3. Modifier le fichier `.env` avec vos paramètres :

**Pour MongoDB Local :**
```env
DATABASE_URL="mongodb://localhost:27017/school_manager"
JWT_SECRET="votre-secret-jwt-tres-securise"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
```

**Pour MongoDB Atlas :**
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/school_manager?retryWrites=true&w=majority"
JWT_SECRET="votre-secret-jwt-tres-securise"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
```

### 3. Initialiser la base de données

```bash
cd server

# Générer le client Prisma
npm run prisma:generate

# Pousser le schéma vers MongoDB (crée les collections automatiquement)
npm run prisma:push

# (Optionnel) Ouvrir Prisma Studio pour visualiser la base de données
npm run prisma:studio
```

**Note :** MongoDB avec Prisma utilise `db push` au lieu de migrations. Le schéma est directement synchronisé avec la base de données.

### 4. Démarrer l'application

#### Option 1 : Démarrer tout en même temps (recommandé)

```bash
# Depuis la racine du projet
npm run dev
```

#### Option 2 : Démarrer séparément

Terminal 1 - Backend :
```bash
cd server
npm run dev
```

Terminal 2 - Frontend :
```bash
cd web
npm run dev
```

### 5. Accéder à l'application

- Frontend : http://localhost:3000
- Backend API : http://localhost:5000
- Prisma Studio : http://localhost:5555 (si lancé)

## Création d'un compte administrateur

Pour créer le premier compte administrateur, vous pouvez :

1. Utiliser l'API directement :
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

2. Ou utiliser Prisma Studio pour insérer directement dans la base de données.

## Structure des rôles

- **ADMIN** : Accès complet à toutes les fonctionnalités
- **TEACHER** : Gestion des cours, notes, absences et devoirs
- **STUDENT** : Consultation de ses notes, emploi du temps, absences et devoirs
- **PARENT** : Suivi des enfants (notes, absences, emploi du temps)

## Commandes utiles

### Backend
```bash
cd server
npm run dev          # Démarrer en mode développement
npm run build        # Compiler TypeScript
npm run start        # Démarrer en production
npm run prisma:generate  # Régénérer le client Prisma
npm run prisma:push      # Synchroniser le schéma avec MongoDB
npm run prisma:studio    # Ouvrir Prisma Studio
```

### Frontend
```bash
cd web
npm run dev      # Démarrer en mode développement
npm run build    # Compiler pour la production
npm run start    # Démarrer le serveur de production (après build)
```

## Dépannage

### Erreur de connexion à la base de données
- **MongoDB Local** : Vérifiez que MongoDB est démarré (`mongod`)
- **MongoDB Atlas** : Vérifiez votre chaîne de connexion et que votre IP est autorisée dans Atlas
- Vérifiez les identifiants dans `.env`
- Testez la connexion avec MongoDB Compass ou `mongosh`

### Erreur "Module not found"
- Supprimez `node_modules` et réinstallez :
```bash
rm -rf node_modules
npm install
```

### Erreur Prisma
- Régénérez le client Prisma :
```bash
cd server
npm run prisma:generate
```

## Prochaines étapes

Checklist complète (local → établissement → production) : `CHECKLIST_MISE_EN_SERVICE.md`.

1. Créer des classes
2. Ajouter des enseignants
3. Créer des cours et les associer aux classes
4. Ajouter des élèves
5. Créer un emploi du temps
6. Commencer à saisir des notes et absences

