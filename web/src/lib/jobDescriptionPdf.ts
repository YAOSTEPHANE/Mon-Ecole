import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CATEGORY_LABELS: Record<string, string> = {
  ADMINISTRATION: 'Administration',
  SUPPORT: 'Soutien',
  SECURITY: 'Sécurité / gardiennage',
};

export type JobDescriptionPdfPayload = {
  title: string;
  code?: string | null;
  summary?: string | null;
  responsibilities: string;
  requirements?: string | null;
  suggestedCategory?: string | null;
  suggestedCategoryOther?: string | null;
  isActive?: boolean;
  schoolName?: string | null;
};

function resolveCategoryLabel(job: JobDescriptionPdfPayload): string | null {
  if (job.suggestedCategory) {
    return CATEGORY_LABELS[job.suggestedCategory] ?? job.suggestedCategory;
  }
  if (job.suggestedCategoryOther?.trim()) {
    return job.suggestedCategoryOther.trim();
  }
  return null;
}

function slugifyFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function writeParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  pageHeight: number,
  bottomMargin: number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    if (y > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function writeSection(
  doc: jsPDF,
  title: string,
  body: string,
  x: number,
  y: number,
  maxWidth: number,
  pageWidth: number,
  pageHeight: number,
): number {
  const bottomMargin = 18;
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(title, x, y);
  y += 6;

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.4);
  doc.line(x, y, pageWidth - x, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(68, 64, 60);
  y = writeParagraph(doc, body, x, y, maxWidth, 5.2, pageHeight, bottomMargin);
  return y + 4;
}

export function downloadJobDescriptionPdf(job: JobDescriptionPdfPayload): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const schoolName = job.schoolName?.trim();
  if (schoolName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(120, 53, 15);
    doc.text(schoolName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text('FICHE DE POSTE', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(13);
  doc.text(job.title.trim(), pageWidth / 2, y, { align: 'center' });
  y += 8;

  const meta: string[] = [];
  if (job.code?.trim()) meta.push(`Code : ${job.code.trim()}`);
  const category = resolveCategoryLabel(job);
  if (category) meta.push(`Catégorie : ${category}`);
  meta.push(`Statut : ${job.isActive === false ? 'Désactivée' : 'Activée'}`);
  meta.push(`Édition : ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  for (const line of meta) {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 4.5;
  }
  y += 4;

  if (job.summary?.trim()) {
    y = writeSection(doc, 'Résumé', job.summary.trim(), margin, y, maxWidth, pageWidth, pageHeight);
  }

  y = writeSection(
    doc,
    'Missions et responsabilités',
    job.responsibilities.trim(),
    margin,
    y,
    maxWidth,
    pageWidth,
    pageHeight,
  );

  if (job.requirements?.trim()) {
    y = writeSection(
      doc,
      'Exigences et compétences',
      job.requirements.trim(),
      margin,
      y,
      maxWidth,
      pageWidth,
      pageHeight,
    );
  }

  const footerY = pageHeight - 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(168, 162, 158);
  doc.text('Document généré depuis le référentiel RH de l’établissement.', pageWidth / 2, footerY, {
    align: 'center',
  });

  const baseName = slugifyFilename(job.code?.trim() || job.title.trim() || 'fiche-poste');
  doc.save(`fiche-poste-${baseName || 'export'}.pdf`);
}
