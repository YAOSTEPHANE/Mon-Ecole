"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const digital_library_management_routes_1 = __importDefault(require("./shared/digital-library-management.routes"));
const router = express_1.default.Router();
/** N’applique l’admin strict qu’aux routes /library (évite de bloquer tout /admin pour le STAFF). */
router.use((req, res, next) => {
    if (!req.path.startsWith('/library'))
        return next();
    return (0, auth_middleware_1.authorize)('ADMIN', 'SUPER_ADMIN')(req, res, next);
});
router.use(digital_library_management_routes_1.default);
exports.default = router;
//# sourceMappingURL=admin-digital-library.routes.js.map