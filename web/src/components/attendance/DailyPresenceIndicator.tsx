import { useQuery } from '@tanstack/react-query';
import Badge from '../ui/Badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type DailyRow = {
  id: string;
  date: string;
  status: string;
  checkInAt?: string | null;
  source: string;
};

type Props = {
  title?: string;
  queryKey: unknown[];
  queryFn: () => Promise<DailyRow[]>;
};

const statusLabel = (s: string) =>
  s === 'PRESENT' ? 'Présent' : s === 'LATE' ? 'En retard' : s === 'EXCUSED' ? 'Excusé' : 'Absent';

const DailyPresenceIndicator = ({ title = 'Présence établissement (MENA)', queryKey, queryFn }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn,
    staleTime: 60_000,
  });

  const todayKey = new Date().toISOString().slice(0, 10);
  const today = (data || []).find((r) => String(r.date).slice(0, 10) === todayKey) || data?.[0];

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-emerald-950">{title}</p>
          <p className="text-xs text-emerald-800 mt-0.5">
            Pointage journalier issu du logiciel / pointeurs MENA (distinct des appels de cours).
          </p>
        </div>
        {isLoading ? (
          <span className="text-xs text-emerald-700">Chargement…</span>
        ) : today ? (
          <div className="flex items-center gap-2">
            <Badge
              size="sm"
              variant={
                today.status === 'PRESENT'
                  ? 'success'
                  : today.status === 'LATE'
                    ? 'warning'
                    : 'danger'
              }
            >
              {statusLabel(today.status)}
            </Badge>
            <span className="text-xs text-emerald-900">
              {format(new Date(today.date), 'dd MMM yyyy', { locale: fr })}
              {today.checkInAt
                ? ` · ${format(new Date(today.checkInAt), 'HH:mm', { locale: fr })}`
                : ''}
            </span>
          </div>
        ) : (
          <span className="text-xs text-emerald-800">Aucune donnée MENA récente</span>
        )}
      </div>
    </div>
  );
};

export default DailyPresenceIndicator;
