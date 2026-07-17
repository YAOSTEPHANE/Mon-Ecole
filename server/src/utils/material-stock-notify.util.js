"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeNotifyMaterialStockAlert = maybeNotifyMaterialStockAlert;
exports.notifyCurrentStockAlertsForItem = notifyCurrentStockAlertsForItem;
const notify_important_util_1 = require("./notify-important.util");
const staff_notify_util_1 = require("./staff-notify.util");
function isRupture(qty) {
    return qty <= 0;
}
function isLowStock(qty, safetyQty) {
    return qty > 0 && safetyQty > 0 && qty <= safetyQty;
}
async function resolveStockAlertRecipientIds() {
    const adminIds = await (0, staff_notify_util_1.resolveActiveAdminUserIds)();
    const staffIds = await (0, staff_notify_util_1.resolveStaffUserIdsWithAnyModule)([
        'material_mgmt',
        'notifications_mgmt',
    ]);
    return { adminIds, staffIds };
}
/**
 * Notifie les administrateurs lors d'une entrée en rupture ou en stock bas (transition uniquement).
 */
async function maybeNotifyMaterialStockAlert(previous, nextQty, nextSafetyQty) {
    if (!Number.isFinite(nextQty))
        return;
    const prevQty = Number(previous.currentQty);
    const prevSafety = Math.max(0, Number(previous.safetyQty) || 0);
    const nextSafety = Math.max(0, Number(nextSafetyQty ?? previous.safetyQty) || 0);
    const wasRupture = isRupture(prevQty);
    const nowRupture = isRupture(nextQty);
    const wasLow = isLowStock(prevQty, prevSafety);
    const nowLow = isLowStock(nextQty, nextSafety);
    if (prevQty === nextQty && prevSafety === nextSafety)
        return;
    if (wasRupture && nowRupture)
        return;
    if (wasLow && nowLow && !nowRupture)
        return;
    const { adminIds, staffIds } = await resolveStockAlertRecipientIds();
    if (adminIds.length === 0 && staffIds.length === 0)
        return;
    const name = previous.name.trim() || 'Article';
    const unit = previous.unit?.trim() || 'unité';
    const notifyAll = async (title, content) => {
        if (adminIds.length > 0) {
            await (0, notify_important_util_1.notifyUsersImportant)(adminIds, {
                type: 'stock_alert',
                title,
                content,
                link: '/admin?tab=material',
            });
        }
        if (staffIds.length > 0) {
            await (0, notify_important_util_1.notifyUsersImportant)(staffIds, {
                type: 'stock_alert',
                title,
                content,
                link: '/staff?tab=material_mgmt',
            });
        }
    };
    if (!wasRupture && nowRupture) {
        await notifyAll('Rupture de stock', `L'article « ${name} » est en rupture (0 ${unit}). Réapprovisionnement nécessaire.`);
        return;
    }
    if (!wasLow && nowLow) {
        const qtyLabel = Number.isInteger(nextQty) ? String(nextQty) : nextQty.toFixed(2);
        await notifyAll('Alerte stock bas', `Stock faible pour « ${name} » : ${qtyLabel} ${unit} restant(s) (seuil : ${nextSafety} ${unit}).`);
    }
}
async function notifyCurrentStockAlertsForItem(item) {
    const fakePreviousQty = Math.max(Number(item.safetyQty) || 0, 1) + 1;
    await maybeNotifyMaterialStockAlert({ ...item, currentQty: fakePreviousQty }, Number(item.currentQty));
}
//# sourceMappingURL=material-stock-notify.util.js.map