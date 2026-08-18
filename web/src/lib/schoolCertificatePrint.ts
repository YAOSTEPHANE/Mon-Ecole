import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { printHtmlDocument } from '@/lib/printHtml';

export type SchoolCertificateKind = 'SCOLARITE' | 'FREQUENTATION' | 'RADIATION' | 'REUSSITE';

export const SCHOOL_CERTIFICATE_KIND_LABELS: Record<SchoolCertificateKind, string> = {
  SCOLARITE: 'Attestation de scolarité',
  FREQUENTATION: 'Attestation de fréquentation',
  RADIATION: 'Certificat de radiation',
  REUSSITE: 'Attestation de réussite',
};

export type SchoolCertificatePrintOpts = {
  kind: SchoolCertificateKind;
  schoolName: string;
  schoolAddress?: string | null;
  schoolCode?: string | null;
  principal?: string | null;
  academicYear: string;
  studentName: string;
  studentId: string;
  className?: string | null;
  classLevel?: string | null;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string | null;
  issuedAt?: Date;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function civilite(gender?: string | null): string {
  if (gender === 'FEMALE') return 'Mlle / Mme';
  if (gender === 'MALE') return 'M.';
  return 'l’élève';
}

function bodyText(opts: SchoolCertificatePrintOpts): string {
  const name = opts.studentName.trim() || '_______________';
  const year = opts.academicYear.trim() || '_______________';
  const cls = [opts.className, opts.classLevel].filter(Boolean).join(' — ') || '_______________';
  const civ = civilite(opts.gender);
  const birth = opts.dateOfBirth?.trim();
  const birthClause = birth ? `, né(e) le ${birth}` : '';

  switch (opts.kind) {
    case 'SCOLARITE':
      return `Je soussigné(e), chef d’établissement, certifie que ${civ} <strong>${escapeHtml(name)}</strong>${birth ? escapeHtml(birthClause) : ''}, immatriculé(e) sous le n° <strong>${escapeHtml(opts.studentId)}</strong>, est régulièrement inscrit(e) dans cet établissement pour l’année scolaire <strong>${escapeHtml(year)}</strong>, en classe de <strong>${escapeHtml(cls)}</strong>.`;
    case 'FREQUENTATION':
      return `Je soussigné(e), chef d’établissement, certifie que ${civ} <strong>${escapeHtml(name)}</strong>${birth ? escapeHtml(birthClause) : ''}, immatriculé(e) sous le n° <strong>${escapeHtml(opts.studentId)}</strong>, fréquente effectivement cet établissement au titre de l’année scolaire <strong>${escapeHtml(year)}</strong>, en classe de <strong>${escapeHtml(cls)}</strong>.`;
    case 'RADIATION':
      return `Je soussigné(e), chef d’établissement, certifie que ${civ} <strong>${escapeHtml(name)}</strong>${birth ? escapeHtml(birthClause) : ''}, immatriculé(e) sous le n° <strong>${escapeHtml(opts.studentId)}</strong>, a été radié(e) des effectifs de cet établissement. Dernière classe fréquentée : <strong>${escapeHtml(cls)}</strong> (année scolaire <strong>${escapeHtml(year)}</strong>).`;
    case 'REUSSITE':
      return `Je soussigné(e), chef d’établissement, certifie que ${civ} <strong>${escapeHtml(name)}</strong>${birth ? escapeHtml(birthClause) : ''}, immatriculé(e) sous le n° <strong>${escapeHtml(opts.studentId)}</strong>, a validé son parcours en classe de <strong>${escapeHtml(cls)}</strong> au titre de l’année scolaire <strong>${escapeHtml(year)}</strong>.`;
    default: {
      const _exhaustive: never = opts.kind;
      return _exhaustive;
    }
  }
}

export function buildSchoolCertificateHtml(opts: SchoolCertificatePrintOpts): string {
  const title = SCHOOL_CERTIFICATE_KIND_LABELS[opts.kind];
  const school = escapeHtml(opts.schoolName.trim() || 'Établissement scolaire');
  const issued = format(opts.issuedAt ?? new Date(), "d MMMM yyyy", { locale: fr });
  const address = opts.schoolAddress?.trim() ? escapeHtml(opts.schoolAddress.trim()) : '';
  const code = opts.schoolCode?.trim() ? escapeHtml(opts.schoolCode.trim()) : '';
  const principal = opts.principal?.trim() ? escapeHtml(opts.principal.trim()) : '';

  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} — ${school}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: "Segoe UI", Georgia, serif; color: #1c1917; margin: 0; }
  .sheet { max-width: 180mm; margin: 0 auto; }
  .brand { text-align: center; border-bottom: 3px solid #0018A8; padding-bottom: 14px; }
  .brand .gold { height: 4px; background: #EBB02D; margin-bottom: 12px; }
  .school { font-size: 20px; font-weight: 800; letter-spacing: .04em; color: #0018A8; text-transform: uppercase; }
  .meta { font-size: 12px; color: #57534e; margin-top: 6px; }
  h1 { text-align: center; font-size: 18px; letter-spacing: .12em; text-transform: uppercase; color: #0018A8; margin: 28px 0 8px; }
  .ref { text-align: center; font-size: 12px; color: #78716c; margin-bottom: 28px; }
  .body { font-size: 14.5px; line-height: 1.7; text-align: justify; }
  .sign { display: flex; justify-content: space-between; gap: 24px; margin-top: 48px; }
  .sign-box { width: 46%; font-size: 12px; }
  .sign-line { margin-top: 56px; border-top: 1px solid #d6d3d1; padding-top: 6px; color: #57534e; }
  .footer { margin-top: 40px; font-size: 10px; color: #78716c; text-align: center; }
</style>
</head><body>
<div class="sheet">
  <div class="brand">
    <div class="gold"></div>
    <div class="school">${school}</div>
    <div class="meta">${[address, code ? `Code : ${code}` : ''].filter(Boolean).join(' · ')}</div>
  </div>
  <h1>${escapeHtml(title)}</h1>
  <div class="ref">Année scolaire ${escapeHtml(opts.academicYear)} · Matricule ${escapeHtml(opts.studentId)}</div>
  <p class="body">${bodyText(opts)}</p>
  <p class="body">La présente attestation est délivrée pour servir et valoir ce que de droit.</p>
  <div class="sign">
    <div class="sign-box">Fait le ${escapeHtml(issued)}</div>
    <div class="sign-box">
      Le chef d’établissement${principal ? `<br/><strong>${principal}</strong>` : ''}
      <div class="sign-line">Signature et cachet</div>
    </div>
  </div>
  <p class="footer">Document généré par École à jour — usage administratif interne et officiel.</p>
</div>
</body></html>`;
}

export function printSchoolCertificate(opts: SchoolCertificatePrintOpts): void {
  printHtmlDocument(buildSchoolCertificateHtml(opts), 350);
}
