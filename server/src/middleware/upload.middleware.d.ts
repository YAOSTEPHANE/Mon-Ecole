import multer from 'multer';
export declare const upload: multer.Multer;
export declare const digitalLibraryUpload: multer.Multer;
export declare const elearningUpload: multer.Multer;
/** Logos / favicon établissement (champ fichier `branding`, max 5 Mo). */
export declare const brandingUpload: multer.Multer;
/** Pièces d’identité : fichiers un peu plus volumineux (PDF scannés) */
export declare const identityUpload: multer.Multer;
/** Bulletin 3e trimestre — formulaire public d’inscription (champ `term3ReportCard`). */
export declare const admissionReportCardUpload: multer.Multer;
export declare const getFileUrl: (filename: string, folder?: string) => string;
//# sourceMappingURL=upload.middleware.d.ts.map