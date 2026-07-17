# App native Expo (Android / iOS) — client de l’API `server/`

## Prérequis

- Node 20+
- API démarrée : `cd server && npm run dev` (port 5000)
- Expo Go sur téléphone, ou emulateur Android / simulateur iOS

## Démarrage

```bash
cd mobile
npm start
```

Puis :

- `a` → Android
- `i` → iOS (macOS)
- QR code → Expo Go

## Configuration API

Créer `mobile/.env` (ou variables Expo) :

```
EXPO_PUBLIC_API_URL=http://VOTRE_IP_LAN:5000/api
```

Sans variable :

- Android emulateur → `http://10.0.2.2:5000/api`
- iOS simulateur → `http://localhost:5000/api`

## Fonctionnalités

- Connexion e-mail / mot de passe (+ 2FA si activé)
- SSO Google / Microsoft (`?client=mobile` → deep link `ecoleajour://oauth`)
- Notifications in-app + Socket.IO temps réel
- Assistant pédagogique (rôles admin / enseignant / éducateur / staff)
- Profil + déconnexion

## SSO serveur

Dans `server/.env` :

```
MOBILE_OAUTH_REDIRECT_URI=ecoleajour://oauth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Les boutons SSO n’apparaissent que si les clés sont configurées.
