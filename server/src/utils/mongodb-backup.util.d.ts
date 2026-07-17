export declare const BACKUP_FILE_PREFIX = "mongo-backup-";
export declare const BACKUP_FILE_SUFFIX = ".archive.gz";
export declare const SERVERLESS_MONGODB_BACKUP_MESSAGE = "Sauvegarde locale indisponible sur cet h\u00E9bergement (serverless). Utilisez les sauvegardes Atlas ou un serveur avec MongoDB Database Tools et un disque inscriptible.";
/** Vercel / Lambda : pas de mongodump ni de dossier persistant sous /var/task. */
export declare function isMongoBackupFilesystemWritable(): boolean;
export declare function getBackupDir(): string;
export type MongoBackupResult = {
    ok: true;
    archivePath: string;
    filename: string;
} | {
    ok: false;
    error: string;
};
export type MongoRestoreResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
export type MongoBackupListItem = {
    filename: string;
    size: number;
    createdAt: string;
};
export declare function isValidBackupFilename(name: string): boolean;
/** Chemin absolu d’une archive du dossier de sauvegarde (anti path traversal). */
export declare function resolveBackupArchivePath(filename: string): string | null;
export declare function listMongoBackups(): Promise<MongoBackupListItem[]>;
/**
 * Sauvegarde complète de la base pointée par DATABASE_URL (mongodump --gzip).
 * Nécessite l’outil en ligne de commande `mongodump` (MongoDB Database Tools).
 */
export declare function runMongoBackup(): Promise<MongoBackupResult>;
/**
 * Restaure une archive mongodump (--gzip). Remplace les collections existantes (--drop).
 */
export declare function runMongoRestore(archivePath: string): Promise<MongoRestoreResult>;
export declare function buildUploadedBackupFilename(): string;
//# sourceMappingURL=mongodb-backup.util.d.ts.map