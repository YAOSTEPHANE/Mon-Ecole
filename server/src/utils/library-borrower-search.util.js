"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchLibraryBorrowers = searchLibraryBorrowers;
const prisma_1 = __importDefault(require("./prisma"));
async function searchLibraryBorrowers(q) {
    const term = q.trim();
    if (term.length < 2) {
        return [];
    }
    const users = await prisma_1.default.user.findMany({
        where: {
            isActive: true,
            role: { not: 'SUPER_ADMIN' },
            OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
            ],
        },
        take: 30,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            studentProfile: {
                select: {
                    studentId: true,
                    class: { select: { name: true, level: true } },
                },
            },
            teacherProfile: { select: { employeeId: true } },
            staffProfile: { select: { jobTitle: true } },
        },
    });
    const existing = new Set(users.map((u) => u.id));
    const byStudentNumber = await prisma_1.default.student.findMany({
        where: {
            isActive: true,
            studentId: { contains: term, mode: 'insensitive' },
        },
        take: 15,
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true,
                    isActive: true,
                },
            },
            class: { select: { name: true, level: true } },
        },
    });
    for (const s of byStudentNumber) {
        if (!s.user?.isActive || existing.has(s.user.id))
            continue;
        users.push({
            id: s.user.id,
            firstName: s.user.firstName,
            lastName: s.user.lastName,
            email: s.user.email,
            role: s.user.role,
            studentProfile: {
                studentId: s.studentId,
                class: s.class,
            },
            teacherProfile: null,
            staffProfile: null,
        });
        existing.add(s.user.id);
    }
    return users.slice(0, 30);
}
//# sourceMappingURL=library-borrower-search.util.js.map