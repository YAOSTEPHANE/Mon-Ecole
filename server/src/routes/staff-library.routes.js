"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const staff_visible_modules_util_1 = require("../utils/staff-visible-modules.util");
const library_management_routes_1 = __importDefault(require("./shared/library-management.routes"));
const digital_library_management_routes_1 = __importDefault(require("./shared/digital-library-management.routes"));
const router = express_1.default.Router();
function requireStaffModule(moduleId) {
    return async (req, res, next) => {
        try {
            await (0, staff_visible_modules_util_1.assertStaffHasModule)(req.user.id, moduleId);
            next();
        }
        catch (e) {
            if (e instanceof Error) {
                if (e.message === 'MODULE_NOT_ALLOWED' || e.message === 'STAFF_PROFILE_NOT_FOUND') {
                    return res.status(403).json({
                        error: 'Module non autorisé pour votre compte personnel',
                        code: e.message,
                    });
                }
            }
            next(e);
        }
    };
}
async function requireLibraryOrDigitalModule(req, res, next) {
    try {
        await (0, staff_visible_modules_util_1.assertStaffHasModule)(req.user.id, 'library');
        return next();
    }
    catch {
        try {
            await (0, staff_visible_modules_util_1.assertStaffHasModule)(req.user.id, 'digital_library');
            return next();
        }
        catch (e) {
            if (e instanceof Error) {
                if (e.message === 'MODULE_NOT_ALLOWED' || e.message === 'STAFF_PROFILE_NOT_FOUND') {
                    return res.status(403).json({
                        error: 'Module non autorisé pour votre compte personnel',
                        code: e.message,
                    });
                }
            }
            return next(e);
        }
    }
}
const staffOnly = [auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('STAFF')];
const libraryAccess = [...staffOnly, requireStaffModule('library')];
const digitalAccess = [...staffOnly, requireLibraryOrDigitalModule];
/** Ne pas bloquer /admissions, /pedagogy, etc. — ce routeur est monté à la racine /staff. */
router.use((req, res, next) => {
    if (!req.path.startsWith('/library')) {
        return next('router');
    }
    next();
});
router.get('/library/users', ...libraryAccess, async (req, res) => {
    try {
        const { isActive } = req.query;
        const users = await prisma_1.default.user.findMany({
            where: {
                ...(isActive !== undefined && { isActive: isActive === 'true' }),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            take: 500,
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.use(...libraryAccess, library_management_routes_1.default);
router.use(...digitalAccess, digital_library_management_routes_1.default);
exports.default = router;
//# sourceMappingURL=staff-library.routes.js.map