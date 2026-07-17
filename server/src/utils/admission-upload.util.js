"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlinkUploadedFile = void 0;
exports.term3ReportCardDataFromUpload = term3ReportCardDataFromUpload;
const upload_persist_util_1 = require("./upload-persist.util");
Object.defineProperty(exports, "unlinkUploadedFile", { enumerable: true, get: function () { return upload_persist_util_1.discardUploadedFile; } });
async function term3ReportCardDataFromUpload(req) {
    const file = req.file;
    if (!file)
        return null;
    const term3ReportCardUrl = await (0, upload_persist_util_1.persistUploadedFile)(file, 'admission-documents', { req });
    return {
        term3ReportCardUrl,
        term3ReportCardOriginalName: file.originalname,
        term3ReportCardMimeType: file.mimetype,
    };
}
//# sourceMappingURL=admission-upload.util.js.map