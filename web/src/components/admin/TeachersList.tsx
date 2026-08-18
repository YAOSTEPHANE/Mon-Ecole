import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Table from '../ui/Table';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import SearchBar from '../ui/SearchBar';
import AddTeacherModal from './AddTeacherModal';
import TeacherDetailsModal from './TeacherDetailsModal';
import EditTeacherModal from './EditTeacherModal';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiMail,
  FiBook,
  FiDownload,
  FiUsers,
  FiChevronDown,
  FiChevronUp,
  FiUserCheck,
  FiBookOpen,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSchool } from '@/contexts/SchoolContext';
import { useSchoolReady, schoolQueryKey } from '@/hooks/useSchoolReady';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import {
  getTeacherEngagementKindLabel,
  getTeacherEngagementBadgeVariant,
  TEACHER_ENGAGEMENT_KIND_OPTIONS,
} from '@/lib/teacherEngagementKind';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface TeachersListProps {
  searchQuery?: string;
}

const TeachersList: React.FC<TeachersListProps> = ({ searchQuery = '' }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [groupByClass, setGroupByClass] = useState(true);
  const [engagementFilter, setEngagementFilter] = useState<'ALL' | 'PERMANENT' | 'VACATAIRE'>('ALL');

  useEffect(() => {
    if (searchQuery) setSearchTerm(searchQuery);
  }, [searchQuery]);

  const { activeSchoolId } = useSchool();
  const schoolReady = useSchoolReady();

  const { data: teachers, isLoading } = useQuery({
    queryKey: schoolQueryKey(['teachers'], activeSchoolId),
    queryFn: adminApi.getTeachers,
    enabled: schoolReady,
  });

  const filteredTeachers = useMemo(() => {
    if (!teachers) return [];
    const term = searchTerm.toLowerCase();
    return teachers.filter(
      (t: any) => {
        if (engagementFilter !== 'ALL' && t.engagementKind !== engagementFilter) return false;
        return (
        (t.user?.firstName || '').toLowerCase().includes(term) ||
        (t.user?.lastName || '').toLowerCase().includes(term) ||
        (t.user?.email || '').toLowerCase().includes(term) ||
        (t.employeeId || '').toLowerCase().includes(term) ||
        (t.specialization || '').toLowerCase().includes(term)
        );
      }
    );
  }, [teachers, searchTerm, engagementFilter]);

  const teachersByClass = useMemo(() => {
    if (!filteredTeachers.length || !groupByClass) return null;
    const grouped: { [key: string]: any[] } = {};
    filteredTeachers.forEach((teacher: any) => {
      if (!teacher.classes || teacher.classes.length === 0) {
        const key = 'Non assigné';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(teacher);
      } else {
        teacher.classes.forEach((cls: any) => {
          const key = cls.name || 'Non assigné';
          if (!grouped[key]) grouped[key] = [];
          if (!grouped[key].find((x: any) => x.id === teacher.id)) grouped[key].push(teacher);
        });
      }
    });
    const sortedClasses = Object.keys(grouped).sort((a, b) => {
      if (a === 'Non assigné') return 1;
      if (b === 'Non assigné') return -1;
      return a.localeCompare(b);
    });
    sortedClasses.forEach((key) => {
      grouped[key].sort((a: any, b: any) => {
        const na = `${a.user?.lastName || ''} ${a.user?.firstName || ''}`;
        const nb = `${b.user?.lastName || ''} ${b.user?.firstName || ''}`;
        return na.localeCompare(nb);
      });
    });
    return { grouped, sortedClasses };
  }, [filteredTeachers, groupByClass]);

  useEffect(() => {
    if (
      groupByClass &&
      teachersByClass &&
      expandedClasses.size === 0 &&
      teachersByClass.sortedClasses.length > 0
    ) {
      setExpandedClasses(new Set(teachersByClass.sortedClasses));
    }
  }, [groupByClass, teachersByClass?.sortedClasses.join(',')]);

  const toggleClass = (className: string) => {
    const next = new Set(expandedClasses);
    if (next.has(className)) next.delete(className);
    else next.add(className);
    setExpandedClasses(next);
  };

  const stats = useMemo(() => {
    const list = filteredTeachers;
    const withClass = list.filter((t: any) => t.classes?.length > 0).length;
    const classesCount = new Set(
      list.flatMap((t: any) => (t.classes || []).map((c: any) => c.name).filter(Boolean))
    ).size;
    return {
      total: list.length,
      withClass,
      withoutClass: list.length - withClass,
      classes: classesCount,
    };
  }, [filteredTeachers]);

  const deleteTeacherMutation = useMutation({
    mutationFn: adminApi.deleteTeacher,
    onSuccess: (_data, deletedTeacherId) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-personnel-registry'] });
      queryClient.removeQueries({ queryKey: ['teacher', deletedTeacherId] });
      if (selectedTeacherId === deletedTeacherId) {
        setIsDetailsModalOpen(false);
        setSelectedTeacherId(null);
      }
      if (editingTeacherId === deletedTeacherId) {
        setIsEditModalOpen(false);
        setEditingTeacherId(null);
      }
      toast.success('Enseignant supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Erreur lors de la suppression de l'enseignant");
    },
  });

  const handleViewTeacher = (id: string) => {
    setSelectedTeacherId(id);
    setIsDetailsModalOpen(true);
  };
  const handleEditTeacher = (id: string) => {
    setEditingTeacherId(id);
    setIsEditModalOpen(true);
  };
  const handleDeleteTeacher = (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'enseignant "${name}" ?\n\nCette action est irréversible.`)) {
      deleteTeacherMutation.mutate(id);
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Spécialité', 'Classes assignées'];
      const rows = (filteredTeachers || []).map((t: any) =>
        [
          t.user?.lastName || 'N/A',
          t.user?.firstName || 'N/A',
          t.user?.email || 'N/A',
          t.user?.phone || 'N/A',
          t.specialization || 'N/A',
          t.classes?.map((c: any) => c.name).join(', ') || 'Aucune',
        ].join(';')
      );
      const csv =
        '\ufeff# École à jour - Export Enseignants\n' +
        `# ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}\n` +
        headers.join(';') +
        '\n' +
        rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `enseignants-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
        total: filteredTeachers?.length || 0,
        enseignants: (filteredTeachers || []).map((t: any) => ({
          nom: t.user?.lastName,
          prénom: t.user?.firstName,
          email: t.user?.email,
          téléphone: t.user?.phone,
          spécialité: t.specialization,
          classesAssignées: t.classes?.map((c: any) => c.name) || [],
        })),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `enseignants-${format(new Date(), 'yyyy-MM-dd')}.json`;
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
      doc.setFillColor(99, 102, 241);
      doc.roundedRect(14, 10, 40, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SM', 34, 18, { align: 'center' });
      doc.setTextColor(99, 102, 241);
      doc.setFontSize(20);
      doc.text('École à jour', 60, 18);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Liste des Enseignants', 60, 25);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 60, 30);

      const useAutoTable = (opts: any) => {
        if (typeof (doc as any).autoTable === 'function') (doc as any).autoTable(opts);
        else if (typeof autoTable === 'function') autoTable(doc, opts);
      };
      const tableData = (filteredTeachers || []).map((t: any) => [
        `${t.user?.firstName || ''} ${t.user?.lastName || ''}`,
        t.user?.email || 'N/A',
        t.specialization || 'N/A',
        t.classes?.map((c: any) => c.name).join(', ') || 'Aucune',
      ]);
      useAutoTable({
        startY: 38,
        head: [['Nom complet', 'Email', 'Spécialité', 'Classes assignées']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });
      doc.save(`enseignants-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Export PDF réussi');
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'export PDF");
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Enseignant',
      render: (t: any) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={t.user?.avatar}
            name={`${t.user?.firstName || ''} ${t.user?.lastName || ''}`}
            size="md"
          />
          <div>
            <p className="font-medium text-gray-900">
              {t.user?.firstName} {t.user?.lastName}
            </p>
            <p className="text-sm text-gray-500">ID: {t.employeeId || t.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (t: any) => (
        <div>
          <div className="flex items-center gap-2 text-gray-600">
            <FiMail className="w-4 h-4 shrink-0" aria-hidden />
            <span className="text-sm">{t.user?.email || '—'}</span>
          </div>
          {t.user?.phone && <p className="text-sm text-gray-500">{t.user.phone}</p>}
        </div>
      ),
    },
    {
      key: 'engagementKind',
      header: 'Type',
      render: (t: any) => (
        <Badge variant={getTeacherEngagementBadgeVariant(t.engagementKind)} size="sm">
          {getTeacherEngagementKindLabel(t.engagementKind)}
        </Badge>
      ),
    },
    {
      key: 'specialization',
      header: 'Spécialisation',
      render: (t: any) => (
        <Badge variant="info" size="sm">
          <FiBook className="w-3 h-3 mr-1 inline" aria-hidden />
          {t.specialization || '—'}
        </Badge>
      ),
    },
    {
      key: 'stats',
      header: 'Statistiques',
      render: (t: any) => (
        <div className="text-sm text-gray-600">
          <p>{t.classes?.length || 0} classe(s)</p>
          <p>{t._count?.courses ?? t.courses?.length ?? 0} cours</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t: any) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleViewTeacher(t.id)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Voir les détails"
            aria-label="Voir les détails"
          >
            <FiEye className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleEditTeacher(t.id)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Modifier"
            aria-label="Modifier"
          >
            <FiEdit className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() =>
              handleDeleteTeacher(t.id, `${t.user?.firstName || ''} ${t.user?.lastName || ''}`)
            }
            disabled={deleteTeacherMutation.isPending}
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
          <h1 className="text-xl font-semibold text-gray-900">Enseignants</h1>
          <p className="text-sm text-gray-500 mt-1">Chargement des enseignants...</p>
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
        <h1 className="text-xl font-semibold text-gray-900">Enseignants</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les enseignants, leurs spécialités et classes assignées. Recherchez, filtrez et exportez.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50">
              <FiUsers className="w-5 h-5 text-indigo-600" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50">
              <FiUserCheck className="w-5 h-5 text-emerald-600" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avec classe</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.withClass}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50">
              <FiBookOpen className="w-5 h-5 text-amber-600" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sans classe</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.withoutClass}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50">
              <FiBook className="w-5 h-5 text-blue-600" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Classes</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.classes}</p>
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
              placeholder="Rechercher par nom, email, ID ou spécialité..."
            />
          </div>
          <select
            value={engagementFilter}
            onChange={(e) => setEngagementFilter(e.target.value as 'ALL' | 'PERMANENT' | 'VACATAIRE')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            aria-label="Filtrer par type d'enseignant"
          >
            <option value="ALL">Tous les types</option>
            {TEACHER_ENGAGEMENT_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Button
            variant={groupByClass ? 'primary' : 'secondary'}
            size="default"
            onClick={() => {
              setGroupByClass(!groupByClass);
              if (!groupByClass && teachersByClass?.sortedClasses.length) {
                setExpandedClasses(new Set(teachersByClass.sortedClasses));
              }
            }}
          >
            <FiUsers className="w-5 h-5 mr-2 inline" aria-hidden />
            {groupByClass ? 'Par classe' : 'Liste simple'}
          </Button>
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
            Ajouter un enseignant
          </Button>
        </div>
      </Card>

      <Card className="border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Liste des enseignants ({filteredTeachers.length})
          </h2>
        </div>

        {groupByClass && teachersByClass ? (
          <div className="divide-y divide-gray-200">
            {teachersByClass.sortedClasses.length === 0 ? (
              <div className="py-12 text-center text-gray-500">Aucun enseignant trouvé</div>
            ) : (
              teachersByClass.sortedClasses.map((className) => {
                const classTeachers = teachersByClass.grouped[className];
                const isExpanded = expandedClasses.has(className);

                return (
                  <div key={className}>
                    <button
                      type="button"
                      onClick={() => toggleClass(className)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <FiChevronUp className="w-5 h-5 text-gray-500 shrink-0" aria-hidden />
                        ) : (
                          <FiChevronDown className="w-5 h-5 text-gray-500 shrink-0" aria-hidden />
                        )}
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <FiBook className="w-5 h-5 text-indigo-600" aria-hidden />
                        </div>
                        <span className="font-medium text-gray-900">{className}</span>
                      </div>
                      <Badge variant="info">{classTeachers.length} enseignant(s)</Badge>
                    </button>
                    {isExpanded && (
                      <div className="bg-gray-50/50 border-t border-gray-100">
                        <Table
                          data={classTeachers}
                          columns={columns}
                          emptyMessage="Aucun enseignant dans cette classe"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <Table
            data={filteredTeachers}
            columns={columns}
            emptyMessage="Aucun enseignant trouvé"
          />
        )}
      </Card>

      <AddTeacherModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {selectedTeacherId && (
        <TeacherDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedTeacherId(null);
          }}
          teacherId={selectedTeacherId}
          onEdit={() => {
            setIsDetailsModalOpen(false);
            setEditingTeacherId(selectedTeacherId);
            setIsEditModalOpen(true);
          }}
        />
      )}

      {editingTeacherId && (
        <EditTeacherModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTeacherId(null);
          }}
          teacherId={editingTeacherId}
        />
      )}
    </div>
  );
};

export default TeachersList;
