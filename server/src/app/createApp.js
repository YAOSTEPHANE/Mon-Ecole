"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("../routes/auth.routes"));
const admin_routes_1 = __importDefault(require("../routes/admin.routes"));
const teacher_routes_1 = __importDefault(require("../routes/teacher.routes"));
const student_routes_1 = __importDefault(require("../routes/student.routes"));
const parent_routes_1 = __importDefault(require("../routes/parent.routes"));
const educator_routes_1 = __importDefault(require("../routes/educator.routes"));
const upload_routes_1 = __importDefault(require("../routes/upload.routes"));
const nfc_routes_1 = __importDefault(require("../routes/nfc.routes"));
const face_routes_1 = __importDefault(require("../routes/face.routes"));
const push_routes_1 = __importDefault(require("../routes/push.routes"));
const admission_public_routes_1 = __importDefault(require("../routes/admission.public.routes"));
const public_routes_1 = __importDefault(require("../routes/public.routes"));
const staff_routes_1 = __importDefault(require("../routes/staff.routes"));
const super_admin_routes_1 = __importDefault(require("../routes/super-admin.routes"));
const academic_validation_routes_1 = __importDefault(require("../routes/academic-validation.routes"));
const digital_library_routes_1 = __importDefault(require("../routes/digital-library.routes"));
const health_routes_1 = __importDefault(require("../routes/health.routes"));
const elearning_routes_1 = __importDefault(require("../routes/elearning.routes"));
const uploads_path_1 = require("../utils/uploads-path");
const cors_origins_util_1 = require("../utils/cors-origins.util");
const performance_metrics_util_1 = require("../utils/performance-metrics.util");
const security_headers_middleware_1 = require("../middleware/security-headers.middleware");
const protected_uploads_middleware_1 = require("../middleware/protected-uploads.middleware");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
/**
 * Construit l’application Express (middlewares, routes, gestion d’erreurs).
 * L’écoute du port et le chargement de `dotenv` restent dans `index.ts`.
 */
function createApp() {
    const app = (0, express_1.default)();
    const apiPrefix = process.env.VERCEL === '1' ? '' : '/api';
    const healthJson = { status: 'OK', message: 'School Manager API is running' };
    /** Liveness — avant middlewares lourds (diagnostic prod / load balancer). */
    app.get('/health', (_req, res) => res.json(healthJson));
    if (apiPrefix === '/api') {
        app.get('/api/health', (_req, res) => res.json(healthJson));
    }
    if (process.env.TRUST_PROXY === '1' || process.env.VERCEL === '1') {
        app.set('trust proxy', 1);
    }
    const corsAllowed = new Set((0, cors_origins_util_1.getAllowedCorsOrigins)());
    app.disable('x-powered-by');
    app.use(security_headers_middleware_1.securityHeaders);
    app.use((0, cors_1.default)({
        origin(origin, callback) {
            if (!origin) {
                callback(null, true);
                return;
            }
            try {
                const u = new URL(origin);
                if (u.protocol !== 'http:' && u.protocol !== 'https:') {
                    callback(null, false);
                    return;
                }
                const key = u.origin;
                if (corsAllowed.has(key)) {
                    callback(null, true);
                    return;
                }
            }
            catch {
                callback(null, false);
                return;
            }
            callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-School-Id', 'X-NFC-API-Key'],
    }));
    if (process.env.NODE_ENV === 'development') {
        app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    if (apiPrefix) {
        app.use(apiPrefix, rate_limit_middleware_1.apiGlobalLimiter);
    }
    else {
        app.use(rate_limit_middleware_1.apiGlobalLimiter);
    }
    app.use((req, res, next) => {
        const started = process.hrtime.bigint();
        res.on('finish', () => {
            const elapsedMs = Number(process.hrtime.bigint() - started) / 1000000;
            (0, performance_metrics_util_1.recordRequestMetric)({
                method: req.method,
                path: req.originalUrl.split('?')[0] || req.path,
                statusCode: res.statusCode,
                durationMs: elapsedMs,
            });
        });
        next();
    });
    const uploadsRoot = (0, uploads_path_1.getUploadsRootDir)();
    const uploadsStatic = express_1.default.static(uploadsRoot, {
        dotfiles: 'deny',
        index: false,
        fallthrough: true,
        setHeaders(res, filePath) {
            const posix = filePath.replace(/\\/g, '/');
            if (posix.includes('/identity-documents/') || posix.includes('/admission-documents/')) {
                res.setHeader('Cache-Control', 'private, no-store, no-cache');
            }
            else {
                res.setHeader('Cache-Control', 'public, max-age=86400');
            }
        },
    });
    const serveUploads = (req, res, next) => {
        void (0, protected_uploads_middleware_1.protectSensitiveUploads)(req, res, () => {
            uploadsStatic(req, res, (err) => {
                const code = err && typeof err === 'object' && 'code' in err
                    ? String(err.code)
                    : '';
                if (code === 'ENOENT') {
                    if (!res.headersSent)
                        res.status(404).end();
                    return;
                }
                if (err)
                    next(err);
            });
        });
    };
    app.use('/uploads', serveUploads, (_req, res) => {
        res.status(404).end();
    });
    /** En local, chemins BDD ou clients parfois en `/api/uploads/...` (aligné Vercel). */
    if (apiPrefix === '/api') {
        app.use('/api/uploads', serveUploads, (_req, res) => {
            res.status(404).end();
        });
    }
    app.use(`${apiPrefix}/auth`, auth_routes_1.default);
    app.use(`${apiPrefix}/admin`, admin_routes_1.default);
    app.use(`${apiPrefix}/super-admin`, super_admin_routes_1.default);
    app.use(`${apiPrefix}/teacher`, teacher_routes_1.default);
    app.use(`${apiPrefix}/student`, student_routes_1.default);
    app.use(`${apiPrefix}/parent`, parent_routes_1.default);
    app.use(`${apiPrefix}/staff`, staff_routes_1.default);
    app.use(`${apiPrefix}/educator`, educator_routes_1.default);
    app.use(`${apiPrefix}/upload`, upload_routes_1.default);
    app.use(`${apiPrefix}/nfc`, nfc_routes_1.default);
    app.use(`${apiPrefix}/face`, face_routes_1.default);
    app.use(`${apiPrefix}/push`, push_routes_1.default);
    app.use(`${apiPrefix}/public/admissions`, admission_public_routes_1.default);
    app.use(`${apiPrefix}/public`, public_routes_1.default);
    app.use(`${apiPrefix}/academic-validation`, academic_validation_routes_1.default);
    app.use(`${apiPrefix}/digital-library`, digital_library_routes_1.default);
    app.get(`${apiPrefix}/health`, (req, res) => res.json(healthJson));
    if (apiPrefix === '/api') {
        app.get('/health', (req, res) => res.json(healthJson));
    }
    if (apiPrefix === '') {
        app.get('/api/health', (req, res) => res.json(healthJson));
    }
    app.use(`${apiPrefix}/health`, health_routes_1.default);
    app.use(`${apiPrefix}/elearning`, elearning_routes_1.default);
    app.use((req, res) => {
        res.status(404).json({ error: 'Route non trouvée' });
    });
    app.use((err, _req, res, _next) => {
        const code = err && typeof err === 'object' && 'code' in err
            ? String(err.code)
            : '';
        if (code === 'ENOENT') {
            if (!res.headersSent)
                res.status(404).end();
            return;
        }
        console.error('Erreur non gérée:', err);
        const message = err instanceof Error ? err.message : 'Erreur serveur';
        if (!res.headersSent) {
            res.status(500).json({
                error: process.env.NODE_ENV === 'development' ? message : 'Erreur serveur',
            });
        }
    });
    return app;
}
//# sourceMappingURL=createApp.js.map