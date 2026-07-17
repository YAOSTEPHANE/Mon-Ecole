import type { Prisma, PrismaClient } from '@prisma/client';
type DbClient = PrismaClient | Prisma.TransactionClient;
/**
 * Recalcule le total des paiements COMPLETED pour une ligne de frais et met à jour `isPaid` / `paidAt`.
 */
export declare function syncTuitionFeePaidStatusForFeeId(db: DbClient, tuitionFeeId: string): Promise<void>;
export {};
//# sourceMappingURL=tuition-fee-paid-sync.util.d.ts.map