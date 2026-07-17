"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDeviceApiKey = verifyDeviceApiKey;
const device_api_key_util_1 = require("../utils/device-api-key.util");
const secure_compare_util_1 = require("../utils/secure-compare.util");
function readDeviceApiKey(req) {
    const header = req.headers['x-nfc-api-key'];
    if (typeof header === 'string' && header.length > 0)
        return header;
    const bodyKey = req.body?.apiKey;
    if (typeof bodyKey === 'string' && bodyKey.length > 0)
        return bodyKey;
    return undefined;
}
/**
 * Authentifie un terminal de pointage (NFC / visage) via X-NFC-API-Key.
 * En production, la clé dans l’URL (?apiKey) est refusée (fuite dans logs / historique).
 */
function verifyDeviceApiKey(req, res, next) {
    const queryKey = req.query.apiKey;
    if (process.env.NODE_ENV === 'production' &&
        typeof queryKey === 'string' &&
        queryKey.length > 0) {
        res.status(400).json({
            error: 'Utilisez l’en-tête X-NFC-API-Key pour la clé matériel (pas de paramètre d’URL).',
        });
        return;
    }
    let provided = readDeviceApiKey(req);
    if (!provided && typeof queryKey === 'string') {
        provided = queryKey;
    }
    let deviceKey;
    try {
        deviceKey = (0, device_api_key_util_1.getDeviceApiKey)();
    }
    catch (e) {
        console.error('[device-api-key] Configuration matériel invalide:', e);
        res.status(503).json({
            error: 'Pointage matériel non configuré sur ce serveur (NFC_API_KEY).',
        });
        return;
    }
    if (!provided || !(0, secure_compare_util_1.secureCompareStrings)(provided, deviceKey)) {
        res.status(401).json({
            error: 'Clé API matériel invalide ou manquante',
            message: 'Fournissez X-NFC-API-Key (terminal de pointage).',
        });
        return;
    }
    next();
}
//# sourceMappingURL=device-api-key.middleware.js.map