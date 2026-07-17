import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import { FiBell, FiCopy, FiAlertTriangle, FiClock } from 'react-icons/fi';
import {
  format,
  differenceInCalendarDays,
  addDays,
  isBefore,
  startOfDay,
  isWithinInterval,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatFCFA } from '../../utils/currency';
import { ADM } from './adminModuleLayout';

function buildReminderText(fee: any) {
  const name = fee.student?.user
    ? `${fee.student.user.firstName} ${fee.student.user.lastName}`
    : 'Parent / élève';
  const className = fee.student?.class?.name || '';
  return (
    `Bonjour,\n\n` +
    `Rappel : le règlement des frais de scolarité pour ${name}` +
    (className ? ` (${className})` : '') +
    ` concernant la période « ${fee.period} » (${fee.academicYear}) d'un montant de ${formatFCFA(fee.amount)} ` +
    `était attendu au plus tard le ${format(new Date(fee.dueDate), 'dd/MM/yyyy', { locale: fr })}.\n\n` +
    `Merci de régulariser votre situation ou de contacter l'administration.\n\n` +
    `Cordialement,\nL'administration`
  );
}

interface PaymentRemindersPanelProps {
  compact?: boolean;
}

const PaymentRemindersPanel: React.FC<PaymentRemindersPanelProps> = ({ compact = false }) => {
  const { data: tuitionFees, isLoading } = useQuery({
    queryKey: ['admin-tuition-fees-reminders'],
    queryFn: () => adminApi.getTuitionFees(),
  });

  const today = useMemo(() => startOfDay(new Date()), []);
  const weekEnd = useMemo(() => addDays(today, 7), [today]);

  const { overdue, upcoming } = useMemo(() => {
    if (!tuitionFees || !Array.isArray(tuitionFees)) {
      return { overdue: [] as any[], upcoming: [] as any[] };
    }
    const od: any[] = [];
    const up: any[] = [];
    tuitionFees.forEach((fee: any) => {
      if (fee.isPaid) return;
      const due = startOfDay(new Date(fee.dueDate));
      if (isBefore(due, today)) {
        od.push(fee);
      } else if (isWithinInterval(due, { start: today, end: weekEnd })) {
        up.push(fee);
      }
    });
    od.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    up.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return { overdue: od, upcoming: up };
  }, [tuitionFees, today, weekEnd]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Texte copié — à coller dans un e-mail ou SMS'),
      () => toast.error('Impossible de copier')
    );
  };

  if (isLoading) {
    return (
      <Card className="p-10 text-center text-gray-500">Chargement des échéances…</Card>
    );
  }

  return (
    <div className={compact ? ADM.root : 'space-y-6'}>
      <div>
        <h2 className={compact ? ADM.h2 : 'text-lg font-semibold text-gray-900'}>Rappels de paiement</h2>
        <p className={compact ? ADM.intro : 'text-sm text-gray-500 mt-0.5'}>
          Frais non soldés : <strong>échus</strong> (date dépassée) ou <strong>à échéance sous 7 jours</strong>.
          Copiez le texte type pour vos relances (e-mail, SMS, messagerie).
        </p>
      </div>

      <Card className={compact ? 'p-3 border-amber-200 bg-amber-50/60' : 'p-4 border-amber-200 bg-amber-50/60'}>
        <div className="flex items-start gap-3">
          <FiAlertTriangle className={`text-amber-700 shrink-0 mt-0.5 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <p className={compact ? 'text-xs text-amber-900 leading-relaxed' : 'text-sm text-amber-900'}>
            Les relances automatiques (notifications + e-mail si SMTP est configuré) peuvent être planifiées
            côté serveur ou lancées à la demande depuis la vue d’ensemble « Gestion des frais ». Ce panneau sert
            encore à copier un texte personnalisé pour un e-mail ou un SMS ponctuel.
          </p>
        </div>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <FiAlertTriangle className="w-4 h-4 text-red-500" />
          Échus ({overdue.length})
        </h3>
        {overdue.length === 0 ? (
          <Card className="p-6 text-center text-gray-500 text-sm">Aucun frais impayé en retard.</Card>
        ) : (
          <div className="space-y-2">
            {overdue.map((fee: any) => {
              const days = differenceInCalendarDays(today, new Date(fee.dueDate));
              const text = buildReminderText(fee);
              return (
                <Card
                  key={fee.id}
                  className={`border border-red-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                    compact ? 'p-3' : 'p-4'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {fee.student?.user?.firstName} {fee.student?.user?.lastName}
                      <span className="text-gray-500 font-normal text-sm ml-2">
                        {fee.student?.class?.name}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      {fee.period} — {fee.academicYear} · {formatFCFA(fee.amount)} · échéance{' '}
                      {format(new Date(fee.dueDate), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                    <Badge variant="danger" className="mt-1">
                      Retard : {days} jour{days > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => copy(text)}>
                    <FiCopy className="w-4 h-4 mr-1 inline" />
                    Copier le rappel
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <FiClock className="w-4 h-4 text-amber-600" />
          Échéance dans les 7 jours ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <Card className="p-6 text-center text-gray-500 text-sm">
            Aucune échéance dans la fenêtre des 7 prochains jours.
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((fee: any) => {
              const text = buildReminderText(fee);
              return (
                <Card
                  key={fee.id}
                  className={`border border-amber-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                    compact ? 'p-3' : 'p-4'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {fee.student?.user?.firstName} {fee.student?.user?.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {fee.period} — {formatFCFA(fee.amount)} · avant le{' '}
                      {format(new Date(fee.dueDate), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => copy(text)}>
                    <FiBell className="w-4 h-4 mr-1 inline" />
                    Copier le rappel
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentRemindersPanel;
