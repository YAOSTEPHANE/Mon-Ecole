"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchStudentScanId = matchStudentScanId;
exports.matchTeacherScanId = matchTeacherScanId;
exports.matchStaffScanId = matchStaffScanId;
/** Correspondance lecture carte NFC ou empreinte digitale (identifiants distincts en base). */
function matchStudentScanId(scanId) {
    return {
        OR: [{ nfcId: scanId }, { biometricId: scanId }],
    };
}
function matchTeacherScanId(scanId) {
    return {
        OR: [{ nfcId: scanId }, { biometricId: scanId }],
    };
}
function matchStaffScanId(scanId) {
    return {
        OR: [{ nfcId: scanId }, { biometricId: scanId }],
    };
}
//# sourceMappingURL=scan-id.util.js.map