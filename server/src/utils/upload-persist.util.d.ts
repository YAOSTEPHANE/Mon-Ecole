import type { Request } from 'express';
export type PersistUploadOptions = {
    req?: Request;
    /** En local : chemin relatif `/uploads/...` (branding). Sur Blob : URL absolue. */
    relative?: boolean;
};
export declare function persistUploadedFile(file: Express.Multer.File, folder: string, options?: PersistUploadOptions): Promise<string>;
/** Supprime un fichier temporaire disque ou annule avant persistance Blob. */
export declare function discardUploadedFile(file: Express.Multer.File | undefined): void;
/** Supprime un fichier stocké (Blob ou disque local). */
export declare function deleteStoredUploadUrl(storedUrl: string): Promise<void>;
//# sourceMappingURL=upload-persist.util.d.ts.map