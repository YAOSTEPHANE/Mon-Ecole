"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScheduleLines = parseScheduleLines;
exports.splitTotalByPercents = splitTotalByPercents;
exports.addDays = addDays;
function parseScheduleLines(raw) {
    if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error('Le gabarit doit contenir au moins une ligne (tableau JSON).');
    }
    const lines = [];
    let sum = 0;
    for (const row of raw) {
        if (!row || typeof row !== 'object')
            continue;
        const r = row;
        const label = String(r.label ?? '').trim();
        const percentOfTotal = Number(r.percentOfTotal);
        const dueOffsetDays = Number(r.dueOffsetDays);
        if (!label)
            throw new Error('Chaque ligne doit avoir un libellé.');
        if (Number.isNaN(percentOfTotal) || percentOfTotal <= 0 || percentOfTotal > 100) {
            throw new Error(`Pourcentage invalide pour « ${label} ».`);
        }
        if (Number.isNaN(dueOffsetDays) || dueOffsetDays < 0) {
            throw new Error(`Décalage en jours invalide pour « ${label} ».`);
        }
        lines.push({ label, percentOfTotal, dueOffsetDays });
        sum += percentOfTotal;
    }
    if (lines.length === 0)
        throw new Error('Aucune ligne valide.');
    if (Math.abs(sum - 100) > 0.01) {
        throw new Error(`La somme des pourcentages doit être 100 (actuellement ${sum}).`);
    }
    return lines;
}
/** Répartit un total en FCFA entier sur les lignes (dernier versement = complément). */
function splitTotalByPercents(total, lines) {
    const n = lines.length;
    if (n === 0)
        return [];
    const t = Math.round(total);
    const amounts = [];
    let allocated = 0;
    for (let i = 0; i < n - 1; i++) {
        const part = Math.floor((t * lines[i].percentOfTotal) / 100);
        amounts.push(part);
        allocated += part;
    }
    amounts.push(Math.max(0, t - allocated));
    return amounts;
}
function addDays(d, days) {
    const x = new Date(d.getTime());
    x.setUTCDate(x.getUTCDate() + days);
    return x;
}
//# sourceMappingURL=tuition-catalog.util.js.map