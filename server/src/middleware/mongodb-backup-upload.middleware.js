"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoBackupUpload = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const multer_1 = __importDefault(require("multer"));
const mongodb_backup_util_1 = require("../utils/mongodb-backup.util");
const MAX_BYTES = Number.parseInt(process.env.MONGODB_BACKUP_MAX_UPLOAD_MB ?? '1024', 10) * 1024 * 1024;
exports.mongoBackupUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            if (!(0, mongodb_backup_util_1.isMongoBackupFilesystemWritable)()) {
                cb(new Error(mongodb_backup_util_1.SERVERLESS_MONGODB_BACKUP_MESSAGE), '');
                return;
            }
            const dir = (0, mongodb_backup_util_1.getBackupDir)();
            promises_1.default.mkdir(dir, { recursive: true })
                .then(() => cb(null, dir))
                .catch((err) => cb(err, dir));
        },
        filename: (_req, file, cb) => {
            const original = file.originalname?.toLowerCase() ?? '';
            if (original.endsWith('.archive.gz')) {
                cb(null, (0, mongodb_backup_util_1.buildUploadedBackupFilename)());
            }
            else {
                cb(null, (0, mongodb_backup_util_1.buildUploadedBackupFilename)());
            }
        },
    }),
    limits: { fileSize: Number.isFinite(MAX_BYTES) && MAX_BYTES > 0 ? MAX_BYTES : 1024 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const name = file.originalname?.toLowerCase() ?? '';
        if (name.endsWith('.archive.gz') || file.mimetype === 'application/gzip' || file.mimetype === 'application/x-gzip') {
            cb(null, true);
            return;
        }
        cb(new Error('Seuls les fichiers .archive.gz (mongodump) sont acceptés.'));
    },
});
//# sourceMappingURL=mongodb-backup-upload.middleware.js.map