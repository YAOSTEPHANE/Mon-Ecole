'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiChevronDown, FiChevronUp, FiDownload, FiFilter, FiList, FiSearch } from 'react-icons/fi';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import AccountingMetricNoteDropdown from './AccountingMetricNoteDropdown';
import { formatFCFA } from '../../utils/currency';
import {
  computeJournalSummary,
  exportJournalCsv,
  filterJournalRows,
  JOURNAL_KIND_LABEL,
  JOURNAL_KIND_TONE,
  paymentMethodLabel,
  withRunningBalance,
  type AccountingJournalKindFilter,
  type AccountingJournalRow,
} from '@/lib/accountingJournal';

type AccountingTransactionJournalSectionProps = {
  rows: AccountingJournalRow[];
  academicYear: string;
  isLoading?: boolean;
};

const KIND_FILTERS: { id: AccountingJournalKindFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'REVENUE', label: 'Scolarité' },
  { id: 'EXPENSE', label: 'Dépenses' },
  { id: 'PETTY_IN', label: 'Entrées caisse' },
  { id: 'PETTY_OUT', label: 'Sorties caisse' },
];

type JournalMetricNoteId = 'revenue' | 'expenses' | 'petty' | 'net';

const JOURNAL_METRIC_NOTES: Record<JournalMetricNoteId, { title: string; body: string }> = {
  revenue: {
    title: 'Encaissements scolarité',
    body: 'Paiements validés sur les frais de scolarité (crédit comptable).',
  },
  expenses: {
    title: 'Dépenses',
    body: 'Charges enregistrées : fournitures, services, salaires auxiliaires, etc. (débit).',
  },
  petty: {
    title: 'Caisse',
    body: 'Mouvements manuels de petite caisse : entrées et sorties hors guichet automatique.',
  },
  net: {
    title: 'Flux net',
    body: 'Total crédits − total débits sur la période filtrée (hors soldes d’ouverture).',
  },
};

const AccountingTransactionJournalSection = ({
  rows,
  academicYear,
  isLoading = false,
}: AccountingTransactionJournalSectionProps) => {
  const [kindFilter, setKindFilter] = useState<AccountingJournalKindFilter>('all');
  const [search, setSearch] = useState('');
  const [chronological, setChronological] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [openNotes, setOpenNotes] = useState<Partial<Record<JournalMetricNoteId, boolean>>>({});
  const [legendOpen, setLegendOpen] = useState(false);

  const filtered = useMemo(
    () => filterJournalRows(rows, { kind: kindFilter, search }),
    [rows, kindFilter, search]
  );

  const summary = useMemo(() => computeJournalSummary(filtered), [filtered]);

  const balanceById = useMemo(() => {
    const withBal = withRunningBalance(filtered);
    return new Map(withBal.map((r) => [r.id, r.runningBalance]));
  }, [filtered]);

  const displayRows = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (diff !== 0) return chronological ? diff : -diff;
      return chronological ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
    });
    return list;
  }, [filtered, chronological]);

  if (isLoading) {
    return (
      <Card className="border border-stone-200 p-4">
        <p className="text-sm text-stone-500">Chargement du journal…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FiList className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" aria-hidden />
          <div>
            <h3 className="text-sm font-bold text-stone-900">Journal des transactions</h3>
            <p className="text-xs text-stone-500">
              Encaissements scolarité, dépenses et mouvements de caisse — débit / crédit et solde cumulé.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => exportJournalCsv(displayRows, academicYear)}
          disabled={displayRows.length === 0}
        >
          <FiDownload className="mr-1 inline h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border border-slate-200 bg-slate-50/60 p-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setLegendOpen((o) => !o)}
          aria-expanded={legendOpen}
        >
          <span className="text-sm font-bold text-slate-900">Légende des indicateurs</span>
          {legendOpen ? <FiChevronUp className="shrink-0" /> : <FiChevronDown className="shrink-0" />}
        </button>
        {legendOpen && (
          <ul className="mt-2 space-y-2">
            {(Object.keys(JOURNAL_METRIC_NOTES) as JournalMetricNoteId[]).map((id) => (
              <li key={id} className="rounded-lg bg-white/90 px-3 py-2 text-xs text-stone-700 ring-1 ring-slate-200">
                <strong className="text-stone-900">{JOURNAL_METRIC_NOTES[id].title}</strong> —{' '}
                {JOURNAL_METRIC_NOTES[id].body}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-emerald-900">Encaissements scolarité</p>
          <p className="mt-1 text-lg font-bold text-emerald-950 tabular-nums">{formatFCFA(summary.totalRevenue)}</p>
          <AccountingMetricNoteDropdown
            title={JOURNAL_METRIC_NOTES.revenue.title}
            body={JOURNAL_METRIC_NOTES.revenue.body}
            open={!!openNotes.revenue}
            onToggle={() => setOpenNotes((p) => ({ ...p, revenue: !p.revenue }))}
          />
        </Card>
        <Card className="border border-rose-100 bg-rose-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-rose-900">Dépenses</p>
          <p className="mt-1 text-lg font-bold text-rose-950 tabular-nums">{formatFCFA(summary.totalExpenses)}</p>
          <AccountingMetricNoteDropdown
            title={JOURNAL_METRIC_NOTES.expenses.title}
            body={JOURNAL_METRIC_NOTES.expenses.body}
            open={!!openNotes.expenses}
            onToggle={() => setOpenNotes((p) => ({ ...p, expenses: !p.expenses }))}
          />
        </Card>
        <Card className="border border-sky-100 bg-sky-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-sky-900">Caisse (entrées / sorties)</p>
          <p className="mt-1 text-sm font-semibold text-sky-950 tabular-nums">
            +{formatFCFA(summary.pettyIn)} / −{formatFCFA(summary.pettyOut)}
          </p>
          <AccountingMetricNoteDropdown
            title={JOURNAL_METRIC_NOTES.petty.title}
            body={JOURNAL_METRIC_NOTES.petty.body}
            open={!!openNotes.petty}
            onToggle={() => setOpenNotes((p) => ({ ...p, petty: !p.petty }))}
          />
        </Card>
        <Card className="border border-indigo-100 bg-indigo-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-indigo-900">Flux net période</p>
          <p
            className={`mt-1 text-lg font-bold tabular-nums ${
              summary.netFlow >= 0 ? 'text-indigo-950' : 'text-rose-800'
            }`}
          >
            {formatFCFA(summary.netFlow)}
          </p>
          <p className="text-[10px] text-indigo-800/80">{summary.count} écriture{summary.count > 1 ? 's' : ''}</p>
          <AccountingMetricNoteDropdown
            title={JOURNAL_METRIC_NOTES.net.title}
            body={JOURNAL_METRIC_NOTES.net.body}
            open={!!openNotes.net}
            onToggle={() => setOpenNotes((p) => ({ ...p, net: !p.net }))}
          />
        </Card>
      </div>

      <Card className="border border-stone-200 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Rechercher"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Libellé, référence, compte…"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="mb-1 flex w-full items-center gap-1 text-[10px] font-semibold uppercase text-stone-500">
              <FiFilter className="h-3 w-3" aria-hidden />
              Type
            </span>
            {KIND_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setKindFilter(f.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition ${
                  kindFilter === f.id
                    ? 'bg-slate-900 text-white ring-slate-900'
                    : 'bg-white text-stone-600 ring-stone-200 hover:bg-stone-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-600">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={chronological}
              onChange={(e) => setChronological(e.target.checked)}
              className="rounded border-stone-300"
            />
            Ordre chronologique (ancien → récent)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showBalance}
              onChange={(e) => setShowBalance(e.target.checked)}
              className="rounded border-stone-300"
            />
            Afficher le solde cumulé
          </label>
        </div>
      </Card>

      <Card className="overflow-hidden border border-stone-200 p-0">
        {displayRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <FiSearch className="h-8 w-8 text-stone-300" aria-hidden />
            <p className="text-sm font-medium text-stone-700">Aucune transaction sur cette période</p>
            <p className="text-xs text-stone-500">Ajustez l&apos;année scolaire, les dates ou les filtres.</p>
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10 bg-stone-50 shadow-sm">
                <tr className="text-left text-stone-600">
                  <th className="px-2 py-2 font-semibold">Date</th>
                  <th className="px-2 py-2 font-semibold">Réf.</th>
                  <th className="px-2 py-2 font-semibold">Type</th>
                  <th className="px-2 py-2 font-semibold">Compte</th>
                  <th className="px-2 py-2 font-semibold">Libellé</th>
                  <th className="px-2 py-2 font-semibold">Méthode</th>
                  <th className="px-2 py-2 text-right font-semibold">Débit</th>
                  <th className="px-2 py-2 text-right font-semibold">Crédit</th>
                  {showBalance && <th className="px-2 py-2 text-right font-semibold">Solde cumulé</th>}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r) => (
                  <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="whitespace-nowrap px-2 py-1.5 text-stone-800">
                      {format(new Date(r.date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </td>
                    <td className="max-w-[72px] truncate px-2 py-1.5 font-mono text-[10px] text-stone-500">
                      {r.reference ?? '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${JOURNAL_KIND_TONE[r.kind]}`}
                      >
                        {JOURNAL_KIND_LABEL[r.kind]}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-mono text-[10px] text-stone-800">{r.ledgerCode}</span>
                      <span className="mt-0.5 block max-w-[120px] truncate text-[9px] text-stone-500">
                        {r.ledgerLabel}
                      </span>
                    </td>
                    <td className="max-w-xs px-2 py-1.5 text-stone-700" title={r.label}>
                      {r.label}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-stone-600">
                      {paymentMethodLabel(r.paymentMethod)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-rose-800">
                      {r.debit > 0 ? formatFCFA(r.debit) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-emerald-800">
                      {r.credit > 0 ? formatFCFA(r.credit) : '—'}
                    </td>
                    {showBalance && (
                      <td className="px-2 py-1.5 text-right font-medium tabular-nums text-indigo-900">
                        {formatFCFA(balanceById.get(r.id) ?? 0)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 border-t-2 border-stone-200 bg-stone-100 font-semibold">
                <tr>
                  <td colSpan={showBalance ? 6 : 6} className="px-2 py-2 text-stone-700">
                    Totaux ({displayRows.length})
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-rose-900">{formatFCFA(summary.totalDebit)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-900">{formatFCFA(summary.totalCredit)}</td>
                  {showBalance && (
                    <td className="px-2 py-2 text-right tabular-nums text-indigo-900">{formatFCFA(summary.netFlow)}</td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AccountingTransactionJournalSection;
