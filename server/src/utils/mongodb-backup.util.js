"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVERLESS_MONGODB_BACKUP_MESSAGE = exports.BACKUP_FILE_SUFFIX = exports.BACKUP_FILE_PREFIX = void 0;
exports.isMongoBackupFilesystemWritable = isMongoBackupFilesystemWritable;
exports.getBackupDir = getBackupDir;
exports.isValidBackupFilename = isValidBackupFilename;
exports.resolveBackupArchivePath = resolveBackupArchivePath;
exports.listMongoBackups = listMongoBackups;
exports.runMongoBackup = runMongoBackup;
exports.runMongoRestore = runMongoRestore;
exports.buildUploadedBackupFilename = buildUploadedBackupFilename;
const node_child_process_1 = require("node:child_process");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
exports.BACKUP_FILE_PREFIX = 'mongo-backup-';
exports.BACKUP_FILE_SUFFIX = '.archive.gz';
const UPLOAD_BACKUP_PREFIX = 'mongo-backup-upload-';
exports.SERVERLESS_MONGODB_BACKUP_MESSAGE = 'Sauvegarde locale indisponible sur cet hébergement (serverless). Utilisez les sauvegardes Atlas ou un serveur avec MongoDB Database Tools et un disque inscriptible.';
/** Vercel / Lambda : pas de mongodump ni de dossier persistant sous /var/task. */
function isMongoBackupFilesystemWritable() {
    if (process.env.VERCEL === '1')
        return false;
    if (process.env.AWS_LAMBDA_FUNCTION_NAME)
        return false;
    if (process.env.LAMBDA_TASK_ROOT)
        return false;
    const cwd = process.cwd();
    if (cwd === '/var/task' || cwd.startsWith('/var/task/'))
        return false;
    return true;
}
function getBackupDir() {
    const raw = process.env.MONGODB_BACKUP_DIR?.trim();
    if (raw) {
        return node_path_1.default.isAbsolute(raw) ? raw : node_path_1.default.resolve(process.cwd(), raw);
    }
    if (!isMongoBackupFilesystemWritable()) {
        return node_path_1.default.join('/tmp', 'school-manager-mongodb-backups');
    }
    return node_path_1.default.resolve(process.cwd(), 'backups', 'mongodb');
}
async function ensureBackupDir() {
    if (!isMongoBackupFilesystemWritable()) {
        return { ok: false, error: exports.SERVERLESS_MONGODB_BACKUP_MESSAGE };
    }
    const dir = getBackupDir();
    try {
        await promises_1.default.mkdir(dir, { recursive: true });
        return { ok: true, dir };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false, error: message };
    }
}
function getRetentionDays() {
    const n = Number.parseInt(process.env.MONGODB_BACKUP_RETENTION_DAYS ?? '14', 10);
    return Number.isFinite(n) && n >= 1 ? n : 14;
}
async function pruneOldBackups(backupDir, retentionDays) {
    const names = await promises_1.default.readdir(backupDir).catch(() => []);
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    for (const name of names) {
        if (!name.startsWith(exports.BACKUP_FILE_PREFIX) || !name.endsWith(exports.BACKUP_FILE_SUFFIX))
            continue;
        const full = node_path_1.default.join(backupDir, name);
        const st = await promises_1.default.stat(full).catch(() => null);
        if (st && st.mtimeMs < cutoff) {
            await promises_1.default.unlink(full).catch(() => { });
        }
    }
}
function runMongodump(uri, archivePath) {
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)('mongodump', [`--uri=${uri}`, `--archive=${archivePath}`, '--gzip'], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stderr = '';
        child.stderr?.on('data', (chunk) => {
            stderr += chunk.toString('utf8');
        });
        child.on('error', (err) => {
            if (err.code === 'ENOENT') {
                reject(new Error('mongodump introuvable. Installez MongoDB Database Tools (mongodump) et ajoutez-le au PATH.'));
                return;
            }
            reject(err);
        });
        child.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`mongodump a quitté avec le code ${code}. ${stderr.trim()}`));
        });
    });
}
function isValidBackupFilename(name) {
    if (!name || typeof name !== 'string')
        return false;
    return (name.startsWith(exports.BACKUP_FILE_PREFIX) || name.startsWith(UPLOAD_BACKUP_PREFIX)) &&
        name.endsWith(exports.BACKUP_FILE_SUFFIX) &&
        !name.includes('..') &&
        !name.includes('/') &&
        !name.includes('\\') &&
        !name.includes('\0');
}
/** Chemin absolu d’une archive du dossier de sauvegarde (anti path traversal). */
function resolveBackupArchivePath(filename) {
    if (!isValidBackupFilename(filename))
        return null;
    const backupDir = node_path_1.default.normalize(getBackupDir());
    const full = node_path_1.default.normalize(node_path_1.default.join(backupDir, filename));
    if (!full.startsWith(backupDir + node_path_1.default.sep) && full !== backupDir)
        return null;
    return full;
}
async function listMongoBackups() {
    if (!isMongoBackupFilesystemWritable())
        return [];
    const backupDir = getBackupDir();
    const names = await promises_1.default.readdir(backupDir).catch(() => []);
    const items = [];
    for (const name of names) {
        if (!isValidBackupFilename(name))
            continue;
        const full = node_path_1.default.join(backupDir, name);
        const st = await promises_1.default.stat(full).catch(() => null);
        if (!st?.isFile())
            continue;
        items.push({
            filename: name,
            size: st.size,
            createdAt: st.mtime.toISOString(),
        });
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
}
function runMongorestore(uri, archivePath, drop) {
    return new Promise((resolve, reject) => {
        const args = [`--uri=${uri}`, `--archive=${archivePath}`, '--gzip'];
        if (drop)
            args.push('--drop');
        const child = (0, node_child_process_1.spawn)('mongorestore', args, {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stderr = '';
        child.stderr?.on('data', (chunk) => {
            stderr += chunk.toString('utf8');
        });
        child.on('error', (err) => {
            if (err.code === 'ENOENT') {
                reject(new Error('mongorestore introuvable. Installez MongoDB Database Tools (mongorestore) et ajoutez-le au PATH.'));
                return;
            }
            reject(err);
        });
        child.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`mongorestore a quitté avec le code ${code}. ${stderr.trim()}`));
        });
    });
}
/**
 * Sauvegarde complète de la base pointée par DATABASE_URL (mongodump --gzip).
 * Nécessite l’outil en ligne de commande `mongodump` (MongoDB Database Tools).
 */
async function runMongoBackup() {
    const uri = process.env.DATABASE_URL?.trim();
    if (!uri) {
        return { ok: false, error: 'DATABASE_URL est absent.' };
    }
    const ensured = await ensureBackupDir();
    if (!ensured.ok) {
        return { ok: false, error: ensured.error };
    }
    const backupDir = ensured.dir;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${exports.BACKUP_FILE_PREFIX}${stamp}${exports.BACKUP_FILE_SUFFIX}`;
    const archivePath = node_path_1.default.join(backupDir, filename);
    try {
        await runMongodump(uri, archivePath);
        await pruneOldBackups(backupDir, getRetentionDays());
        return { ok: true, archivePath, filename };
    }
    catch (e) {
        await promises_1.default.unlink(archivePath).catch(() => { });
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false, error: message };
    }
}
/**
 * Restaure une archive mongodump (--gzip). Remplace les collections existantes (--drop).
 */
async function runMongoRestore(archivePath) {
    const uri = process.env.DATABASE_URL?.trim();
    if (!uri) {
        return { ok: false, error: 'DATABASE_URL est absent.' };
    }
    if (!isMongoBackupFilesystemWritable()) {
        return { ok: false, error: exports.SERVERLESS_MONGODB_BACKUP_MESSAGE };
    }
    try {
        const st = await promises_1.default.stat(archivePath);
        if (!st.isFile()) {
            return { ok: false, error: 'Archive introuvable.' };
        }
        await runMongorestore(uri, archivePath, true);
        return { ok: true };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false, error: message };
    }
}
function buildUploadedBackupFilename() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${UPLOAD_BACKUP_PREFIX}${stamp}${exports.BACKUP_FILE_SUFFIX}`;
}
//# sourceMappingURL=mongodb-backup.util.js.map