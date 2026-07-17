"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_BRANDING_PRISMA_HINT = exports.APP_BRANDING_ID = void 0;
exports.getAppBrandingDelegate = getAppBrandingDelegate;
const prisma_1 = __importDefault(require("./prisma"));
/** Après ajout du modèle AppBranding, un `npx prisma generate` est requis. */
function getAppBrandingDelegate() {
    const delegate = prisma_1.default.appBranding;
    return delegate ?? null;
}
exports.APP_BRANDING_ID = 'default';
exports.APP_BRANDING_PRISMA_HINT = 'Exécutez dans le dossier server : npx prisma generate puis npx prisma db push (client Prisma ou base pas à jour).';
//# sourceMappingURL=app-branding-prisma.util.js.map