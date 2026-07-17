"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEACHER_ENGAGEMENT_KIND_VALUES = void 0;
exports.isTeacherEngagementKind = isTeacherEngagementKind;
exports.teacherEngagementKindLabel = teacherEngagementKindLabel;
exports.normalizeTeacherEngagementKind = normalizeTeacherEngagementKind;
exports.TEACHER_ENGAGEMENT_KIND_VALUES = ['PERMANENT', 'VACATAIRE'];
const LABELS = {
    PERMANENT: 'Permanent',
    VACATAIRE: 'Vacataire',
};
function isTeacherEngagementKind(value) {
    return typeof value === 'string' && exports.TEACHER_ENGAGEMENT_KIND_VALUES.includes(value);
}
function teacherEngagementKindLabel(kind) {
    if (!kind || !isTeacherEngagementKind(kind))
        return '—';
    return LABELS[kind];
}
function normalizeTeacherEngagementKind(value, fallback = 'PERMANENT') {
    return isTeacherEngagementKind(value) ? value : fallback;
}
//# sourceMappingURL=teacher-engagement-kind.util.js.map