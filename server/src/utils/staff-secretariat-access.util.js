"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStaffSecretariatAdminPath = isStaffSecretariatAdminPath;
exports.staffSecretariatPathAllowed = staffSecretariatPathAllowed;
exports.staffSecretariatAccessGranted = staffSecretariatAccessGranted;
const staff_module_admin_access_util_1 = require("./staff-module-admin-access.util");
/** @deprecated Utiliser staff-module-admin-access.util */
function isStaffSecretariatAdminPath(path, method) {
    return (0, staff_module_admin_access_util_1.isStaffModuleAdminPath)(path, method);
}
/** @deprecated */
function staffSecretariatPathAllowed(visibleModules, path, method) {
    return (0, staff_module_admin_access_util_1.staffModuleAdminPathAllowed)(visibleModules, path, method);
}
/** @deprecated */
function staffSecretariatAccessGranted(visibleModules, path, method) {
    if (!(0, staff_module_admin_access_util_1.isStaffModuleAdminPath)(path, method))
        return false;
    return (0, staff_module_admin_access_util_1.staffModuleAdminPathAllowed)(visibleModules, path, method);
}
//# sourceMappingURL=staff-secretariat-access.util.js.map