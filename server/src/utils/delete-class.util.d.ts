import type { PrismaClient } from '@prisma/client';
/** Supprime une classe vide (sans élèves) et toutes les données pédagogiques associées. */
export declare function deleteClassWithDependencies(prisma: PrismaClient, classId: string): Promise<void>;
//# sourceMappingURL=delete-class.util.d.ts.map