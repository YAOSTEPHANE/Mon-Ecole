'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useLibraryManagement } from '@/contexts/LibraryManagementContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { printLibraryReport } from '@/lib/libraryReportPrint';
import { formatFCFA } from '@/utils/currency';
import { ADM } from '@/components/admin/adminModuleLayout';

const RESERVATION_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  READY: 'À retirer',
  FULFILLED: 'Honorée',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
};

type ReportId =
  | 'summary'
  | 'active-loans'
  | 'overdue-loans'
  | 'inventory'
  | 'reservations'
  | 'penalties';

const REPORTS: { id: ReportId; title: string; description: string }[] = [
  {
    id: 'summary',
    title: 'Synthèse bibliothèque',
    description: 'Indicateurs clés : titres, emprunts, réservations et pénalités.',
  },
  {
    id: 'active-loans',
    title: 'Emprunts en cours',
    description: 'Liste des ouvrages actuellement sortis.',
  },
  {
    id: 'overdue-loans',
    title: 'Retards de retour',
    description: 'Emprunts dont la date de retour est dépassée.',
  },
  {
    id: 'inventory',
    title: 'Inventaire des exemplaires',
    description: 'État du stock par titre (total, disponibles, sortis).',
  },
  {
    id: 'reservations',
    title: 'Réservations actives',
    description: 'Demandes en attente ou prêtes à retirer.',
  },
  {
    id: 'penalties',
    title: 'Pénalités impayées',
    description: 'Sanctions financières non réglées.',
  },
];

export default function LibraryReportsPanel() {
  const { branding } = useAppBranding();
  const { libraryApi, scope } = useLibraryManagement();
  const schoolName = branding.schoolDisplayName || branding.appTitle || 'Bibliothèque';

  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['library-books-reports', scope],
    queryFn: () => libraryApi.getLibraryBooks({ isActive: 'all' }),
  });
  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ['library-loans-reports', scope],
    queryFn: () => libraryApi.getLibraryLoans(),
  });
  const { data: reservations, isLoading: resvLoading } = useQuery({
    queryKey: ['library-reservations-reports', scope],
    queryFn: () => libraryApi.getLibraryReservations(),
  });
  const { data: penalties, isLoading: penLoading } = useQuery({
    queryKey: ['library-penalties-reports', scope],
    queryFn: () => libraryApi.getLibraryPenalties({ paid: 'false' }),
  });

  const loading = booksLoading || loansLoading || resvLoading || penLoading;

  const stats = useMemo(() => {
    const bookList = ((books as any[]) ?? []).filter((b) => b.isActive);
    let totalCopies = 0;
    let available = 0;
    for (const b of bookList) {
      totalCopies += b.copiesTotal ?? 0;
      available += b.copiesAvailable ?? 0;
    }
    const loanList = (loans as any[]) ?? [];
    const activeLoans = loanList.filter((l) => l.status === 'ACTIVE');
    const overdue = activeLoans.filter(
      (l) => !l.returnedAt && new Date(l.dueDate) < new Date(),
    );
    const resvList = (reservations as any[]) ?? [];
    const resvActive = resvList.filter((r) => r.status === 'PENDING' || r.status === 'READY');
    const penList = (penalties as any[]) ?? [];
    return {
      bookList,
      activeLoans,
      overdue,
      resvActive,
      penList,
      titles: bookList.length,
      totalCopies,
      available,
      loaned: totalCopies - available,
    };
  }, [books, loans, reservations, penalties]);

  const print = (id: ReportId) => {
    try {
      const base = { schoolName, footerNote: 'Document interne — service bibliothèque.' };

      switch (id) {
        case 'summary':
          printLibraryReport({
            ...base,
            title: 'Rapport de synthèse — Bibliothèque',
            subtitle: 'Vue consolidée de l’activité',
            summaryBlocks: [
              { label: 'Titres actifs', value: String(stats.titles) },
              { label: 'Exemplaires', value: String(stats.totalCopies) },
              { label: 'Emprunts en cours', value: String(stats.activeLoans.length) },
              { label: 'Retards', value: String(stats.overdue.length) },
              { label: 'En rayon', value: String(stats.available) },
              { label: 'Sortis', value: String(stats.loaned) },
              { label: 'Réservations', value: String(stats.resvActive.length) },
              { label: 'Pénalités dues', value: String(stats.penList.length) },
            ],
          });
          break;

        case 'active-loans':
          printLibraryReport({
            ...base,
            title: 'Emprunts en cours',
            subtitle: `${stats.activeLoans.length} ouvrage(s) sorti(s)`,
            columns: [
              { key: 'book', label: 'Ouvrage' },
              { key: 'borrower', label: 'Emprunteur' },
              { key: 'loaned', label: 'Sortie' },
              { key: 'due', label: 'Retour prévu' },
              { key: 'status', label: 'État' },
            ],
            rows: stats.activeLoans.map((l: any) => ({
              book: `${l.book?.title ?? '—'}${l.book?.author ? ` — ${l.book.author}` : ''}`,
              borrower: `${l.borrower?.firstName ?? ''} ${l.borrower?.lastName ?? ''}`.trim(),
              loaned: format(new Date(l.loanedAt), 'dd/MM/yyyy', { locale: fr }),
              due: format(new Date(l.dueDate), 'dd/MM/yyyy', { locale: fr }),
              status:
                !l.returnedAt && new Date(l.dueDate) < new Date() ? 'En retard' : 'En cours',
            })),
          });
          break;

        case 'overdue-loans':
          printLibraryReport({
            ...base,
            title: 'Retards de retour',
            subtitle: `${stats.overdue.length} emprunt(s) en retard`,
            columns: [
              { key: 'book', label: 'Ouvrage' },
              { key: 'borrower', label: 'Emprunteur' },
              { key: 'due', label: 'Échéance' },
              { key: 'days', label: 'Jours de retard', align: 'right' },
            ],
            rows: stats.overdue.map((l: any) => {
              const days = Math.max(
                0,
                Math.floor((Date.now() - new Date(l.dueDate).getTime()) / 86400000),
              );
              return {
                book: l.book?.title ?? '—',
                borrower: `${l.borrower?.firstName ?? ''} ${l.borrower?.lastName ?? ''}`.trim(),
                due: format(new Date(l.dueDate), 'dd/MM/yyyy', { locale: fr }),
                days: String(days),
              };
            }),
          });
          break;

        case 'inventory':
          printLibraryReport({
            ...base,
            title: 'Inventaire bibliothèque',
            subtitle: `${stats.bookList.length} titre(s) actif(s)`,
            columns: [
              { key: 'title', label: 'Titre' },
              { key: 'author', label: 'Auteur' },
              { key: 'shelf', label: 'Rayon' },
              { key: 'total', label: 'Total', align: 'right' },
              { key: 'avail', label: 'Disponibles', align: 'right' },
              { key: 'out', label: 'Sortis', align: 'right' },
            ],
            rows: stats.bookList.map((b: any) => ({
              title: b.title ?? '—',
              author: b.author ?? '—',
              shelf: b.shelfLocation ?? '—',
              total: String(b.copiesTotal ?? 0),
              avail: String(b.copiesAvailable ?? 0),
              out: String((b.copiesTotal ?? 0) - (b.copiesAvailable ?? 0)),
            })),
          });
          break;

        case 'reservations':
          printLibraryReport({
            ...base,
            title: 'Réservations actives',
            subtitle: `${stats.resvActive.length} réservation(s)`,
            columns: [
              { key: 'book', label: 'Ouvrage' },
              { key: 'user', label: 'Demandeur' },
              { key: 'date', label: 'Date' },
              { key: 'status', label: 'Statut' },
            ],
            rows: stats.resvActive.map((r: any) => ({
              book: r.book?.title ?? '—',
              user: `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim(),
              date: format(new Date(r.reservedAt), 'dd/MM/yyyy HH:mm', { locale: fr }),
              status: RESERVATION_LABELS[r.status] ?? r.status,
            })),
          });
          break;

        case 'penalties':
          printLibraryReport({
            ...base,
            title: 'Pénalités impayées',
            subtitle: `${stats.penList.length} sanction(s)`,
            columns: [
              { key: 'user', label: 'Usager' },
              { key: 'reason', label: 'Motif' },
              { key: 'amount', label: 'Montant', align: 'right' },
              { key: 'date', label: 'Date' },
            ],
            rows: stats.penList.map((p: any) => ({
              user: `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim(),
              reason: p.reason ?? '—',
              amount: formatFCFA(p.amount ?? 0),
              date: format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr }),
            })),
          });
          break;
      }

      toast.success('Aperçu d’impression ouvert');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Impression impossible');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-indigo-100 bg-indigo-50/40">
        <p className={`text-sm text-indigo-950 ${ADM.intro}`}>
          Générez et imprimez les rapports de circulation : synthèse, emprunts, retards, inventaire,
          réservations et pénalités. Le nom de l&apos;établissement figure sur chaque document.
        </p>
      </Card>

      {loading ? (
        <Card className="p-10 text-center text-gray-500">Chargement des données…</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {REPORTS.map((r) => (
            <Card key={r.id} className="p-4 border border-gray-200 flex flex-col gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{r.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{r.description}</p>
              </div>
              <Button type="button" variant="outline" className="mt-auto self-start" onClick={() => print(r.id)}>
                <FiPrinter className="w-4 h-4 mr-2" />
                Imprimer
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
