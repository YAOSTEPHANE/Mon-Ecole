"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schoolMessagingRecipientUsersWhere = schoolMessagingRecipientUsersWhere;
const internal_messaging_util_1 = require("./internal-messaging.util");
const school_context_util_1 = require("./school-context.util");
/**
 * Utilisateurs pouvant être destinataires de la messagerie interne pour un établissement.
 * Ne se limite pas à school_members (souvent incomplet) : inclut aussi les profils rattachés à l’école.
 */
function schoolMessagingRecipientUsersWhere(schoolId, isDefaultSchool = false) {
    const classScope = (0, school_context_util_1.classScopeWhere)(schoolId, isDefaultSchool);
    const studentScope = (0, school_context_util_1.studentScopeWhere)(schoolId, isDefaultSchool);
    const teacherScope = {
        OR: [{ classes: { some: classScope } }, { courses: { some: { class: classScope } } }],
    };
    const educatorScope = {
        classAssignments: { some: { class: classScope } },
    };
    const staffScope = isDefaultSchool
        ? { OR: [{ schoolId }, { schoolId: null }] }
        : { schoolId };
    return {
        isActive: true,
        role: { in: [...internal_messaging_util_1.PLATFORM_MESSAGING_ROLES] },
        OR: [
            { schoolMemberships: { some: { schoolId } } },
            { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
            { teacherProfile: { is: teacherScope } },
            { studentProfile: { is: studentScope } },
            { educatorProfile: { is: educatorScope } },
            { staffProfile: { is: staffScope } },
            {
                parentProfile: {
                    is: {
                        students: { some: { student: studentScope } },
                    },
                },
            },
        ],
    };
}
//# sourceMappingURL=school-messaging-recipients.util.js.map