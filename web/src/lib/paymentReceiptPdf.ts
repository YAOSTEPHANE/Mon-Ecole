import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatFCFAForPdf } from '../utils/currency';

export type PaymentReceiptBranding = {
  schoolName?: string | null;
  schoolPhone?: string | null;
  schoolEmail?: string | null;
  schoolAddress?: string | null;
  schoolPrincipal?: string | null;
  logoAbsoluteUrl?: string | null;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  MOBILE_MONEY: 'Mobile money',
  CARD: 'Carte bancaire',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administration',
  PARENT: 'Parent',
  STUDENT: 'Élève',
  TEACHER: 'Enseignant',
  EDUCATOR: 'Éducateur',
  STAFF: 'Personnel',
};

/** Palette premium — ardoise profonde + or + teal */
const C = {
  ink: [15, 23, 42] as [number, number, number],
  inkSoft: [51, 65, 85] as [number, number, number],
  gold: [201, 162, 39] as [number, number, number],
  goldLight: [250, 245, 230] as [number, number, number],
  teal: [13, 148, 136] as [number, number, number],
  tealDark: [15, 118, 110] as [number, number, number],
  paper: [252, 252, 253] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  successBg: [240, 253, 244] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function imageFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  return 'JPEG';
}

function resolvePaymentAmount(payment: { amount?: number | string | null }): number {
  const raw = payment.amount;
  if (raw == null || raw === '') return 0;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function sanitizePdfText(value: string): string {
  return value.replace(/\u202f/g, ' ').replace(/\u00a0/g, ' ');
}

function drawOuterFrame(doc: jsPDF, w: number, h: number, margin: number) {
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.45);
  doc.roundedRect(margin, margin, w - margin * 2, h - margin * 2, 3, 3, 'S');
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin + 2, margin + 2, w - (margin + 2) * 2, h - (margin + 2) * 2, 2, 2, 'S');
}

function drawGoldRule(doc: jsPDF, x: number, y: number, width: number) {
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.55);
  doc.line(x, y, x + width, y);
  doc.setDrawColor(...C.goldLight);
  doc.setLineWidth(0.15);
  doc.line(x, y + 0.8, x + width, y + 0.8);
}

function drawPaidSeal(doc: jsPDF, cx: number, cy: number, visible: boolean) {
  if (!visible) return;
  doc.setGState(doc.GState({ opacity: 0.92 }));
  doc.setDrawColor(...C.success);
  doc.setLineWidth(0.7);
  doc.setFillColor(...C.successBg);
  doc.circle(cx, cy, 15, 'FD');
  doc.setDrawColor(...C.success);
  doc.setLineWidth(0.35);
  doc.circle(cx, cy, 12.5, 'S');
  doc.setTextColor(...C.success);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PAYÉ', cx, cy + 1.2, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('CONFIRMÉ', cx, cy + 5.5, { align: 'center' });
  doc.setGState(doc.GState({ opacity: 1 }));
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFillColor(...C.ink);
  doc.roundedRect(x, y, 3, 7, 0.5, 0.5, 'F');
  doc.setTextColor(...C.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(title.toUpperCase(), x + 6, y + 5);
}

function drawAmountHero(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  amount: number,
  periodLabel: string | null,
) {
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(x + 1.2, y + 1.2, width, 34, 3, 3, 'F');
  doc.setFillColor(...C.ink);
  doc.roundedRect(x, y, width, 34, 3, 3, 'F');
  doc.setFillColor(...C.tealDark);
  doc.roundedRect(x, y, width, 6, 3, 3, 'F');
  doc.rect(x, y + 3, width, 3, 'F');

  doc.setTextColor(...C.goldLight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('MONTANT ENCAISSÉ', x + 8, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...C.white);
  doc.text(formatFCFAForPdf(amount), x + 8, y + 26);
  if (periodLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(sanitizePdfText(periodLabel), x + width - 8, y + 26, { align: 'right' });
  }
}

function drawVerificationBlock(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  reference: string,
  generatedAt: string,
) {
  doc.setFillColor(...C.goldLight);
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, 22, 2, 2, 'FD');
  doc.setTextColor(...C.inkSoft);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('AUTHENTIFICATION DU DOCUMENT', x + 5, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.ink);
  doc.text(`Réf. ${sanitizePdfText(reference)}`, x + 5, y + 12);
  doc.text(`Émis le ${generatedAt}`, x + 5, y + 17);
  doc.setFontSize(6.5);
  doc.setTextColor(...C.inkSoft);
  doc.text('Document électronique — valeur de reçu officiel', x + width - 5, y + 17, { align: 'right' });
}

function drawSignatureBlock(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  principalName: string | null | undefined,
) {
  const colW = (width - 8) / 2;
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.25);
  doc.line(x, y + 14, x + colW, y + 14);
  doc.line(x + colW + 8, y + 14, x + width, y + 14);
  doc.setTextColor(...C.inkSoft);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Signature du payeur', x + colW / 2, y + 19, { align: 'center' });
  const sigRight = principalName?.trim()
    ? sanitizePdfText(principalName.trim())
    : 'Le service comptabilité';
  doc.text(sigRight, x + colW + 8 + colW / 2, y + 10, { align: 'center' });
  doc.text('Cachet & signature établissement', x + colW + 8 + colW / 2, y + 19, { align: 'center' });
}

export async function downloadPaymentReceiptPdf(
  payment: {
    id: string;
    amount?: number | string | null;
    status: string;
    paymentMethod?: string;
    paymentReference?: string | null;
    transactionId?: string | null;
    createdAt: string;
    paidAt?: string | null;
    payer?: { firstName: string; lastName: string; email?: string; role?: string };
    student?: {
      user?: { firstName: string; lastName: string };
      class?: { name: string };
      studentId?: string;
    };
    tuitionFee?: {
      period?: string;
      academicYear?: string;
      description?: string | null;
    };
  },
  branding?: PaymentReceiptBranding,
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 11;
  const innerX = margin + 5;
  const innerW = w - (margin + 5) * 2;

  const amount = resolvePaymentAmount(payment);
  const schoolName = branding?.schoolName?.trim() || 'Établissement scolaire';
  const reference = String(payment.paymentReference || payment.id.slice(-12));
  const paidDate = new Date(payment.paidAt || payment.createdAt);
  const generatedAt = format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr });
  const paidAtLabel = format(paidDate, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  const isPaid = payment.status === 'COMPLETED';

  const logoDataUrl = branding?.logoAbsoluteUrl
    ? await fetchImageDataUrl(branding.logoAbsoluteUrl)
    : null;

  doc.setFillColor(...C.paper);
  doc.rect(0, 0, w, h, 'F');
  drawOuterFrame(doc, w, h, margin);

  let y = margin + 7;

  // —— En-tête institutionnel ——
  const logoSize = 24;
  const logoX = innerX;
  const logoY = y;

  if (logoDataUrl) {
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.35);
    doc.roundedRect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2, 2, 2, 'FD');
    doc.addImage(
      logoDataUrl,
      imageFormatFromDataUrl(logoDataUrl),
      logoX,
      logoY,
      logoSize,
      logoSize,
    );
  }

  const headTextX = logoDataUrl ? innerX + logoSize + 8 : innerX;
  doc.setTextColor(...C.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(sanitizePdfText(schoolName), headTextX, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.inkSoft);
  let contactY = y + 12;
  if (branding?.schoolAddress?.trim()) {
    const addrLines = doc.splitTextToSize(sanitizePdfText(branding.schoolAddress.trim()), innerW * 0.48);
    doc.text(addrLines, headTextX, contactY);
    contactY += addrLines.length * 3.6;
  }
  const contacts: string[] = [];
  if (branding?.schoolPhone?.trim()) contacts.push(branding.schoolPhone.trim());
  if (branding?.schoolEmail?.trim()) contacts.push(branding.schoolEmail.trim());
  if (contacts.length) {
    doc.text(contacts.join('  ·  '), headTextX, contactY);
  }

  // Méta reçu (droite)
  const metaW = 52;
  const metaX = innerX + innerW - metaW;
  doc.setFillColor(...C.goldLight);
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.3);
  doc.roundedRect(metaX, y, metaW, 28, 2, 2, 'FD');
  doc.setTextColor(...C.inkSoft);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('N° DE REÇU', metaX + metaW / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.ink);
  doc.text(sanitizePdfText(reference), metaX + metaW / 2, y + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.inkSoft);
  doc.text(format(paidDate, 'dd/MM/yyyy', { locale: fr }), metaX + metaW / 2, y + 18, { align: 'center' });
  doc.text(format(paidDate, 'HH:mm', { locale: fr }), metaX + metaW / 2, y + 22, { align: 'center' });

  y = Math.max(y + logoSize + 4, contactY + 6);
  drawGoldRule(doc, innerX, y, innerW);
  y += 7;

  // —— Titre officiel ——
  doc.setFillColor(...C.ink);
  doc.roundedRect(innerX, y, innerW, 11, 1.5, 1.5, 'F');
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REÇU OFFICIEL DE PAIEMENT', w / 2, y + 7.2, { align: 'center' });
  y += 16;

  // —— Montant héro + sceau ——
  const periodParts = [
    payment.tuitionFee?.period,
    payment.tuitionFee?.academicYear,
  ].filter(Boolean);
  const periodLabel = periodParts.length ? periodParts.join(' · ') : null;

  drawAmountHero(doc, innerX, y, innerW - 36, amount, periodLabel);
  drawPaidSeal(doc, innerX + innerW - 18, y + 17, isPaid);
  y += 42;

  // —— Tableaux détails (deux colonnes) ——
  const methodKey = String(payment.paymentMethod || '');
  const methodLabel = PAYMENT_METHOD_LABELS[methodKey] || methodKey || '—';
  const payerRole = payment.payer?.role
    ? ROLE_LABELS[payment.payer.role] || payment.payer.role
    : null;

  const paymentRows: string[][] = [
    ['Date de règlement', sanitizePdfText(paidAtLabel)],
    ['Statut', isPaid ? 'Payé et confirmé' : sanitizePdfText(payment.status)],
    ['Mode de règlement', methodLabel],
  ];
  if (payment.transactionId) {
    paymentRows.push(['N° transaction', sanitizePdfText(payment.transactionId)]);
  }
  if (payment.payer) {
    paymentRows.push([
      'Payeur',
      sanitizePdfText(
        `${payment.payer.firstName} ${payment.payer.lastName}${payerRole ? ` (${payerRole})` : ''}`,
      ),
    ]);
    if (payment.payer.email) {
      paymentRows.push(['E-mail payeur', sanitizePdfText(payment.payer.email)]);
    }
  }

  const studentRows: string[][] = [];
  if (payment.student?.user) {
    studentRows.push([
      'Nom complet',
      sanitizePdfText(`${payment.student.user.firstName} ${payment.student.user.lastName}`),
    ]);
  }
  if (payment.student?.studentId) {
    studentRows.push(['Matricule', sanitizePdfText(payment.student.studentId)]);
  }
  if (payment.student?.class?.name) {
    studentRows.push(['Classe', sanitizePdfText(payment.student.class.name)]);
  }
  if (payment.tuitionFee?.academicYear) {
    studentRows.push(['Année scolaire', sanitizePdfText(payment.tuitionFee.academicYear)]);
  }
  if (payment.tuitionFee?.period) {
    studentRows.push(['Période / échéance', sanitizePdfText(payment.tuitionFee.period)]);
  }
  if (payment.tuitionFee?.description) {
    studentRows.push(['Objet du paiement', sanitizePdfText(payment.tuitionFee.description)]);
  }
  if (studentRows.length === 0) {
    studentRows.push(['—', 'Informations élève non renseignées']);
  }

  drawSectionTitle(doc, 'Transaction', innerX, y);
  drawSectionTitle(doc, 'Bénéficiaire', innerX + innerW / 2 + 2, y);
  y += 9;

  const colW = (innerW - 4) / 2;
  const tableStyles = {
    fontSize: 8,
    cellPadding: 2.8,
    textColor: C.ink,
    lineColor: C.line,
    lineWidth: 0.15,
  };

  autoTable(doc, {
    startY: y,
    margin: { left: innerX, right: innerX + colW + 4 },
    tableWidth: colW,
    theme: 'plain',
    styles: tableStyles,
    columnStyles: {
      0: { fontStyle: 'bold', textColor: C.inkSoft, cellWidth: 34 },
      1: { textColor: C.ink },
    },
    body: paymentRows,
  });

  const leftTableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

  autoTable(doc, {
    startY: y,
    margin: { left: innerX + colW + 4 },
    tableWidth: colW,
    theme: 'plain',
    styles: tableStyles,
    columnStyles: {
      0: { fontStyle: 'bold', textColor: C.inkSoft, cellWidth: 34 },
      1: { textColor: C.ink },
    },
    body: studentRows,
  });

  const rightTableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  y = Math.max(leftTableEnd, rightTableEnd) + 8;

  // —— Bloc vérification ——
  drawVerificationBlock(doc, innerX, y, innerW, reference, generatedAt);
  y += 28;

  // —— Mentions & signatures ——
  doc.setFillColor(...C.line);
  doc.rect(innerX, y, innerW, 0.2, 'F');
  y += 6;

  doc.setTextColor(...C.inkSoft);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  const legal =
    'Ce reçu atteste du règlement des frais scolaires indiqués ci-dessus. Il est délivré pour servir et valoir ce que de droit. Toute falsification est passible de poursuites.';
  const legalLines = doc.splitTextToSize(legal, innerW);
  doc.text(legalLines, innerX, y);
  y += legalLines.length * 3.5 + 6;

  drawSignatureBlock(doc, innerX, y, innerW, branding?.schoolPrincipal);
  y += 26;

  // —— Pied de page ——
  const footerY = h - margin - 8;
  drawGoldRule(doc, innerX, footerY - 4, innerW);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.inkSoft);
  doc.text(sanitizePdfText(schoolName), innerX, footerY);
  doc.text(`Reçu ${reference}`, w / 2, footerY, { align: 'center' });
  doc.text(generatedAt, innerX + innerW, footerY, { align: 'right' });

  doc.save(
    `recu-paiement-${payment.paymentReference || payment.id.slice(-8)}-${format(new Date(), 'yyyyMMdd')}.pdf`,
  );
}
