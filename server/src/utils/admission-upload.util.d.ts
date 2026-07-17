import type { Request } from 'express';
import { discardUploadedFile } from './upload-persist.util';
export { discardUploadedFile as unlinkUploadedFile };
export declare function term3ReportCardDataFromUpload(req: Request): Promise<{
    term3ReportCardUrl: string;
    term3ReportCardOriginalName: string;
    term3ReportCardMimeType: string;
} | null>;
//# sourceMappingURL=admission-upload.util.d.ts.map