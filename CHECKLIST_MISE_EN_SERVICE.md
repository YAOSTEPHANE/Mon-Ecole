# Checklist de mise en service — École à jour

Document opérationnel pour **utiliser** l’application : d’abord en local, puis pour un établissement réel.

Complète `INSTALLATION.md`, `GUIDE_CONNEXION.md`, `GUIDE_UTILISATION.md` et `DEPLOY_VPS_HOSTINGER.md`.

---

## A. Usage local (développeur / démo)

Objectif : ouvrir `http://localhost:3000`, se connecter, parcourir tous les rôles.

### A1. Prérequis machine

- [ ] Node.js 18+ (`node -v`) — CI utilise Node 22
- [ ] npm (`npm -v`)
- [ ] MongoDB 6+ **démarré** en local **ou** cluster Atlas avec IP autorisée
- [ ] Git (déjà le cas si vous avez le projet)

### A2. Installation

Depuis la racine du projet :

```powershell
npm run install:all
```

- [ ] Dépendances root, `server/`, `web/` et `mobile/` installées sans erreur

### A3. Fichiers d’environnement

**Backend**

```powershell
cd server
Copy-Item env.template .env
```

Dans `server/.env`, au minimum :

```env
DATABASE_URL="mongodb://localhost:27017/school_manager"
JWT_SECRET="une-chaine-aleatoire-d-au-moins-32-caracteres"
JWT_EXPIRES_IN=12h
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000,http://localhost:3001
```

- [ ] `server/.env` créé
- [ ] `DATABASE_URL` pointe vers une base joignable
- [ ] `JWT_SECRET` renseigné (≥ 32 caractères)

**Frontend**

```powershell
cd web
Copy-Item .env.example .env.local
```

- [ ] `web/.env.local` contient `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

### A4. Base de données

```powershell
cd server
npm run prisma:generate
npm run prisma:push
```

- [ ] Client Prisma généré
- [ ] Schéma poussé vers MongoDB (collections créées)

### A5. Données de test (seed)

**Attention : le seed efface toute la base.** Ne jamais le lancer en production.

```powershell
npm run prisma:seed
```

Comptes (mot de passe commun : `password123`) :

| Rôle | Email | Espace |
| --- | --- | --- |
| Super-admin | `kouassistephane489@gmail.com` | `/super-admin` |
| Admin | `admin@school.com` | `/admin` |
| Enseignant | `teacher1@school.com` | `/teacher` |
| Élève | `student1@school.com` | `/student` |
| Parent | `parent1@school.com` | `/parent` |
| Éducateur | `educator1@school.com` | `/educator` |
| Secrétaire | `secretary@school.com` | `/staff` |
| Économe | `bursar@school.com` | `/staff` |
| Directeur des études | `studies@school.com` | `/staff` |
| Infirmier | `nurse@school.com` | `/staff` |
| Bibliothécaire | `librarian@school.com` | `/staff` |
| Comptable | `accountant@school.com` | `/staff` |

Sans seed, créer un admin :

```powershell
.\creer-compte-admin.ps1
```

- [ ] Seed exécuté **ou** premier admin créé
- [ ] Comptes vérifiés : `.\verifier-comptes.ps1`

### A6. Démarrage

Depuis la racine :

```powershell
npm run dev
```

- [ ] API : `http://localhost:5000/api/health` répond
- [ ] Front : `http://localhost:3000` s’ouvre
- [ ] Connexion `admin@school.com` / `password123` OK

### A7. Contrôles par rôle (local)

- [ ] Admin : tableau de bord, liste élèves, classes, paramètres
- [ ] Enseignant : notes / absences / devoirs
- [ ] Parent : enfant lié, notes, paiements
- [ ] Élève : notes, EDT, devoirs
- [ ] Éducateur : listes / discipline
- [ ] Staff (économe) : frais / encaissements
- [ ] Page publique : pré-inscription

### A8. Pièges locaux

| Symptôme | Cause fréquente |
| --- | --- |
| 503 à la connexion | MongoDB arrêté ou `DATABASE_URL` faux |
| Front sans données | `NEXT_PUBLIC_API_URL` manquant ou API non démarrée |
| Seed « tout a disparu » | Comportement normal : le seed vide la base |
| Reset mot de passe ne part pas | SMTP non configuré (normal en local) |
| Paiement « en attente » | Mode sandbox : confirmer à la main en admin |

---

## B. Premier établissement (données métier)

À faire **une fois** l’app accessible, avant d’ouvrir aux enseignants / parents.

Ordre important : identité → année → classes → personnes → pédagogie → finances → tests.

### B1. Identité de l’école

Connecté en **ADMIN** → Paramètres :

- [ ] Nom public de l’établissement
- [ ] Slogan / contacts (téléphone, e-mail, adresse)
- [ ] Logo navigation + logo page de connexion
- [ ] Images / textes de la page d’accueil
- [ ] Année scolaire active (ex. `2026-2027`)

### B2. Structure pédagogique

- [ ] Niveaux (6ème, 5ème, …)
- [ ] Classes rattachées aux niveaux
- [ ] Matières
- [ ] Cours : matière + classe + enseignant
- [ ] Emploi du temps (au moins une classe pilote)

### B3. Personnes

- [ ] Enseignants créés et liés à leurs cours
- [ ] Personnel (secrétariat, économe, éducateurs, etc.) + métiers
- [ ] Modules / droits attribués par rôle ou par admin
- [ ] Élèves inscrits dans les bonnes classes (matricules)
- [ ] Parents créés et **liés** aux enfants
- [ ] Comptes actifs ; mots de passe initiaux communiqués hors e-mail si SMTP absent

### B4. Scolarité au quotidien

- [ ] Une saisie de notes de test (enseignant)
- [ ] Un appel / une absence de test
- [ ] Un devoir publié, visible élève / parent
- [ ] Bulletin ou export consultable si le module est utilisé

### B5. Finances (même sans paiement en ligne)

- [ ] Catalogue de frais (scolarité, cantine, transport, etc.)
- [ ] Attribution des frais aux élèves / classes (`GUIDE_ATTRIBUER_FRAIS.md`)
- [ ] Un encaissement manuel (espèces) + reçu
- [ ] Parent voit le solde côté `/parent`

Sans clés PSP, les paiements en ligne restent en **sandbox** : l’admin confirme à la main.

### B6. Admissions & communication

- [ ] Pré-inscription publique testée de bout en bout
- [ ] Conversion d’une admission acceptée en élève
- [ ] Une annonce interne visible des parents
- [ ] Messagerie ou notification in-app OK

### B7. Recette minimale avant ouverture

- [ ] Un compte de chaque rôle se connecte et voit **ses** données seulement
- [ ] Changement d’établissement (si multi-écoles) ne mélange pas les listes
- [ ] Upload photo élève / logo s’affiche après rechargement
- [ ] Export CSV / PDF d’une liste élèves ou d’un reçu

---

## C. Production — établissement réel

Architecture recommandée : **VPS** (Nginx + PM2) + MongoDB Atlas.  
Vercel seul : pas de cron fiable, pas de Socket.IO, filesystem éphémère.

Suivre `DEPLOY_VPS_HOSTINGER.md` en cochant ci-dessous.

### C1. Obligatoire (l’API ne doit pas démarrer sans)

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` ≥ 32 caractères, unique, non commité
- [ ] `SENSITIVE_FIELD_ENCRYPTION_KEY` (chiffrement fiches élèves)
- [ ] `DATABASE_URL` Atlas (IP du VPS autorisée) **ou** Mongo local durci
- [ ] `FRONTEND_URL=https://votre-domaine.com` (sans slash final)
- [ ] `TRUST_PROXY=1` derrière Nginx
- [ ] HTTPS (Certbot) sur le domaine
- [ ] `web/.env.production` : `NEXT_PUBLIC_API_URL=/api`
- [ ] Dossier persistant `server/uploads`
- [ ] **Un seul worker** PM2 pour l’API (crons)

### C2. Fortement recommandé

- [ ] SMTP (reset MDP, relances, messages) — sans ça les parents ne récupèrent pas leur mot de passe
- [ ] `EMAIL_FROM` + `GDPR_CONTACT_EMAIL` / `NEXT_PUBLIC_PRIVACY_EMAIL`
- [ ] Backups Atlas **et/ou** `ENABLE_SCHEDULED_MONGODB_BACKUPS=true` (VPS, `mongodump` sur le PATH)
- [ ] Test de restauration (phrase `RESTAURER` en admin) sur une copie, jamais à l’aveugle
- [ ] Relances frais : `ENABLE_SCHEDULED_TUITION_REMINDERS=true` (SMTP d’abord)
- [ ] Rappels RDV : `ENABLE_SCHEDULED_APPOINTMENT_REMINDERS=true` si le module est utilisé
- [ ] Pare-feu : 22 / 80 / 443 seulement

### C3. Paiements live (sinon tout reste sandbox)

- [ ] Prestataire choisi (Wave, CinetPay, Paystack)
- [ ] Clés API en `server/.env` (`WAVE_API_KEY`, `CINETPAY_*`, `PAYSTACK_SECRET_KEY`, …)
- [ ] `PAYMENT_WEBHOOK_SECRET` + URL webhook HTTPS publique
- [ ] Un paiement **réel de 1 unité** testé : webhook reçu, solde élève mis à jour, reçu
- [ ] Orange / MTN : ne pas promettre un encaissement auto (USSD + confirmation manuelle)

Références : `GUIDE_PAIEMENT.md`, `DEPANNAGE_FRAIS_SCOLARITE.md`.

### C4. Notifications (optionnel mais utile)

- [ ] Web Push : clés VAPID (`npx web-push generate-vapid-keys`)
- [ ] SMS Twilio si relances / annonces urgentes
- [ ] WhatsApp Cloud API (token + `WHATSAPP_PHONE_NUMBER_ID`) — sinon sandbox
- [ ] `NOTIFY_PARENTS_ON_ATTENDANCE` si le pointage doit alerter les parents

### C5. Pointage / matériel

- [ ] `NFC_API_KEY` ≥ 32 caractères (en-tête `X-NFC-API-Key` uniquement)
- [ ] Terminaux NFC ou caméra configurés
- [ ] Test présence → fiche élève + notif parent si activée

### C6. Après déploiement — vérifs

```bash
curl -s https://votre-domaine.com/api/health
pm2 status
pm2 logs school-api --lines 50
```

- [ ] Santé API 200
- [ ] Login HTTPS, cookie de session posé
- [ ] Logos / uploads persistants après `pm2 restart`
- [ ] E-mail de reset reçu
- [ ] CORS OK (`FRONTEND_URL` = URL exacte du site)

### C7. Ne pas faire en production

- [ ] Ne **jamais** lancer `npm run prisma:seed`
- [ ] Ne pas utiliser les mots de passe `password123`
- [ ] Ne pas laisser l’inscription publique (`PUBLIC_ACCOUNT_REGISTRATION_ENABLED`) sauf besoin assumé
- [ ] Ne pas coller secrets dans Git / tickets / captures
- [ ] Ne pas scaler l’API à N workers tant que les crons tournent dans le même process

---

## D. Mobile (Expo) — périmètre actuel

L’app native est un **client léger** (login, notifications, assistant, profil).  
Pas de notes, absences, EDT ni paiements dans l’app : utiliser le **web**.

- [ ] `mobile/.env` : `EXPO_PUBLIC_API_URL` = IP LAN du PC (`http://192.168.x.x:5000/api`), pas `localhost` sur un téléphone physique
- [ ] API joignable depuis le téléphone (même Wi-Fi, pare-feu Windows)
- [ ] Login d’un compte seed ou réel OK

---

## E. Qualité / exploitation (après ouverture)

Non bloquant pour une première rentrée, à planifier :

- [ ] Sentry (`SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`)
- [ ] CI : ne plus ignorer le typecheck / lint web
- [ ] Compte admin dédié établissement (pas le super-admin perso)
- [ ] Politique de mot de passe + 2FA pour les admins
- [ ] Procédure RGPD (export / effacement) testée
- [ ] Calendrier de backup + un test de restore par trimestre
- [ ] Journal des incidents (paiement, connexion, uploads)

Hors périmètre actuel (ne pas attendre pour ouvrir) :

- LTI / SCORM (stub)
- App mobile métier complète
- Docker / compose

---

## Ordre de travail recommandé

1. **A** — Local + seed, 30–60 min si MongoDB est déjà là  
2. **B** — Paramétrer l’école pilote (ou garder le seed pour une démo)  
3. **C1 + C2** — VPS, HTTPS, SMTP, backups  
4. **C3** — Paiements seulement quand B5 est clair en manuel  
5. **C4–C5** — Push / SMS / NFC selon le besoin réel  
6. **E** — Durcissement une fois la rentrée lancée

En cas de blocage local : `DEBUG_CONNEXION.md` et `.\diagnostiquer-connexion.ps1`.
