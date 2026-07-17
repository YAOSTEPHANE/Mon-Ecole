"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileUrl = exports.admissionReportCardUpload = exports.identityUpload = exports.brandingUpload = exports.elearningUpload = exports.digitalLibraryUpload = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploads_path_1 = require("../utils/uploads-path");
const blob_storage_util_1 = require("../utils/blob-storage.util");
const uploadsDir = (0, uploads_path_1.getUploadsRootDir)();
if (!(0, blob_storage_util_1.useBlobStorage)()) {
    try {
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
    }
    catch (err) {
        console.error('uploads: impossible de créer le répertoire racine', err);
    }
}
const diskStorage = multer_1.default.diskStorage({
    destination: (_req, file, cb) => {
        const folder = (0, blob_storage_util_1.folderForUploadField)(file.fieldname);
        const dir = path_1.default.join(uploadsDir, folder);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        cb(null, (0, blob_storage_util_1.buildSafeUploadFilename)(file.fieldname, file.originalname));
    },
});
const storage = (0, blob_storage_util_1.useBlobStorage)() ? multer_1.default.memoryStorage() : diskStorage;
const GENERAL_ALLOWED_MIMES_BY_EXT = {
    '.jpeg': ['image/jpeg'],
    '.jpg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
function mimeAllowedForExtension(originalName, mimetype, allowedByExt) {
    const ext = path_1.default.extname(originalName).toLowerCase();
    const allowedMimes = allowedByExt[ext];
    if (!allowedMimes)
        return false;
    const normalizedMime = (mimetype || '').toLowerCase().split(';')[0].trim();
    if (!normalizedMime || normalizedMime === 'application/octet-stream') {
        return true;
    }
    return allowedMimes.includes(normalizedMime);
}
// Filtre des types de fichiers
const fileFilter = (_req, file, cb) => {
    if (mimeAllowedForExtension(file.originalname, file.mimetype, GENERAL_ALLOWED_MIMES_BY_EXT)) {
        return cb(null, true);
    }
    cb(new Error('Type de fichier non autorisé. Utilisez jpeg, jpg, png, gif, pdf, doc ou docx.'));
};
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter,
});
const digitalLibraryFilter = (req, file, cb) => {
    const allowed = /pdf|epub|mobi|doc|docx|xls|xlsx|ppt|pptx|zip|txt/;
    const extname = allowed.test(path_1.default.extname(file.originalname).toLowerCase());
    if (extname)
        return cb(null, true);
    cb(new Error('Type non autorisé. Formats : PDF, EPUB, MOBI, DOC, DOCX, XLS, PPT, ZIP, TXT.'));
};
exports.digitalLibraryUpload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter: digitalLibraryFilter,
});
const elearningFilter = (req, file, cb) => {
    const allowed = /pdf|mp4|webm|mov|doc|docx|ppt|pptx|zip|txt|png|jpg|jpeg/;
    const extname = allowed.test(path_1.default.extname(file.originalname).toLowerCase());
    if (extname)
        return cb(null, true);
    cb(new Error('Type non autorisé pour l’e-learning.'));
};
exports.elearningUpload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: elearningFilter,
});
const BRANDING_ALLOWED_MIMES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/heic',
    'image/heif',
]);
const brandingExtOk = (name) => /\.(jpeg|jpg|png|gif|webp|ico|heic|heif)$/i.test(path_1.default.extname(name));
const brandingFileFilter = (_req, file, cb) => {
    if (file.fieldname !== 'branding') {
        return fileFilter(_req, file, cb);
    }
    if (!brandingExtOk(file.originalname)) {
        return cb(new Error('Format non autorisé pour le logo. Utilisez une image (PNG, JPG, WEBP, ICO, HEIC…).'));
    }
    const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
    if (BRANDING_ALLOWED_MIMES.has(mime)) {
        return cb(null, true);
    }
    return cb(new Error('Format non autorisé pour le logo. Utilisez une image (PNG, JPG, WEBP, ICO, HEIC…).'));
};
/** Logos / favicon établissement (champ fichier `branding`, max 5 Mo). */
exports.brandingUpload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: brandingFileFilter,
});
/** Pièces d’identité : fichiers un peu plus volumineux (PDF scannés) */
exports.identityUpload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter,
});
/** Bulletin 3e trimestre — formulaire public d’inscription (champ `term3ReportCard`). */
exports.admissionReportCardUpload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowed = /pdf|jpe?g|png|webp/;
        const extOk = allowed.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimeOk = !file.mimetype || /pdf|image\/(jpeg|png|webp)/i.test(file.mimetype);
        if (extOk && mimeOk)
            return cb(null, true);
        cb(new Error('Format non autorisé pour le bulletin. Utilisez un PDF ou une image (JPG, PNG, WEBP).'));
    },
});
const getFileUrl = (filename, folder = 'general') => {
    const prefix = (0, uploads_path_1.getPublicUploadsUrlPrefix)();
    return `${prefix}/${folder}/${filename}`;
};
exports.getFileUrl = getFileUrl;
//# sourceMappingURL=upload.middleware.js.map