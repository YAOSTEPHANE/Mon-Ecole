"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const prismaLogQueries = process.env.PRISMA_LOG_QUERIES === 'true' || process.env.PRISMA_LOG_QUERIES === '1';
const prismaLogLevel = process.env.NODE_ENV === 'development'
    ? prismaLogQueries
        ? ['query', 'error', 'warn']
        : ['error', 'warn']
    : ['error'];
function createPrismaClient() {
    return new client_1.PrismaClient({
        log: [...prismaLogLevel],
    });
}
/** En dev, tsx garde un singleton sans les nouveaux modèles après prisma generate — on le recrée. */
function prismaClient() {
    const stale = global.prisma &&
        typeof global.prisma.school === 'undefined';
    if (stale) {
        void global.prisma?.$disconnect().catch(() => { });
        global.prisma = undefined;
    }
    if (!global.prisma) {
        global.prisma = createPrismaClient();
    }
    return global.prisma;
}
exports.prisma = process.env.NODE_ENV === 'production'
    ? global.prisma || createPrismaClient()
    : prismaClient();
if (process.env.NODE_ENV !== 'production') {
    global.prisma = exports.prisma;
}
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map