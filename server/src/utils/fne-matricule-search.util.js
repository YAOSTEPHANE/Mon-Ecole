"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFneSearchResults = parseFneSearchResults;
exports.toFneDateFormat = toFneDateFormat;
exports.getFneFormOptions = getFneFormOptions;
exports.searchFneMatricule = searchFneMatricule;
exports.findSchoolOption = findSchoolOption;
const undici_1 = require("undici");
const SECONDARY = {
    origin: 'http://agfne.sigfne.net',
    formPath: '/vas/recherche-matricule-eleve-dsps/',
    postPath: '/vas/recherche-matricule-eleve/',
};
const PRIMARY = {
    origin: 'https://agcp.sigfne.net',
    formPath: '/edit/recherche-matricule-eleve-dsps/',
    postPath: '/edit/recherche-matricule-eleve/',
};
/** Certificat du portail primaire souvent invalide côté Node. */
const insecureTlsAgent = new undici_1.Agent({ connect: { rejectUnauthorized: false } });
const DEFAULT_SECONDARY_YEARS = [
    { value: '1617', label: 'Fichier 2016-2017' },
    { value: '1718', label: 'Fichier 2017-2018' },
    { value: '1819', label: 'Fichier 2018-2019' },
];
const DEFAULT_PRIMARY_YEARS = [
    { value: '1617', label: 'Fichier 2016-2017' },
    { value: '1718', label: 'Fichier 2017-2018' },
    { value: '1819', label: 'Fichier 2018-2019' },
    { value: '1920', label: 'Fichier 2019-2020' },
    { value: '2021', label: 'Fichier 2020-2021' },
    { value: '2122', label: 'Fichier 2021-2022' },
    { value: '2223', label: 'Fichier 2022-2023' },
    { value: '2425', label: 'Fichier 2024-2025' },
];
function decodeHtml(s) {
    return s
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}
function stripTags(s) {
    return decodeHtml(s.replace(/<[^>]+>/g, ' '));
}
function endpoints(cycle) {
    return cycle === 'primary' ? PRIMARY : SECONDARY;
}
async function fetchText(cycle, url, init) {
    if (cycle === 'primary') {
        const res = await (0, undici_1.fetch)(url, {
            method: init?.method ?? 'GET',
            headers: init?.headers,
            body: init?.body,
            dispatcher: insecureTlsAgent,
            redirect: 'follow',
        });
        const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
        return { status: res.status, text: await res.text(), setCookie };
    }
    const res = await fetch(url, {
        method: init?.method ?? 'GET',
        headers: init?.headers,
        body: init?.body,
        redirect: 'follow',
    });
    const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    return { status: res.status, text: await res.text(), setCookie };
}
function parseYearOptions(html, fallback) {
    const block = (html.match(/name=["']annee["'][\s\S]*?<\/select>/i) || [''])[0];
    if (!block)
        return fallback;
    const years = [];
    const re = /<option value="([^"]*)">([^<]*)<\/option>/gi;
    let m;
    while ((m = re.exec(block)) !== null) {
        const value = m[1].trim();
        const label = decodeHtml(m[2]);
        if (!value)
            continue;
        years.push({ value, label });
    }
    return years.length > 0 ? years : fallback;
}
function parseSchoolOptions(html) {
    const block = (html.match(/name=["']etablissement["'][\s\S]*?<\/select>/i) || [''])[0];
    if (!block)
        return [];
    const schools = [];
    const re = /<option value="(\d+)">\s*([^<]*?)\s*<\/option>/gi;
    let m;
    while ((m = re.exec(block)) !== null) {
        schools.push({ id: m[1], name: decodeHtml(m[2]) });
    }
    return schools;
}
function parseFneSearchResults(html, fileYear) {
    const tbody = (html.match(/<tbody>([\s\S]*?)<\/tbody>/i) || [])[1] || '';
    const results = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(tbody)) !== null) {
        const cell = tr[1];
        const fullName = stripTags((cell.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i) || [])[1] || '');
        const matricule = stripTags((cell.match(/Matricule:\s*<span[^>]*>([\s\S]*?)<\/span>/i) ||
            cell.match(/name=["']matricule["']\s+value=["']([^"']+)["']/i) ||
            [])[1] || '') || '';
        if (!fullName && !matricule)
            continue;
        const para = stripTags((cell.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '');
        const dobMatch = para.match(/Né\(e\)\s+le\s+([0-9]{1,2}-[0-9]{1,2}-[0-9]{4})\s+à\s+(.+?)(?:\s+Père:|$)/i);
        const parentsMatch = para.match(/Père:\s*(.*?)\s*-\s*Mère:\s*(.*?)(?:\s+Etablissement:|\s+Ecole:|$)/i);
        const etabMatch = para.match(/Etablissement:\s*(.+?)\s+Code:\s*(\d+)/i) ||
            para.match(/Ecole:\s*([^\s]+)\s*-\s*(.+?)(?:\s+IEPP:|$)/i);
        let establishment = null;
        let establishmentCode = null;
        if (etabMatch) {
            if (/Etablissement:/i.test(para)) {
                establishment = etabMatch[1]?.trim() || null;
                establishmentCode = etabMatch[2]?.trim() || null;
            }
            else {
                establishmentCode = etabMatch[1]?.trim() || null;
                establishment = etabMatch[2]?.trim() || null;
            }
        }
        results.push({
            fullName,
            matricule,
            dateOfBirth: dobMatch?.[1] ?? null,
            birthPlace: dobMatch?.[2]?.trim() || null,
            father: parentsMatch?.[1]?.trim() || null,
            mother: parentsMatch?.[2]?.trim() || null,
            establishment,
            establishmentCode,
            fileYear,
        });
    }
    return results;
}
/** Convertit une date ISO (yyyy-mm-dd) ou déjà dd-mm-yyyy vers le format du portail FNE. */
function toFneDateFormat(raw) {
    const v = (raw || '').trim();
    if (!v)
        return '';
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(v))
        return v;
    const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso)
        return `${iso[3]}-${iso[2]}-${iso[1]}`;
    const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash)
        return `${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}-${slash[3]}`;
    return v;
}
async function getFneFormOptions(cycle = 'secondary') {
    const ep = endpoints(cycle);
    const formUrl = `${ep.origin}${ep.formPath}`;
    const fallbackYears = cycle === 'primary' ? DEFAULT_PRIMARY_YEARS : DEFAULT_SECONDARY_YEARS;
    try {
        const page = await fetchText(cycle, formUrl);
        if (page.status >= 400) {
            return { cycle, years: fallbackYears, schools: [], formUrl };
        }
        return {
            cycle,
            years: parseYearOptions(page.text, fallbackYears),
            schools: parseSchoolOptions(page.text),
            formUrl,
        };
    }
    catch {
        return { cycle, years: fallbackYears, schools: [], formUrl };
    }
}
async function searchFneMatricule(input) {
    const cycle = input.cycle === 'primary' ? 'primary' : 'secondary';
    const ep = endpoints(cycle);
    const formUrl = `${ep.origin}${ep.formPath}`;
    const postUrl = `${ep.origin}${ep.postPath}`;
    const nom = input.nom.trim().toUpperCase();
    const prenoms = (input.prenoms || '').trim().toUpperCase();
    const datenaiss = toFneDateFormat(input.datenaiss);
    const etablissement = (input.etablissement || '').trim();
    const annee = input.annee.trim();
    if (!nom && !prenoms && !datenaiss && !etablissement) {
        throw new Error('Indiquez au moins un critère (nom, prénoms, date de naissance ou établissement).');
    }
    if (!annee) {
        throw new Error('Sélectionnez un fichier / année FNE.');
    }
    const page = await fetchText(cycle, formUrl);
    if (page.status >= 400) {
        throw new Error(`Portail FNE indisponible (HTTP ${page.status}).`);
    }
    const cookie = page.setCookie.map((c) => c.split(';')[0]).join('; ');
    const body = new URLSearchParams({
        annee,
        nom,
        prenoms,
        datenaiss,
        etablissement,
    }).toString();
    const post = await fetchText(cycle, postUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: ep.origin,
            Referer: formUrl,
            'User-Agent': 'SchoolManager/1.0 (FNE matricule lookup)',
            ...(cookie ? { Cookie: cookie } : {}),
        },
        body,
    });
    if (post.status >= 400) {
        throw new Error(`Recherche FNE refusée (HTTP ${post.status}).`);
    }
    const results = parseFneSearchResults(post.text, annee);
    const truncated = /10 premières personnes/i.test(post.text);
    let note = null;
    if (results.length === 0) {
        note =
            cycle === 'secondary'
                ? 'Aucun résultat. Vérifiez l’orthographe, la date (jj-mm-aaaa) et le fichier année. Le portail secondaire public n’expose parfois que d’anciens fichiers.'
                : 'Aucun résultat sur le fichier primaire pour ces critères.';
    }
    else if (truncated) {
        note = 'Le portail FNE ne renvoie que les 10 premiers résultats — affinez la recherche si besoin.';
    }
    return {
        cycle,
        query: { annee, nom, prenoms, datenaiss, etablissement },
        results,
        truncated,
        sourceUrl: formUrl,
        note,
    };
}
function findSchoolOption(schools, schoolCode, schoolNameHint) {
    const code = (schoolCode || '').trim();
    if (code) {
        const byCode = schools.find((s) => s.id === code || s.id.replace(/^0+/, '') === code.replace(/^0+/, ''));
        if (byCode)
            return byCode;
    }
    const hint = (schoolNameHint || '').trim().toLowerCase();
    if (hint) {
        const byName = schools.find((s) => s.name.toLowerCase().includes(hint) || hint.includes(s.name.toLowerCase()));
        if (byName)
            return byName;
    }
    return null;
}
//# sourceMappingURL=fne-matricule-search.util.js.map