/** Stockage Blob actif (Vercel injecte `BLOB_READ_WRITE_TOKEN` quand un store est lié). */
export declare function useBlobStorage(): boolean;
export declare function assertBlobConfiguredForVercel(): void;
export declare function isVercelBlobUrl(url: string): boolean;
export declare function blobPathnameFromStoredUrl(storedUrl: string): string | null;
export declare function isSensitiveBlobStoredUrl(storedUrl: string): boolean;
export declare function buildSafeUploadFilename(fieldname: string, originalname: string): string;
export declare function folderForUploadField(fieldname: string): string;
export declare function uploadBufferToBlob(folder: string, filename: string, body: Buffer, contentType?: string): Promise<string>;
export declare function deleteBlobByUrl(url: string): Promise<void>;
//# sourceMappingURL=blob-storage.util.d.ts.map