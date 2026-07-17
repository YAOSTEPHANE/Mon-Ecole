import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../services/api';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { FiDownload, FiBriefcase } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { formatFCFA } from '../../../utils/currency';

type StaffRow = {
  id: string;
  kind: 'teacher' | 'educator';
  name: string;
  email: string;
  employeeId: string;
  hireDate: string | Date | null;
  contractType: string;
  salary: number | null | undefined;
};

const HRContractsPanel: React.FC = () => {
  const { data: teachers, isLoading: lt } = useQuery({
    queryKey: ['admin-teachers-hr-contracts'],
    queryFn: adminApi.getTeachers,
  });
  const { data: educators, isLoading: le } = useQuery({
    queryKey: ['admin-educators-hr-contracts'],
    queryFn: adminApi.getEducators,
  });

  const rows: StaffRow[] = useMemo(() => {
    const t = (teachers as any[] | undefined)?.map((x) => ({
      id: x.id,
      kind: 'teacher' as const,
      name: `${x.user?.firstName ?? ''} ${x.user?.lastName ?? ''}`.trim(),
      email: x.user?.email ?? '',
      employeeId: x.employeeId,
      hireDate: x.hireDate,
      contractType: x.contractType ?? '—',
      salary: x.salary,
    })) ?? [];
    const e = (educators as any[] | undefined)?.map((x) => ({
      id: x.id,
      kind: 'educator' as const,
      name: `${x.user?.firstName ?? ''} ${x.user?.lastName ?? ''}`.trim(),
      email: x.user?.email ?? '',
      employeeId: x.employeeId,
      hireDate: x.hireDate,
      contractType: x.contractType ?? '—',
      salary: x.salary,
    })) ?? [];
    return [...t, ...e].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [teachers, educators]);

  const exportCsv = () => {
    const header = ['Rôle', 'Nom', 'Email', 'N° employé', 'Embauche', 'Contrat', 'Salaire brut (réf.)'];
    const lines = rows.map((r) =>
      [
        r.kind === 'teacher' ? 'Enseignant' : 'Éducateur',
        r.name,
        r.email,
        r.employeeId,
        r.hireDate ? format(new Date(r.hireDate), 'yyyy-MM-dd') : '',
        r.contractType,
        r.salary != null ? String(r.salary) : '',
      ].join(';')
    );
    const csv = ['\ufeff' + header.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrats_personnel_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const loading = lt || le;

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-indigo-100 bg-indigo-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-gray-700 flex items-start gap-2">
            <FiBriefcase className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            Synthèse des <strong>contrats</strong> enregistrés pour les enseignants et éducateurs (types
            d’embauche, salaire de référence). Les modifications se font depuis les fiches détaillées
            Enseignants / Éducateurs.
          </p>
          <Button type="button" variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <FiDownload className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun membre du personnel avec contrat.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                  <th className="py-3 px-4 font-semibold">Rôle</th>
                  <th className="py-3 px-4 font-semibold">Nom</th>
                  <th className="py-3 px-4 font-semibold">N° employé</th>
                  <th className="py-3 px-4 font-semibold">Embauche</th>
                  <th className="py-3 px-4 font-semibold">Contrat</th>
                  <th className="py-3 px-4 font-semibold text-right">Salaire (réf.)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="py-3 px-4">
                      <Badge className={r.kind === 'teacher' ? 'bg-violet-100 text-violet-800' : 'bg-teal-100 text-teal-800'}>
                        {r.kind === 'teacher' ? 'Enseignant' : 'Éducateur'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{r.employeeId}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.hireDate
                        ? format(new Date(r.hireDate), 'dd MMM yyyy', { locale: fr })
                        : '—'}
                    </td>
                    <td className="py-3 px-4">{r.contractType}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {r.salary != null ? formatFCFA(r.salary) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default HRContractsPanel;
