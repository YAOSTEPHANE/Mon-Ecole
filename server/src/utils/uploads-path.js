"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadsRootDir = getUploadsRootDir;
exports.getPublicUploadsUrlPrefix = getPublicUploadsUrlPrefix;
const path_1 = __importDefault(require("path"));
/**
 * Répertoire racine des uploads (disque local uniquement).
 * Sur Vercel, les fichiers vont dans Vercel Blob si `BLOB_READ_WRITE_TOKEN` est défini (voir blob-storage.util).
 * Sans token Blob sur Vercel, `/tmp` reste un repli éphémère (non persistant).
 */
function getUploadsRootDir() {
    if (process.env.VERCEL === '1') {
        return path_1.default.join('/tmp', 'school-manager-uploads');
    }
    return path_1.default.join(__dirname, '../../uploads');
}
/**
 * Préfixe d’URL public pour les fichiers servis par Express.
 * Sur Vercel (experimentalServices), seul le préfixe `/api` atteint le runtime Express :
 * les assets doivent être demandés en `/api/uploads/...`, pas `/uploads/...` (sinon 404 côté Next).
 */
function getPublicUploadsUrlPrefix() {
    return process.env.VERCEL === '1' ? '/api/uploads' : '/uploads';
}
//# sourceMappingURL=uploads-path.js.map