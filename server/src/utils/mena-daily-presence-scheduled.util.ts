import fs from 'fs';
import path from 'path';
import {
  importMenaDailyPresenceRows,
  parseMenaPresenceCsv,
  type MenaPresenceImportReport,
} from './mena-daily-presence-import.util';

export type ScheduledMenaPresenceResult = {
  fileReports: Array<{ file: string; report: MenaPresenceImportReport }>;
  dbReport: MenaPresenceImportReport | null;
  skippedReason?: string;
};

async function importFromWatchDir(): Promise<
  Array<{ file: string; report: MenaPresenceImportReport }>
> {
  const dir = process.env.MENA_PRESENCE_WATCH_DIR?.trim();
  if (!dir) return [];

  if (!fs.existsSync(dir)) {
    console.warn(`[MENA présence] Dossier inexistant: ${dir}`);
    return [];
  }

  const processedDir = path.join(dir, 'processed');
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(csv|txt)$/i.test(f))
    .map((f) => path.join(dir, f));

  const out: Array<{ file: string; report: MenaPresenceImportReport }> = [];

  for (const filePath of files) {
    try {
      const csv = fs.readFileSync(filePath, 'utf8');
      const rows = parseMenaPresenceCsv(csv);
      const report = await importMenaDailyPresenceRows(rows, 'MENA_FILE');
      out.push({ file: path.basename(filePath), report });

      const dest = path.join(processedDir, `${Date.now()}-${path.basename(filePath)}`);
      fs.renameSync(filePath, dest);
    } catch (e) {
      console.error(`[MENA présence] Échec fichier ${filePath}:`, e);
      out.push({
        file: path.basename(filePath),
        report: {
          imported: 0,
          updated: 0,
          unmatched: [],
          errors: [{ externalId: '', error: e instanceof Error ? e.message : 'Erreur fichier' }],
          total: 0,
        },
      });
    }
  }

  return out;
}

/**
 * Import optionnel depuis une DB externe via requête SQL texte.
 * MENA_PRESENCE_DB_URL + MENA_PRESENCE_DB_QUERY (colonnes: matricule/external_id, date, statut, check_in_at).
 * Nécessite le package `pg` si URL postgres — sinon on journalise et on skip.
 */
async function importFromExternalDb(): Promise<MenaPresenceImportReport | null> {
  const dbUrl = process.env.MENA_PRESENCE_DB_URL?.trim();
  const query = process.env.MENA_PRESENCE_DB_QUERY?.trim();
  if (!dbUrl || !query) return null;

  try {
    // Dynamic require to avoid hard dependency when unused
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('pg') as {
      Client: new (cfg: { connectionString: string }) => {
        connect: () => Promise<void>;
        query: (q: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
        end: () => Promise<void>;
      };
    };

    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
      const result = await client.query(query);
      const rows = result.rows.map((r) => ({
        externalId: String(
          r.matricule ?? r.national_matricule ?? r.student_id ?? r.external_id ?? r.id ?? '',
        ),
        date: (r.date as string | Date | undefined) ?? undefined,
        status: r.statut != null ? String(r.statut) : r.status != null ? String(r.status) : undefined,
        checkInAt:
          (r.check_in_at as string | Date | undefined) ??
          (r.checkinat as string | Date | undefined) ??
          (r.heure_arrivee as string | undefined) ??
          null,
        rawPayload: r as object,
      }));
      return importMenaDailyPresenceRows(rows, 'MENA_DB');
    } finally {
      await client.end();
    }
  } catch (e) {
    console.error('[MENA présence] Import DB impossible (installez `pg` si Postgres) :', e);
    return {
      imported: 0,
      updated: 0,
      unmatched: [],
      errors: [{ externalId: '', error: e instanceof Error ? e.message : 'Erreur DB' }],
      total: 0,
    };
  }
}

export async function runMenaPresenceScheduledImport(): Promise<ScheduledMenaPresenceResult> {
  const hasDir = Boolean(process.env.MENA_PRESENCE_WATCH_DIR?.trim());
  const hasDb = Boolean(
    process.env.MENA_PRESENCE_DB_URL?.trim() && process.env.MENA_PRESENCE_DB_QUERY?.trim(),
  );

  if (!hasDir && !hasDb) {
    return {
      fileReports: [],
      dbReport: null,
      skippedReason: 'Aucun MENA_PRESENCE_WATCH_DIR ni MENA_PRESENCE_DB_URL/QUERY configuré',
    };
  }

  const fileReports = hasDir ? await importFromWatchDir() : [];
  const dbReport = hasDb ? await importFromExternalDb() : null;
  return { fileReports, dbReport };
}
