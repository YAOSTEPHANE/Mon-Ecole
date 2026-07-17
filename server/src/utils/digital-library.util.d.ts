import type { DigitalLibraryResourceKind, Role } from '@prisma/client';
export declare function canRoleAccessDigitalResource(role: Role, allowedRoles: string[]): boolean;
export declare function getDigitalResourceForUser(resourceId: string, userId: string, role: Role): Promise<{
    id: string;
    title: string;
    author: string | null;
    description: string | null;
    kind: import(".prisma/client").$Enums.DigitalLibraryResourceKind;
    fileUrl: string;
    fileName: string | null;
    mimeType: string | null;
    fileSizeBytes: number | null;
    coverImageUrl: string | null;
    subject: string | null;
    level: string | null;
    onlineAccessEnabled: boolean;
    tempDownloadEnabled: boolean;
    downloadTtlHours: number;
    allowedRoles: string[];
    isActive: boolean;
    publishedAt: Date | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
} | null>;
export declare const DIGITAL_KIND_LABELS: Record<DigitalLibraryResourceKind, string>;
//# sourceMappingURL=digital-library.util.d.ts.map