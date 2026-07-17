"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUploadedFileByPublicUrl = deleteUploadedFileByPublicUrl;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploads_path_1 = require("./uploads-path");
/**
 * Supprime un fichier local à partir de l’URL publique (/uploads/... ou /api/uploads/... sur Vercel).
 */
function deleteUploadedFileByPublicUrl(fileUrl) {
    try {
        const m = fileUrl.match(/\/(?:api\/)?uploads\/(.+)$/);
        if (!m?.[1])
            return;
        const segments = m[1].split('/').filter(Boolean);
        const fullPath = path_1.default.join((0, uploads_path_1.getUploadsRootDir)(), ...segments);
        if (fs_1.default.existsSync(fullPath)) {
            fs_1.default.unlinkSync(fullPath);
        }
    }
    catch {
        /* ignore */
    }
}
//# sourceMappingURL=deleteUpload.util.js.map