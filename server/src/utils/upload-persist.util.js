"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistUploadedFile = persistUploadedFile;
exports.discardUploadedFile = discardUploadedFile;
exports.deleteStoredUploadUrl = deleteStoredUploadUrl;
const fs_1 = __importDefault(require("fs"));
const upload_middleware_1 = require("../middleware/upload.middleware");
const blob_storage_util_1 = require("./blob-storage.util");
const deleteUpload_util_1 = require("./deleteUpload.util");
function ensureMulterFilename(file) {
    if (!file.filename) {
        file.filename = (0, blob_storage_util_1.buildSafeUploadFilename)(file.fieldname, file.originalname);
    }
}
async function persistUploadedFile(file, folder, options) {
    ensureMulterFilename(file);
    if ((0, blob_storage_util_1.useBlobStorage)()) {
        if (!file.buffer?.length) {
            throw new Error('Fichier en mémoire manquant pour le stockage Blob.');
        }
        return (0, blob_storage_util_1.uploadBufferToBlob)(folder, file.filename, file.buffer, file.mimetype);
    }
    const relative = (0, upload_middleware_1.getFileUrl)(file.filename, folder);
    if (options?.relative) {
        return relative;
    }
    if (options?.req) {
        const host = options.req.get('host');
        if (host) {
            return `${options.req.protocol}://${host}${relative}`;
        }
    }
    return relative;
}
/** Supprime un fichier temporaire disque ou annule avant persistance Blob. */
function discardUploadedFile(file) {
    if (!file?.path)
        return;
    try {
        if (fs_1.default.existsSync(file.path)) {
            fs_1.default.unlinkSync(file.path);
        }
    }
    catch {
        /* ignore */
    }
}
/** Supprime un fichier stocké (Blob ou disque local). */
async function deleteStoredUploadUrl(storedUrl) {
    if (!storedUrl?.trim())
        return;
    if ((0, blob_storage_util_1.isVercelBlobUrl)(storedUrl)) {
        await (0, blob_storage_util_1.deleteBlobByUrl)(storedUrl);
        return;
    }
    (0, deleteUpload_util_1.deleteUploadedFileByPublicUrl)(storedUrl);
}
//# sourceMappingURL=upload-persist.util.js.map