import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatFCFAForPdf } from '../utils/currency';

const EXPENSE_CAT_LABELS: Record<string, string> = {
  SUPPLIES: 'Fournitures',
  SERVICES: 'Services',
  UTILITIES: 'Charges',
  MAINTENANCE: 'Maintenance',
  PAYROLL_AUX: 'Masse salariale aux.',
  TRANSPORT: 'Transport',
  CATERING: 'Restauration',
  IT: 'Informatique',
  OTHER: 'Autre',
};

export type FinancialBreakdownPdfRow = {
  key: string;
  label: string;
  level?: string;
  paidAmount: number;
  paidCount: number;
  unpaidAmount: number;
  unpaidCount: number;
  overdueAmount: number;
  overdueCount: number;
  studentsPaid: number;
  studentsUnpaid: number;
};

export type FinancialBreakdownPdfInput = {
  academicYear?: string | null;
  note?: string | null;
  overview?: {
    paidAmount: number;
    paidCount: number;
    studentsWithPayments: number;
    unpaidAmount: number;
    unpaidCount: number;
    studentsWithUnpaid: number;
    overdueAmount: number;
    overdueCount: number;
    expensesAmount: number;
    expensesCount: number;
    netEncaissementsMoinsDepenses: number;
  };
  byClass?: FinancialBreakdownPdfRow[];
  byLevel?: FinancialBreakdownPdfRow[];
  byGender?: FinancialBreakdownPdfRow[];
  expensesByCategory?: Array<{ category: string; count: number; totalAmount: number }>;
};

function useAutoTable(doc: jsPDF, opts: Record<string, unknown>) {
  if (typeof (doc as unknown as { autoTable?: (o: unknown) => void }).autoTable === 'function') {
    (doc as unknown as { autoTable: (o: unknown) => void }).autoTable(opts);
  } else {
    autoTable(doc, opts);
  }
}

function lastTableY(doc: jsPDF, fallback: number): number {
  const y = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
  return typeof y === 'number' ? y + 10 : fallback;
}

function moneyRowsBody(rows: FinancialBreakdownPdfRow[], withLevel: boolean): string[][] {
  return rows.map((r) => {
    const base = [
      r.label,
      ...(withLevel ? [r.level ?? '—'] : []),
      formatFCFAForPdf(r.paidAmount),
      String(r.paidCount),
      formatFCFAForPdf(r.unpaidAmount),
      String(r.unpaidCount),
      formatFCFAForPdf(r.overdueAmount),
      `${r.studentsPaid} / ${r.studentsUnpaid}`,
    ];
    return base;
  });
}

export function downloadFinancialServicePdf(payload: FinancialBreakdownPdfInput): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const generated = format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr });

  doc.setFontSize(16);
  doc.setTextColor(6, 95, 70);
  doc.text('Service financier — rapport', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Année : ${payload.academicYear || 'Toutes'}  ·  Généré le ${generated}`,
    14,
    22
  );
  if (payload.note) {
    const noteLines = doc.splitTextToSize(payload.note, 270);
    doc.text(noteLines, 14, 27);
  }

  const ov = payload.overview;
  let y = payload.note ? 27 + Math.min(12, (doc.splitTextToSize(payload.note, 270).length || 1) * 4) + 4 : 32;

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Point général', 14, y);
  y += 2;

  useAutoTable(doc, {
    startY: y + 2,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Encaissements', formatFCFAForPdf(ov?.paidAmount ?? 0)],
      ['Nombre de paiements', String(ov?.paidCount ?? 0)],
      ['Élèves ayant payé', String(ov?.studentsWithPayments ?? 0)],
      ['Impayés (solde)', formatFCFAForPdf(ov?.unpaidAmount ?? 0)],
      ['Échéances impayées', String(ov?.unpaidCount ?? 0)],
      ['Élèves avec impayés', String(ov?.studentsWithUnpaid ?? 0)],
      ['En retard', formatFCFAForPdf(ov?.overdueAmount ?? 0)],
      ['Échéances en retard', String(ov?.overdueCount ?? 0)],
      ['Dépenses', formatFCFAForPdf(ov?.expensesAmount ?? 0)],
      ['Nb dépenses', String(ov?.expensesCount ?? 0)],
      ['Net (encaissements − dépenses)', formatFCFAForPdf(ov?.netEncaissementsMoinsDepenses ?? 0)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 },
    columnStyles: { 1: { halign: 'right' } },
  });

  const section = (
    title: string,
    rows: FinancialBreakdownPdfRow[],
    withLevel: boolean
  ) => {
    let startY = lastTableY(doc, 40);
    if (startY > 175) {
      doc.addPage();
      startY = 16;
    }
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, startY);
    useAutoTable(doc, {
      startY: startY + 3,
      head: [
        withLevel
          ? [
              'Libellé',
              'Niveau',
              'Encaissé',
              'Paiements',
              'Impayés',
              'Échéances',
              'En retard',
              'Élèves (payé / dû)',
            ]
          : [
              'Libellé',
              'Encaissé',
              'Paiements',
              'Impayés',
              'Échéances',
              'En retard',
              'Élèves (payé / dû)',
            ],
      ],
      body:
        rows.length > 0
          ? moneyRowsBody(rows, withLevel)
          : [['Aucune donnée', ...(withLevel ? [''] : []), '', '', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 7, cellPadding: 1.5 },
      margin: { left: 14, right: 14 },
    });
  };

  section('Paiements & impayés par classe', payload.byClass ?? [], true);
  section('Paiements & impayés par niveau', payload.byLevel ?? [], false);
  section('Paiements & impayés par sexe', payload.byGender ?? [], false);

  let expY = lastTableY(doc, 40);
  if (expY > 175) {
    doc.addPage();
    expY = 16;
  }
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Dépenses par catégorie', 14, expY);
  const expRows = (payload.expensesByCategory ?? []).map((e) => [
    EXPENSE_CAT_LABELS[e.category] ?? e.category,
    String(e.count),
    formatFCFAForPdf(e.totalAmount),
  ]);
  useAutoTable(doc, {
    startY: expY + 3,
    head: [['Catégorie', 'Nb', 'Montant']],
    body: expRows.length > 0 ? expRows : [['Aucune dépense', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  });

  const stamp = format(new Date(), 'yyyy-MM-dd');
  const yearSlug = (payload.academicYear || 'toutes').replace(/[^\w-]+/g, '_');
  doc.save(`service-financier-${yearSlug}-${stamp}.pdf`);
}
