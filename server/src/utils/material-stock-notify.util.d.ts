export type StockItemSnapshot = {
    id: string;
    name: string;
    unit: string;
    safetyQty: number;
    currentQty: number;
};
/**
 * Notifie les administrateurs lors d'une entrée en rupture ou en stock bas (transition uniquement).
 */
export declare function maybeNotifyMaterialStockAlert(previous: StockItemSnapshot, nextQty: number, nextSafetyQty?: number): Promise<void>;
export declare function notifyCurrentStockAlertsForItem(item: StockItemSnapshot): Promise<void>;
//# sourceMappingURL=material-stock-notify.util.d.ts.map