import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import { FiCopy, FiAlertTriangle, FiClock, FiMail, FiMessageCircle } from 'react-icons/fi';
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

function buildReminderText(fee: {
  student?: {
    user?: { firstName?: string; lastName?: string; phone?: string; email?: string };
    class?: { name?: string };
    parents?: Array<{ parent?: { user?: { phone?: string; email?: string } } }>;
  };
  period?: string;
  academicYear?: string;
  amount?: number;
  dueDate?: string;
}) {
  const name = fee.student?.user
    ? `${fee.student.user.firstName} ${fee.student.user.lastName}`
    : 'Parent / élève';
  const className = fee.student?.class?.name || '';
  return (
    `Bonjour,\n\n` +
    `Rappel : le règlement des frais de scolarité pour ${name}` +
    (className ? ` (${className})` : '') +
    ` concernant la période « ${fee.period} » (${fee.academicYear}) d'un montant de ${formatFCFA(fee.amount ?? 0)} ` +
    `était attendu au plus tard le ${format(new Date(fee.dueDate ?? Date.now()), 'dd/MM/yyyy', { locale: fr })}.\n\n` +
    `Merci de régulariser votre situation ou de contacter l'administration.\n\n` +
    `Cordialement,\nL'administration`
  );
}

function normalizePhoneForWhatsApp(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits;
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Texte copié'),
    () => toast.error('Impossible de copier'),
  );
}

function openWhatsApp(fee: Parameters<typeof buildReminderText>[0], text: string) {
  const phone =
    normalizePhoneForWhatsApp(fee.student?.user?.phone) ||
    normalizePhoneForWhatsApp(fee.student?.parents?.[0]?.parent?.user?.phone);
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openMailto(fee: Parameters<typeof buildReminderText>[0], text: string) {
  const email =
    fee.student?.parents?.[0]?.parent?.user?.email || fee.student?.user?.email || '';
  const subject = encodeURIComponent(
    `Rappel frais de scolarité — ${fee.period || ''} ${fee.academicYear || ''}`.trim(),
  );
  const body = encodeURIComponent(text);
  window.location.href = email
    ? `mailto:${email}?subject=${subject}&body=${body}`
    : `mailto:?subject=${subject}&body=${body}`;
}

function ReminderActions({
  fee,
  text,
}: {
  fee: Parameters<typeof buildReminderText>[0];
  text: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      <Button variant="secondary" size="sm" onClick={() => copyText(text)}>
        <FiCopy className="mr-1 inline h-4 w-4" />
        Copier
      </Button>
      <Button variant="secondary" size="sm" onClick={() => openWhatsApp(fee, text)}>
        <FiMessageCircle className="mr-1 inline h-4 w-4" />
        WhatsApp
      </Button>
      <Button variant="secondary" size="sm" onClick={() => openMailto(fee, text)}>
        <FiMail className="mr-1 inline h-4 w-4" />
        E-mail
      </Button>
    </div>
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
      if (isBefore(due, today)) od.push(fee);
      else if (isWithinInterval(due, { start: today, end: weekEnd })) up.push(fee);
    });
    od.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    up.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return { overdue: od, upcoming: up };
  }, [tuitionFees, today, weekEnd]);

  if (isLoading) {
    return <Card className="p-10 text-center text-gray-500">Chargement des échéances…</Card>;
  }

  return (
    <div className={compact ? ADM.root : 'space-y-6'}>
      <div>
        <h2 className={compact ? ADM.h2 : 'text-lg font-semibold text-gray-900'}>Rappels de paiement</h2>
        <p className={compact ? ADM.intro : 'mt-0.5 text-sm text-gray-500'}>
          Relance one-click : <strong>WhatsApp</strong>, <strong>e-mail</strong> ou copie du texte.
        </p>
      </div>

      <Card className={compact ? 'border-amber-200 bg-amber-50/60 p-3' : 'border-amber-200 bg-amber-50/60 p-4'}>
        <div className="flex items-start gap-3">
          <FiAlertTriangle className={`mt-0.5 shrink-0 text-amber-700 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
          <p className={compact ? 'text-xs leading-relaxed text-amber-900' : 'text-sm text-amber-900'}>
            Les relances automatiques restent disponibles depuis « Gestion des frais ». Ici, chaque ligne ouvre
            directement WhatsApp ou le client mail avec le message prérempli.
          </p>
        </div>
      </Card>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <FiAlertTriangle className="h-4 w-4 text-red-500" />
          Échus ({overdue.length})
        </h3>
        {overdue.length === 0 ? (
          <Card className="p-6 text-center text-sm text-gray-500">Aucun frais impayé en retard.</Card>
        ) : (
          <div className="space-y-2">
            {overdue.map((fee: any) => {
              const days = differenceInCalendarDays(today, new Date(fee.dueDate));
              const text = buildReminderText(fee);
              return (
                <Card
                  key={fee.id}
                  className={`flex flex-col justify-between gap-3 border border-red-100 sm:flex-row sm:items-center ${
                    compact ? 'p-3' : 'p-4'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {fee.student?.user?.firstName} {fee.student?.user?.lastName}
                      <span className="ml-2 text-sm font-normal text-gray-500">{fee.student?.class?.name}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      {fee.period} — {fee.academicYear} · {formatFCFA(fee.amount)} · échéance{' '}
                      {format(new Date(fee.dueDate), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                    <Badge variant="danger" className="mt-1">
                      Retard : {days} jour{days > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <ReminderActions fee={fee} text={text} />
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <FiClock className="h-4 w-4 text-amber-600" />
          Échéance dans les 7 jours ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <Card className="p-6 text-center text-sm text-gray-500">
            Aucune échéance dans la fenêtre des 7 prochains jours.
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((fee: any) => {
              const text = buildReminderText(fee);
              return (
                <Card
                  key={fee.id}
                  className={`flex flex-col justify-between gap-3 border border-amber-100 sm:flex-row sm:items-center ${
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
                  <ReminderActions fee={fee} text={text} />
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
