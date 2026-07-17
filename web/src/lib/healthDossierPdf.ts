import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export type HealthDossierPdfPayload = {
  schoolName?: string | null;
  studentId: string;
  studentCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  className?: string | null;
  classLevel?: string | null;
  medicalInfo?: string | null;
  allergiesText?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  emergencyContact2?: string | null;
  emergencyPhone2?: string | null;
  healthDossier?: {
    medicalHistory?: string | null;
    familyDoctorName?: string | null;
    familyDoctorPhone?: string | null;
    preferredHospital?: string | null;
    insuranceInfo?: string | null;
    bloodGroup?: string | null;
    additionalNotes?: string | null;
  } | null;
  vaccinations?: {
    vaccineName: string;
    administeredAt: string;
    doseLabel?: string | null;
    batchNumber?: string | null;
  }[];
  allergyRecords?: {
    allergen: string;
    severity?: string | null;
    reaction?: string | null;
  }[];
  treatments?: {
    medication: string;
    dosage?: string | null;
    schedule?: string | null;
    isActive?: boolean;
    startDate?: string | null;
    endDate?: string | null;
  }[];
  infirmaryVisits?: {
    visitedAt: string;
    motive: string;
    outcome?: string | null;
  }[];
};

const OUTCOME_LABELS: Record<string, string> = {
  RETURN_TO_CLASS: 'Retour en classe',
  SENT_HOME: 'Retour à domicile',
  PARENT_PICKUP: 'Récupération parent',
  REFERRED_HOSPITAL: 'Orientation hôpital / SAMU',
  REST_INFIRMARY: 'Repos infirmerie',
  OTHER: 'Autre',
};

const C = {
  rose: [190, 18, 60] as [number, number, number],
  ink: [28, 25, 23] as [number, number, number],
  muted: [87, 83, 78] as [number, number, number],
  line: [231, 229, 228] as [number, number, number],
};

function slugifyFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function val(v: string | null | undefined, fallback = '—'): string {
  const t = v?.trim();
  return t ? t : fallback;
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
  doc.setTextColor(...C.ink);
  doc.text(title, x, y);
  y += 5;
  doc.setDrawColor(...C.rose);
  doc.setLineWidth(0.35);
  doc.line(x, y, pageWidth - x, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  const lines = doc.splitTextToSize(body, maxWidth);
  for (const line of lines) {
    if (y > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += 5;
  }
  return y + 4;
}

export function downloadHealthDossierPdf(payload: HealthDossierPdfPayload): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxWidth = pageWidth - margin * 2;
  let y = 18;

  const schoolName = payload.schoolName?.trim();
  if (schoolName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.rose);
    doc.text(schoolName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 7;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C.ink);
  doc.text('DOSSIER MÉDICAL ÉLÈVE', pageWidth / 2, y, { align: 'center' });
  y += 9;

  const fullName = [payload.lastName, payload.firstName].filter(Boolean).join(' ').trim() || 'Élève';
  doc.setFontSize(12);
  doc.text(fullName, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  const meta: string[] = [];
  if (payload.studentCode) meta.push(`Matricule : ${payload.studentCode}`);
  if (payload.className) {
    meta.push(`Classe : ${payload.classLevel ? `${payload.classLevel} — ` : ''}${payload.className}`);
  }
  meta.push(`Édition : ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`);
  for (const line of meta) {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 4.5;
  }
  y += 5;

  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const hd = payload.healthDossier;
  const identityLines = [
    `Groupe sanguin : ${val(hd?.bloodGroup)}`,
    `Contact urgence 1 : ${val(payload.emergencyContact)} — ${val(payload.emergencyPhone)}`,
    `Contact urgence 2 : ${val(payload.emergencyContact2)} — ${val(payload.emergencyPhone2)}`,
    `Médecin traitant : ${val(hd?.familyDoctorName)} — ${val(hd?.familyDoctorPhone)}`,
    `Hôpital de référence : ${val(hd?.preferredHospital)}`,
    `Assurance / mutuelle : ${val(hd?.insuranceInfo)}`,
  ];
  y = writeSection(doc, 'Coordonnées & contacts', identityLines.join('\n'), margin, y, maxWidth, pageWidth, pageHeight);

  if (hd?.medicalHistory?.trim()) {
    y = writeSection(doc, 'Historique médical', hd.medicalHistory.trim(), margin, y, maxWidth, pageWidth, pageHeight);
  }
  if (payload.medicalInfo?.trim()) {
    y = writeSection(doc, 'Informations médicales (fiche élève)', payload.medicalInfo.trim(), margin, y, maxWidth, pageWidth, pageHeight);
  }
  if (payload.allergiesText?.trim()) {
    y = writeSection(doc, 'Allergies (texte libre)', payload.allergiesText.trim(), margin, y, maxWidth, pageWidth, pageHeight);
  }
  if (hd?.additionalNotes?.trim()) {
    y = writeSection(doc, 'Notes infirmerie', hd.additionalNotes.trim(), margin, y, maxWidth, pageWidth, pageHeight);
  }

  const vaccinations = payload.vaccinations ?? [];
  if (vaccinations.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.ink);
    doc.text('Vaccinations', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Vaccin', 'Date', 'Dose', 'Lot']],
      body: vaccinations.map((v) => [
        v.vaccineName,
        format(new Date(v.administeredAt), 'dd/MM/yyyy', { locale: fr }),
        val(v.doseLabel ?? undefined, ''),
        val(v.batchNumber ?? undefined, ''),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: C.rose, textColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  const allergies = payload.allergyRecords ?? [];
  if (allergies.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Allergies et intolérances', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Allergène', 'Sévérité', 'Réaction']],
      body: allergies.map((a) => [a.allergen, val(a.severity ?? undefined, ''), val(a.reaction ?? undefined, '')]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: C.rose, textColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  const treatments = (payload.treatments ?? []).filter((t) => t.isActive !== false);
  if (treatments.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Traitements en cours', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Médicament', 'Posologie', 'Horaires', 'Période']],
      body: treatments.map((t) => {
        const period = [t.startDate, t.endDate]
          .filter(Boolean)
          .map((d) => format(new Date(d as string), 'dd/MM/yyyy', { locale: fr }))
          .join(' → ');
        return [t.medication, val(t.dosage ?? undefined, ''), val(t.schedule ?? undefined, ''), period || '—'];
      }),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: C.rose, textColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  const visits = payload.infirmaryVisits ?? [];
  if (visits.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Dernières visites infirmerie', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'Motif', 'Issue']],
      body: visits.slice(0, 15).map((v) => [
        format(new Date(v.visitedAt), 'dd/MM/yyyy HH:mm', { locale: fr }),
        v.motive,
        OUTCOME_LABELS[v.outcome ?? ''] ?? val(v.outcome ?? undefined, ''),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: C.rose, textColor: [255, 255, 255] },
      theme: 'grid',
    });
  }

  const footerY = pageHeight - 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158);
  doc.text(
    'Document confidentiel — données de santé (RGPD). Usage réservé à l’infirmerie et à l’administration.',
    pageWidth / 2,
    footerY,
    { align: 'center' },
  );

  const baseName = slugifyFilename(`${payload.lastName ?? ''}-${payload.firstName ?? ''}-${payload.studentCode ?? 'eleve'}`);
  doc.save(`dossier-medical-${baseName || payload.studentId}.pdf`);
}

export function dossierToPdfPayload(
  dossier: Record<string, unknown>,
  schoolName?: string | null,
): HealthDossierPdfPayload {
  const user = dossier.user as { firstName?: string; lastName?: string } | undefined;
  const cls = dossier.class as { name?: string; level?: string } | undefined;
  return {
    schoolName,
    studentId: String(dossier.id ?? ''),
    studentCode: dossier.studentId != null ? String(dossier.studentId) : null,
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    className: cls?.name ?? null,
    classLevel: cls?.level ?? null,
    medicalInfo: dossier.medicalInfo != null ? String(dossier.medicalInfo) : null,
    allergiesText: dossier.allergies != null ? String(dossier.allergies) : null,
    emergencyContact: dossier.emergencyContact != null ? String(dossier.emergencyContact) : null,
    emergencyPhone: dossier.emergencyPhone != null ? String(dossier.emergencyPhone) : null,
    emergencyContact2: dossier.emergencyContact2 != null ? String(dossier.emergencyContact2) : null,
    emergencyPhone2: dossier.emergencyPhone2 != null ? String(dossier.emergencyPhone2) : null,
    healthDossier: (dossier.healthDossier as HealthDossierPdfPayload['healthDossier']) ?? null,
    vaccinations: (dossier.vaccinations as HealthDossierPdfPayload['vaccinations']) ?? [],
    allergyRecords: (dossier.allergyRecords as HealthDossierPdfPayload['allergyRecords']) ?? [],
    treatments: (dossier.treatments as HealthDossierPdfPayload['treatments']) ?? [],
    infirmaryVisits: (dossier.infirmaryVisits as HealthDossierPdfPayload['infirmaryVisits']) ?? [],
  };
}
