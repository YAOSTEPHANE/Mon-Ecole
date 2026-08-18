# Déploiement sur VPS Hostinger — École à jour

Guide pour héberger **Next.js (web)** + **Express (server)** + **MongoDB** sur un VPS Hostinger (Ubuntu).

## Architecture

```
Internet → Nginx (443) → /        → Next.js :3000
                      → /api/*   → Express :5000
                      → /uploads → Express :5000
```

Un seul domaine HTTPS ; le front appelle l’API en relatif (`/api`).

## 1. Préparer le VPS Hostinger

1. Créer un VPS Ubuntu 22.04/24.04 dans hPanel.
2. Noter l’**IP publique**.
3. Pointer le **DNS** de votre domaine vers cette IP (enregistrement **A** `@` et éventuellement `www`).
4. Se connecter en SSH :
   ```bash
   ssh root@VOTRE_IP
   ```

### Dépendances système

Depuis la racine du projet (après clone) :

```bash
sudo bash deploy/setup-vps.sh
```

Le script installe Node.js 20, Nginx, Certbot, PM2, UFW et (si possible) les outils MongoDB pour les sauvegardes.

## 2. MongoDB

### Option A — MongoDB Atlas (recommandé)

- Créer un cluster gratuit sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
- Autoriser l’IP du VPS dans **Network Access**.
- Utiliser la chaîne `mongodb+srv://...` dans `server/.env`.

### Option B — MongoDB sur le VPS

```bash
# Ubuntu — voir la doc officielle MongoDB 7 pour votre version
sudo apt-get install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
```

`DATABASE_URL="mongodb://127.0.0.1:27017/school_manager"`

## 3. Déployer le code

```bash
sudo mkdir -p /var/www
sudo chown "$USER":"$USER" /var/www
cd /var/www
git clone VOTRE_REPO_URL school-manager
cd school-manager
```

### Variables d’environnement

```bash
cp server/env.template server/.env
cp deploy/env.production.example deploy/env.production.reference
# Éditer server/.env — voir deploy/env.production.example

cat > web/.env.production << 'EOF'
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_DISABLE_UPLOADS_REWRITE=1
EOF
```

**Important en production :**

- `JWT_SECRET` : longue chaîne aléatoire unique.
- `FRONTEND_URL=https://votre-domaine.com` (sans slash final).
- `TRUST_PROXY=1` derrière Nginx.
- `NODE_ENV=production` sur le serveur API.

### Build et base de données

```bash
npm run install:all
cd server && npm run prisma:generate && npm run prisma:push && cd ..
npm run build
```

Créer le dossier uploads persistant :

```bash
mkdir -p server/uploads
```

### Premier administrateur (optionnel)

```bash
cd server && npm run prisma:seed
# ou POST /api/auth/register selon votre seed
```

## 4. PM2 (processus)

Depuis la racine du projet :

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 status
pm2 save
pm2 startup   # suivre la commande affichée pour démarrage au boot
```

**Un seul worker API** : les tâches planifiées (sauvegardes, relances) ne doivent pas tourner en double.

## 5. Nginx

```bash
sudo cp deploy/nginx-school-manager.conf /etc/nginx/sites-available/school-manager
sudo sed -i 's/VOTRE_DOMAINE/votre-domaine.com/g' /etc/nginx/sites-available/school-manager
sudo ln -sf /etc/nginx/sites-available/school-manager /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

Renouvellement automatique : géré par certbot (timer systemd).

## 7. Pare-feu Hostinger + UFW

- Dans **hPanel → VPS → Firewall** : autoriser 22, 80, 443.
- UFW est configuré par `setup-vps.sh` (SSH + Nginx).

## 8. Mises à jour

```bash
cd /var/www/school-manager
git pull
npm run install:all
cd server && npm run prisma:generate && npm run prisma:push && cd ..
npm run build
pm2 restart all
```

## 9. Vérifications

```bash
curl -s http://127.0.0.1:5000/api/health
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000
curl -s https://votre-domaine.com/api/health
```

Ouvrir `https://votre-domaine.com` dans le navigateur et tester la connexion.

## 10. Dépannage

| Problème | Piste |
|----------|--------|
| 502 Bad Gateway | `pm2 logs` — API ou Next arrêté |
| CORS / login échoue | `FRONTEND_URL` doit être exactement `https://votre-domaine.com` |
| Images /uploads 404 | Nginx route `/uploads/` vers l’API ; vérifier `server/uploads` |
| MongoDB | Atlas : IP VPS autorisée ; local : `systemctl status mongod` |
| E-mails | SMTP Hostinger : `smtp.hostinger.com`, port 587 |

Logs :

```bash
pm2 logs school-api
pm2 logs school-web
sudo tail -f /var/log/nginx/error.log
```

## Fichiers utiles

- `deploy/ecosystem.config.cjs` — PM2
- `deploy/nginx-school-manager.conf` — reverse proxy
- `deploy/setup-vps.sh` — bootstrap VPS
- `deploy/env.production.example` — modèle des variables
