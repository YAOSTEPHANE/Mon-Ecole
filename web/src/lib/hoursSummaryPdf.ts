import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export type HoursGroupBy = 'day' | 'week' | 'month';

export type HoursSummaryPdfInput = {
  mode: 'teachers' | 'staff';
  from: string;
  to: string;
  groupBy: HoursGroupBy;
  totals?: {
    sessions: number;
    hours: number;
    plannedHours?: number;
    presentDays?: number;
    teachersCount?: number;
    staffCount?: number;
  };
  byPeriod?: Array<{
    label: string;
    hours: number;
    sessions: number;
    minutes: number;
  }>;
  byTeacher?: Array<{
    firstName: string;
    lastName: string;
    employeeId: string;
    hours: number;
    sessions: number;
    maxWeeklyHours: number | null;
  }>;
  byStaff?: Array<{
    firstName: string;
    lastName: string;
    employeeId: string;
    jobTitle: string | null;
    hours: number;
    sessions: number;
    presentDays: number;
  }>;
};

const GROUP_LABEL: Record<HoursGroupBy, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
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

function fmtHours(n: number): string {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h`;
}

export function downloadHoursSummaryPdf(payload: HoursSummaryPdfInput): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generated = format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  const title =
    payload.mode === 'teachers'
      ? 'Décompte des heures par enseignant'
      : 'Décompte des heures par personnel';

  doc.setFontSize(15);
  doc.setTextColor(13, 148, 136);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Période : ${payload.from} → ${payload.to}  ·  Regroupement : ${GROUP_LABEL[payload.groupBy]}  ·  ${generated}`,
    14,
    22
  );

  const t = payload.totals;
  useAutoTable(doc, {
    startY: 28,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Heures totales', fmtHours(t?.hours ?? 0)],
      ['Sessions / jours pointés', String(t?.sessions ?? 0)],
      ...(payload.mode === 'teachers'
        ? [['Heures prévues (créneaux)', fmtHours(t?.plannedHours ?? 0)]]
        : [['Jours présents', String(t?.presentDays ?? 0)]]),
      [
        'Personnes',
        String(payload.mode === 'teachers' ? t?.teachersCount ?? 0 : t?.staffCount ?? 0),
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 },
    margin: { left: 14, right: 14 },
    columnStyles: { 1: { halign: 'right' } },
  });

  let y = lastTableY(doc, 50);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Par période', 14, y);
  useAutoTable(doc, {
    startY: y + 3,
    head: [['Période', 'Heures', 'Sessions']],
    body:
      (payload.byPeriod ?? []).length > 0
        ? (payload.byPeriod ?? []).map((p) => [p.label, fmtHours(p.hours), String(p.sessions)])
        : [['Aucune donnée', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  });

  y = lastTableY(doc, 80);
  if (y > 250) {
    doc.addPage();
    y = 16;
  }
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(payload.mode === 'teachers' ? 'Par enseignant' : 'Par membre du personnel', 14, y);

  if (payload.mode === 'teachers') {
    useAutoTable(doc, {
      startY: y + 3,
      head: [['Nom', 'Matricule', 'Heures', 'Sessions', 'Max / sem.']],
      body:
        (payload.byTeacher ?? []).length > 0
          ? (payload.byTeacher ?? []).map((r) => [
              `${r.firstName} ${r.lastName}`,
              r.employeeId || '—',
              fmtHours(r.hours),
              String(r.sessions),
              r.maxWeeklyHours != null ? `${r.maxWeeklyHours} h` : '—',
            ])
          : [['Aucune donnée', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });
  } else {
    useAutoTable(doc, {
      startY: y + 3,
      head: [['Nom', 'Poste / matricule', 'Heures', 'Sessions', 'Jours présents']],
      body:
        (payload.byStaff ?? []).length > 0
          ? (payload.byStaff ?? []).map((r) => [
              `${r.firstName} ${r.lastName}`,
              r.jobTitle || r.employeeId || '—',
              fmtHours(r.hours),
              String(r.sessions),
              String(r.presentDays),
            ])
          : [['Aucune donnée', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });
  }

  const stamp = format(new Date(), 'yyyy-MM-dd');
  const slug = payload.mode === 'teachers' ? 'enseignants' : 'personnel';
  doc.save(`decompte-heures-${slug}-${payload.from}_${payload.to}-${stamp}.pdf`);
}

export type TeacherAttendanceSessionPdfRow = {
  attendanceDate: string;
  teacherName: string;
  courseLabel: string;
  status: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  source: string;
};

export function downloadTeacherAttendanceSessionsPdf(input: {
  from: string;
  to: string;
  rows: TeacherAttendanceSessionPdfRow[];
}): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const generated = format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr });

  doc.setFontSize(15);
  doc.setTextColor(13, 148, 136);
  doc.text('Pointages enseignants — détail des sessions', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Période : ${input.from} → ${input.to}  ·  ${generated}`, 14, 22);

  useAutoTable(doc, {
    startY: 28,
    head: [['Date', 'Enseignant', 'Cours', 'Statut', 'Arrivée', 'Départ', 'Heures', 'Source']],
    body:
      input.rows.length > 0
        ? input.rows.map((r) => [
            r.attendanceDate,
            r.teacherName,
            r.courseLabel,
            r.status,
            r.checkIn,
            r.checkOut,
            r.hours,
            r.source,
          ])
        : [['Aucune donnée', '', '', '', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`pointages-enseignants-${input.from}_${input.to}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
