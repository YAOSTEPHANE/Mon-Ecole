import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Table from '../ui/Table';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import SearchBar from '../ui/SearchBar';
import AddEducatorModal from './AddEducatorModal';
import EducatorDetailsModal from './EducatorDetailsModal';
import EditEducatorModal from './EditEducatorModal';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiMail,
  FiShield,
  FiDownload,
  FiUserCheck,
  FiBriefcase,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatFCFA } from '../../utils/currency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface EducatorsListProps {
  searchQuery?: string;
}

const EducatorsList: React.FC<EducatorsListProps> = ({ searchQuery = '' }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEducatorId, setSelectedEducatorId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEducatorId, setEditingEducatorId] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery) setSearchTerm(searchQuery);
  }, [searchQuery]);

  const { data: educators, isLoading } = useQuery({
    queryKey: ['admin-educators'],
    queryFn: adminApi.getEducators,
  });

  const filteredEducators = useMemo(() => {
    if (!educators) return [];
    const term = searchTerm.toLowerCase();
    return educators.filter(
      (e: any) =>
        (e.user?.firstName || '').toLowerCase().includes(term) ||
        (e.user?.lastName || '').toLowerCase().includes(term) ||
        (e.user?.email || '').toLowerCase().includes(term) ||
        (e.employeeId || '').toLowerCase().includes(term) ||
        (e.specialization || '').toLowerCase().includes(term)
    );
  }, [educators, searchTerm]);

  const stats = useMemo(() => {
    const list = filteredEducators;
    const withSpec = list.filter((e: any) => e.specialization).length;
    const contractTypes = new Set(list.map((e: any) => e.contractType).filter(Boolean)).size;
    return {
      total: list.length,
      withSpec,
      contractTypes,
    };
  }, [filteredEducators]);

  const deleteEducatorMutation = useMutation({
    mutationFn: adminApi.deleteEducator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-educators'] });
      toast.success('Éducateur supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Erreur lors de la suppression de l'éducateur");
    },
  });

  const handleViewEducator = (id: string) => {
    setSelectedEducatorId(id);
    setIsDetailsModalOpen(true);
  };
  const handleEditEducator = (id: string) => {
    setEditingEducatorId(id);
    setIsEditModalOpen(true);
  };
  const handleDeleteEducator = (id: string, name: string) => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer l'éducateur "${name}" ?\n\nCette action est irréversible.`
      )
    ) {
      deleteEducatorMutation.mutate(id);
    }
  };

  const exportToCSV = () => {
    try {
      const headers = [
        'Nom',
        'Prénom',
        'Email',
        'Téléphone',
        'Spécialisation',
        'Type de contrat',
        'Salaire',
        "Date d'embauche",
      ];
      const rows = (filteredEducators || []).map((e: any) =>
        [
          e.user?.lastName || 'N/A',
          e.user?.firstName || 'N/A',
          e.user?.email || 'N/A',
          e.user?.phone || 'N/A',
          e.specialization || 'N/A',
          e.contractType || 'N/A',
          e.salary ? formatFCFA(e.salary) : 'N/A',
          e.hireDate ? format(new Date(e.hireDate), 'dd/MM/yyyy', { locale: fr }) : 'N/A',
        ].join(';')
      );
      const csv =
        '\ufeff# École à jour - Export Éducateurs\n' +
        `# ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}\n` +
        headers.join(';') +
        '\n' +
        rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `educateurs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Export CSV réussi');
    } catch {
      toast.error("Erreur lors de l'export CSV");
    }
  };

  const exportToJSON = () => {
    try {
      const data = {
        application: 'École à jour',
        dateExport: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
        total: filteredEducators?.length || 0,
        éducateurs: (filteredEducators || []).map((e: any) => ({
          nom: e.user?.lastName,
          prénom: e.user?.firstName,
          email: e.user?.email,
          téléphone: e.user?.phone,
          spécialisation: e.specialization,
          typeContrat: e.contractType,
          salaire: e.salary,
          dateEmbauche: e.hireDate,
        })),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `educateurs-${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Export JSON réussi');
    } catch {
      toast.error("Erreur lors de l'export JSON");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFillColor(124, 58, 237);
      doc.roundedRect(14, 10, 40, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SM', 34, 18, { align: 'center' });
      doc.setTextColor(124, 58, 237);
      doc.setFontSize(20);
      doc.text('École à jour', 60, 18);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Liste des Éducateurs', 60, 25);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 60, 30);

      const useAutoTable = (opts: any) => {
        if (typeof (doc as any).autoTable === 'function') (doc as any).autoTable(opts);
        else if (typeof autoTable === 'function') autoTable(doc, opts);
      };
      const tableData = (filteredEducators || []).map((e: any) => [
        `${e.user?.firstName || ''} ${e.user?.lastName || ''}`,
        e.user?.email || 'N/A',
        e.specialization || 'N/A',
        e.contractType || 'N/A',
        e.salary ? formatFCFA(e.salary) : 'N/A',
      ]);
      useAutoTable({
        startY: 38,
        head: [['Nom complet', 'Email', 'Spécialisation', 'Contrat', 'Salaire']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });
      doc.save(`educateurs-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Export PDF réussi');
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'export PDF");
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Éducateur',
      render: (e: any) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={e.user?.avatar}
            name={`${e.user?.firstName || ''} ${e.user?.lastName || ''}`}
            size="md"
          />
          <div>
            <p className="font-medium text-gray-900">
              {e.user?.firstName} {e.user?.lastName}
            </p>
            <p className="text-sm text-gray-500">ID: {e.employeeId || e.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (e: any) => (
        <div>
          <div className="flex items-center gap-2 text-gray-600">
            <FiMail className="w-4 h-4 shrink-0" aria-hidden />
            <span className="text-sm">{e.user?.email || '—'}</span>
          </div>
          {e.user?.phone && <p className="text-sm text-gray-500">{e.user.phone}</p>}
        </div>
      ),
    },
    {
      key: 'specialization',
      header: 'Spécialisation',
      render: (e: any) => (
        <Badge variant="info" size="sm">
          <FiShield className="w-3 h-3 mr-1 inline" aria-hidden />
          {e.specialization || 'Non spécifiée'}
        </Badge>
      ),
    },
    {
      key: 'contract',
      header: 'Contrat',
      render: (e: any) => (
        <div className="text-sm text-gray-600">
          <p>{e.contractType || 'Non spécifié'}</p>
          {e.salary != null && (
            <p className="font-semibold text-emerald-600">{formatFCFA(e.salary)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'hire',
      header: 'Embauché le',
      render: (e: any) => (
        <div className="text-sm text-gray-600">
          {e.hireDate
            ? format(new Date(e.hireDate), 'dd MMM yyyy', { locale: fr })
            : '—'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (e: any) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleViewEducator(e.id)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Voir les détails"
            aria-label="Voir les détails"
          >
            <FiEye className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleEditEducator(e.id)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Modifier"
            aria-label="Modifier"
          >
            <FiEdit className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() =>
              handleDeleteEducator(e.id, `${e.user?.firstName || ''} ${e.user?.lastName || ''}`)
            }
            disabled={deleteEducatorMutation.isPending}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Supprimer"
            aria-label="Supprimer"
          >
            <FiTrash2 className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Éducateurs</h1>
          <p className="text-sm text-gray-500 mt-1">Chargement des éducateurs...</p>
        </div>
        <Card className="p-8 border border-gray-200">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Éducateurs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les éducateurs, contrats et spécialisations. Recherchez et exportez la liste.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-50">
              <FiShield className="w-5 h-5 text-violet-600" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50">
              <FiUserCheck className="w-5 h-5 text-indigo-600" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avec spécialité</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.withSpec}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50">
              <FiBriefcase className="w-5 h-5 text-emerald-600" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Types de contrat</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.contractTypes}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 min-w-0">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Rechercher par nom, email, ID ou spécialisation..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={exportToCSV}>
              <FiDownload className="w-4 h-4 mr-1" aria-hidden /> CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={exportToJSON}>
              <FiDownload className="w-4 h-4 mr-1" aria-hidden /> JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={exportToPDF}>
              <FiDownload className="w-4 h-4 mr-1" aria-hidden /> PDF
            </Button>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <FiPlus className="w-5 h-5 mr-2 inline" aria-hidden />
            Ajouter un éducateur
          </Button>
        </div>
      </Card>

      <Card className="border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Liste des éducateurs ({filteredEducators.length})
          </h2>
        </div>
        <Table
          data={filteredEducators}
          columns={columns}
          emptyMessage="Aucun éducateur trouvé"
        />
      </Card>

      <AddEducatorModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {selectedEducatorId && (
        <EducatorDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedEducatorId(null);
          }}
          educatorId={selectedEducatorId}
          onEdit={() => {
            setIsDetailsModalOpen(false);
            setEditingEducatorId(selectedEducatorId);
            setIsEditModalOpen(true);
          }}
        />
      )}

      {editingEducatorId && (
        <EditEducatorModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEducatorId(null);
          }}
          educatorId={editingEducatorId}
        />
      )}
    </div>
  );
};

export default EducatorsList;
