# API présence journalière MENA (logiciel tiers)

Les pointeurs MENA restent branchés sur **leur logiciel de présence**. Mon Ecole importe ensuite le résultat **une fois par jour** (entrée établissement), sans remplacer les appels de cours.

## Association élève

Ordre de résolution de l’identifiant reçu :

1. `nationalMatricule` (matricule MENA / FNE)
2. `studentId` (n° élève établissement)
3. `biometricId` ou `nfcId`

## Canal webhook / API

Variable serveur :

```env
MENA_PRESENCE_WEBHOOK_SECRET=une-longue-cle-secrete
```

**POST** `/api/mena-presence/webhook`

Headers :

```
Content-Type: application/json
X-Mena-Presence-Secret: une-longue-cle-secrete
```

### Un élève

```json
{
  "matricule": "FNE123456",
  "date": "2026-07-28",
  "statut": "PRESENT",
  "checkInAt": "2026-07-28T08:05:00"
}
```

### Lot du jour

```json
{
  "date": "2026-07-28",
  "records": [
    { "matricule": "FNE123456", "statut": "PRESENT", "checkInAt": "08:05" },
    { "studentId": "STU001", "statut": "ABSENT" }
  ]
}
```

Réponse : `{ success, imported, updated, unmatched, errors, total }`.

## Canal CSV

Template admin : `GET /api/admin/mena-presence/csv-template`

Colonnes : `matricule,date,statut,heure_arrivee`

Import : `POST /api/admin/mena-presence/import-csv` avec body `{ "csv": "...", "date": "2026-07-28" }` (date optionnelle par défaut).

## Canal dossier / base

```env
ENABLE_SCHEDULED_MENA_PRESENCE_IMPORT=true
MENA_PRESENCE_IMPORT_CRON=15 18 * * *
MENA_PRESENCE_WATCH_DIR=C:/partage/mena-presence
# Optionnel Postgres :
# MENA_PRESENCE_DB_URL=postgresql://...
# MENA_PRESENCE_DB_QUERY=SELECT matricule, date, statut, check_in_at FROM presence_jour WHERE date = CURRENT_DATE
```

Les fichiers `.csv` / `.txt` du dossier sont importés puis déplacés vers `processed/`.

Déclenchement manuel admin : `POST /api/admin/mena-presence/run-scheduled`.

## Consultation

- Admin : `GET /api/admin/mena-presence/day?date=2026-07-28`
- Élève : `GET /api/student/daily-presence`
- Parent : `GET /api/parent/children/:studentId/daily-presence`
