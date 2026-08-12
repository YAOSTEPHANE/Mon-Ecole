export type ClassCouncilMinutesInput = {
  schoolName?: string;
  className: string;
  classLevel?: string;
  period: string;
  academicYear: string;
  meetingDate: Date;
  title?: string | null;
  summary?: string | null;
  decisions?: string | null;
  recommendations?: string | null;
  studentOpinions?: Array<{
    studentName: string;
    subjectOpinion?: string;
    conductOpinion?: string;
    councilDecision?: string;
    average?: number | null;
  }>;
};

export type PayslipHtmlInput = {
  schoolName?: string;
  employeeName: string;
  employeeId: string;
  personKind: string;
  year: number;
  month: number;
  monthLabel: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  notes?: string | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFcfa(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

export function buildClassCouncilMinutesHtml(input: ClassCouncilMinutesInput): string {
  const dateStr = input.meetingDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const opinionsRows =
    input.studentOpinions?.length ?
      input.studentOpinions
        .map(
          (o) =>
            `<tr>
              <td>${escapeHtml(o.studentName)}</td>
              <td>${o.average != null ? o.average.toFixed(2) : '—'}</td>
              <td>${escapeHtml(o.subjectOpinion ?? '—')}</td>
              <td>${escapeHtml(o.conductOpinion ?? '—')}</td>
              <td>${escapeHtml(o.councilDecision ?? '—')}</td>
            </tr>`
        )
        .join('') :
      '<tr><td colspan="5">Aucun avis individuel enregistré.</td></tr>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>PV Conseil de classe — ${escapeHtml(input.className)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 900px; margin: 2rem auto; color: #1c1917; line-height: 1.5; }
    h1 { font-size: 1.35rem; text-align: center; margin-bottom: 0.25rem; }
    .meta { text-align: center; color: #57534e; margin-bottom: 2rem; }
    h2 { font-size: 1rem; border-bottom: 1px solid #d6d3d1; padding-bottom: 0.25rem; margin-top: 1.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5rem; }
    th, td { border: 1px solid #d6d3d1; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }
    th { background: #f5f5f4; }
    .block { white-space: pre-wrap; margin: 0.5rem 0; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>
  <h1>Procès-verbal de conseil de classe</h1>
  <p class="meta">
    ${input.schoolName ? escapeHtml(input.schoolName) + '<br/>' : ''}
    ${escapeHtml(input.className)}${input.classLevel ? ` (${escapeHtml(input.classLevel)})` : ''}<br/>
    ${escapeHtml(input.period)} — ${escapeHtml(input.academicYear)}<br/>
    Séance du ${escapeHtml(dateStr)}
    ${input.title ? `<br/><em>${escapeHtml(input.title)}</em>` : ''}
  </p>

  <h2>Synthèse</h2>
  <div class="block">${escapeHtml(input.summary?.trim() || 'Non renseignée.')}</div>

  <h2>Décisions</h2>
  <div class="block">${escapeHtml(input.decisions?.trim() || 'Non renseignées.')}</div>

  <h2>Recommandations</h2>
  <div class="block">${escapeHtml(input.recommendations?.trim() || 'Non renseignées.')}</div>

  <h2>Avis par élève</h2>
  <table>
    <thead>
      <tr>
        <th>Élève</th>
        <th>Moy.</th>
        <th>Avis matières</th>
        <th>Conduite</th>
        <th>Décision</th>
      </tr>
    </thead>
    <tbody>${opinionsRows}</tbody>
  </table>

  <p style="margin-top:3rem;font-size:0.85rem;color:#78716c;">
    Document généré le ${new Date().toLocaleString('fr-FR')} — École à jour
  </p>
</body>
</html>`;
}

export function buildPayslipHtml(input: PayslipHtmlInput): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Bulletin de paie — ${escapeHtml(input.employeeName)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 720px; margin: 2rem auto; color: #1c1917; }
    h1 { font-size: 1.25rem; text-align: center; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0; }
    .box { border: 1px solid #d6d3d1; padding: 0.75rem; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { border: 1px solid #d6d3d1; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f4; }
    .net { font-size: 1.15rem; font-weight: bold; text-align: right; margin-top: 1rem; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>
  <h1>Bulletin de paie</h1>
  <p style="text-align:center;color:#57534e;">${escapeHtml(input.monthLabel)}</p>
  ${input.schoolName ? `<p style="text-align:center;">${escapeHtml(input.schoolName)}</p>` : ''}

  <div class="grid">
    <div class="box">
      <strong>Salarié</strong><br/>
      ${escapeHtml(input.employeeName)}<br/>
      Matricule : ${escapeHtml(input.employeeId)}<br/>
      Catégorie : ${escapeHtml(input.personKind)}
    </div>
    <div class="box">
      <strong>Période</strong><br/>
      ${input.month}/${input.year}
    </div>
  </div>

  <table>
    <thead><tr><th>Libellé</th><th>Montant</th></tr></thead>
    <tbody>
      <tr><td>Salaire de base</td><td>${formatFcfa(input.baseSalary)}</td></tr>
      <tr><td>Primes / indemnités</td><td>${formatFcfa(input.bonuses)}</td></tr>
      <tr><td>Retenues</td><td>- ${formatFcfa(input.deductions)}</td></tr>
    </tbody>
  </table>

  <p class="net">Net à payer : ${formatFcfa(input.netPay)}</p>

  ${input.notes?.trim() ? `<p><strong>Notes :</strong> ${escapeHtml(input.notes.trim())}</p>` : ''}

  <p style="margin-top:2rem;font-size:0.8rem;color:#78716c;">
    Document généré le ${new Date().toLocaleString('fr-FR')} — École à jour
  </p>
</body>
</html>`;
}
