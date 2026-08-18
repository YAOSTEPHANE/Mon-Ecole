# Variables d’environnement — production (Vercel ou VPS)

Si **`https://collegetranlefet.com/api/health`** ou **`/api/auth/login`** renvoient **500**, l’API ne démarre pas ou la base est injoignable. Vérifiez les points ci-dessous.

## Service API (`server`) — obligatoire

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB Atlas ou instance locale (`mongodb+srv://…` ou `mongodb://…`) |
| `JWT_SECRET` | Chaîne aléatoire **≥ 32 caractères** (unique, jamais la valeur dev) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://collegetranlefet.com` (sans slash final) |

## Service API — recommandé

| Variable | Description |
|----------|-------------|
| `SENSITIVE_FIELD_ENCRYPTION_KEY` | Chiffrement adresse / urgence / santé élève |
| `NFC_API_KEY` | Terminaux NFC / reconnaissance faciale (≥ 32 car.) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (uploads persistants) — lier un store Blob au projet |
| `TRUST_PROXY` | `1` sur VPS derrière Nginx |

## Front (`web`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `/api` (même domaine) ou URL absolue de l’API |

## Vercel (experimentalServices)

1. **Project → Settings → Environment Variables** : ajouter les variables ci-dessus sur le service **`api`** (pas seulement `web`).
2. **Storage → Blob** : connecter au projet pour les uploads.
3. **MongoDB Atlas** : autoriser `0.0.0.0/0` ou les IP Vercel dans Network Access.
4. Redéployer après toute modification d’env.

## VPS Hostinger

Voir [DEPLOY_VPS_HOSTINGER.md](./DEPLOY_VPS_HOSTINGER.md). Après mise à jour de `server/.env` :

```bash
pm2 restart school-api
pm2 logs school-api --lines 50
```

Les logs doivent afficher `Server running on port 5000`. Si le processus redémarre en boucle, cherchez `JWT_SECRET` ou `DATABASE_URL` dans les erreurs.

## Test rapide

```bash
curl -s https://collegetranlefet.com/api/health
# Attendu : {"status":"OK","message":"API École à jour opérationnelle"}
```
