"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BURSAR_STAFF_MODULES = void 0;
exports.isStaffFinanceAdminPath = isStaffFinanceAdminPath;
exports.staffFinancePathAllowed = staffFinancePathAllowed;
const staff_module_admin_access_util_1 = require("./staff-module-admin-access.util");
/** @deprecated Utiliser staff-module-admin-access.util — conservé pour compatibilité scripts. */
exports.BURSAR_STAFF_MODULES = [
    'overview',
    'counter',
    'admissions',
    'treasury',
    'notifications_mgmt',
    'reports_mgmt',
    'extracurricular_mgmt',
    'attendance_mgmt',
    'parents_mgmt',
    'hr_mgmt',
    'fees_mgmt',
    'tuition_fees_mgmt',
    'payments_mgmt',
    'accounting_mgmt',
    'administrative_mgmt',
    'communication_mgmt',
    'material_mgmt',
];
/** @deprecated */
function isStaffFinanceAdminPath(path, method) {
    return (0, staff_module_admin_access_util_1.isStaffModuleAdminPath)(path, method);
}
/** @deprecated */
function staffFinancePathAllowed(visibleModules, path, method) {
    return (0, staff_module_admin_access_util_1.staffModuleAdminPathAllowed)(visibleModules, path, method);
}
//# sourceMappingURL=staff-finance-access.util.js.map