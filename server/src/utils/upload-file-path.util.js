"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.localPathFromUploadUrl = localPathFromUploadUrl;
exports.isPathInsideUploadsRoot = isPathInsideUploadsRoot;
const path_1 = __importDefault(require("path"));
const uploads_path_1 = require("./uploads-path");
/** Convertit une URL publique d’upload en chemin local (null si hors uploads). */
function localPathFromUploadUrl(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string')
        return null;
    const match = fileUrl.match(/\/(?:api\/)?uploads\/(.+)$/i);
    if (match) {
        const rel = match[1].replace(/^\/+/, '');
        if (!rel || rel.includes('..'))
            return null;
        return path_1.default.join((0, uploads_path_1.getUploadsRootDir)(), rel);
    }
    const prefix = (0, uploads_path_1.getPublicUploadsUrlPrefix)();
    const marker = `${prefix}/`;
    const idx = fileUrl.indexOf(marker);
    if (idx === -1)
        return null;
    const rel = fileUrl.slice(idx + marker.length).replace(/^\/+/, '');
    if (!rel || rel.includes('..'))
        return null;
    return path_1.default.join((0, uploads_path_1.getUploadsRootDir)(), rel);
}
function isPathInsideUploadsRoot(absPath) {
    const root = path_1.default.resolve((0, uploads_path_1.getUploadsRootDir)());
    const resolved = path_1.default.resolve(absPath);
    return resolved === root || resolved.startsWith(`${root}${path_1.default.sep}`);
}
//# sourceMappingURL=upload-file-path.util.js.map