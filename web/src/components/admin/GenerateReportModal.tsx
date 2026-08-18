import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}
import { 
  FiFileText, 
  FiUsers, 
  FiBook, 
  FiUserCheck,
  FiAward,
  FiAlertCircle,
  FiCalendar,
  FiDownload,
  FiLoader,
  FiCheck,
  FiX
} from 'react-icons/fi';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportType = 
  | 'students'
  | 'classes'
  | 'teachers'
  | 'grades'
  | 'absences'
  | 'overview';

interface ReportOption {
  id: ReportType;
  label: string;
  description: string;
  icon: typeof FiUsers;
  color: string;
}

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({ isOpen, onClose }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch data
  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: adminApi.getStudents,
    enabled: isOpen && (selectedReport === 'students' || selectedReport === 'grades' || selectedReport === 'absences'),
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
    enabled: isOpen,
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: adminApi.getTeachers,
    enabled: isOpen && selectedReport === 'teachers',
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    enabled: isOpen && selectedReport === 'overview',
  });

  const reportOptions: ReportOption[] = [
    {
      id: 'students',
      label: 'Rapport des Élèves',
      description: 'Liste complète de tous les élèves avec leurs informations',
      icon: FiUsers,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'classes',
      label: 'Rapport des Classes',
      description: 'Vue d\'ensemble de toutes les classes et leurs statistiques',
      icon: FiBook,
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'teachers',
      label: 'Rapport des Enseignants',
      description: 'Liste des enseignants avec leurs spécialités et classes',
      icon: FiUserCheck,
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'grades',
      label: 'Rapport des Notes',
      description: 'Statistiques et moyennes des notes par classe',
      icon: FiAward,
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      id: 'absences',
      label: 'Rapport des Absences',
      description: 'Analyse des absences par classe ou élève',
      icon: FiAlertCircle,
      color: 'from-red-500 to-red-600',
    },
    {
      id: 'overview',
      label: 'Rapport Global',
      description: 'Vue d\'ensemble complète de l\'établissement',
      icon: FiFileText,
      color: 'from-indigo-500 to-indigo-600',
    },
  ];

  const periods = [
    { value: 'all', label: 'Toute l\'année' },
    { value: 'trim1', label: 'Trimestre 1' },
    { value: 'trim2', label: 'Trimestre 2' },
    { value: 'trim3', label: 'Trimestre 3' },
  ];

  const generatePDF = async () => {
    if (!selectedReport) {
      toast.error('Veuillez sélectionner un type de rapport');
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString('fr-FR');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text('École à jour', 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Rapport généré le ${currentDate}`, 14, 28);

      switch (selectedReport) {
        case 'students':
          await generateStudentsReport(doc);
          break;
        case 'classes':
          await generateClassesReport(doc);
          break;
        case 'teachers':
          await generateTeachersReport(doc);
          break;
        case 'grades':
          await generateGradesReport(doc);
          break;
        case 'absences':
          await generateAbsencesReport(doc);
          break;
        case 'overview':
          await generateOverviewReport(doc);
          break;
      }

      // Save PDF
      const fileName = `rapport_${selectedReport}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('Rapport généré avec succès !');
      handleClose();
    } catch (error: any) {
      console.error('Erreur lors de la génération du rapport:', error);
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateStudentsReport = async (doc: jsPDF) => {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Rapport des Élèves', 14, 40);

    const filteredStudents = selectedClass 
      ? students?.filter((s: any) => s.classId === selectedClass)
      : students;

    const tableData = filteredStudents?.map((student: any) => [
      student.studentId,
      `${student.user.firstName} ${student.user.lastName}`,
      student.user.email,
      student.class?.name || 'Non assigné',
      student.isActive ? 'Actif' : 'Inactif',
    ]) || [];

    doc.autoTable({
      startY: 45,
      head: [['ID', 'Nom', 'Email', 'Classe', 'Statut']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
  };

  const generateClassesReport = async (doc: jsPDF) => {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Rapport des Classes', 14, 40);

    const tableData = classes?.map((cls: any) => [
      cls.name,
      cls.level,
      cls.academicYear,
      cls.room || 'N/A',
      `${cls._count?.students || 0} / ${cls.capacity}`,
      cls.teacher?.user ? `${cls.teacher.user.firstName} ${cls.teacher.user.lastName}` : 'N/A',
    ]) || [];

    doc.autoTable({
      startY: 45,
      head: [['Nom', 'Niveau', 'Année', 'Salle', 'Élèves', 'Professeur Principal']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
    });
  };

  const generateTeachersReport = async (doc: jsPDF) => {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Rapport des Enseignants', 14, 40);

    const tableData = teachers?.map((teacher: any) => [
      teacher.employeeId,
      `${teacher.user.firstName} ${teacher.user.lastName}`,
      teacher.user.email,
      teacher.specialization,
      teacher.contractType,
      teacher.classes?.length || 0,
      teacher.courses?.length || 0,
    ]) || [];

    doc.autoTable({
      startY: 45,
      head: [['ID', 'Nom', 'Email', 'Spécialité', 'Contrat', 'Classes', 'Cours']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
    });
  };

  const generateGradesReport = async (doc: jsPDF) => {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Rapport des Notes', 14, 40);

    // Statistiques générales
    const totalStudents = students?.length || 0;
    doc.setFontSize(12);
    doc.text(`Nombre total d'élèves: ${totalStudents}`, 14, 50);
    doc.text(`Période: ${periods.find(p => p.value === selectedPeriod)?.label || 'Toute l\'année'}`, 14, 56);

    // Note: Dans une vraie application, vous devriez récupérer les notes depuis l'API
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Note: Les données détaillées des notes nécessitent une intégration API complète.', 14, 65);
  };

  const generateAbsencesReport = async (doc: jsPDF) => {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Rapport des Absences', 14, 40);

    // Statistiques générales
    const totalStudents = students?.length || 0;
    doc.setFontSize(12);
    doc.text(`Nombre total d'élèves: ${totalStudents}`, 14, 50);
    doc.text(`Période: ${periods.find(p => p.value === selectedPeriod)?.label || 'Toute l\'année'}`, 14, 56);

    // Note: Dans une vraie application, vous devriez récupérer les absences depuis l'API
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Note: Les données détaillées des absences nécessitent une intégration API complète.', 14, 65);
  };

  const generateOverviewReport = async (doc: jsPDF) => {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Rapport Global de l\'Établissement', 14, 40);

    // Statistiques
    doc.setFontSize(12);
    doc.text('Statistiques Générales', 14, 50);
    
    const stats = [
      ['Élèves', dashboardStats?.totalStudents || 0],
      ['Enseignants', dashboardStats?.totalTeachers || 0],
      ['Classes', dashboardStats?.totalClasses || 0],
      ['Parents', dashboardStats?.totalParents || 0],
    ];

    doc.autoTable({
      startY: 55,
      head: [['Catégorie', 'Nombre']],
      body: stats,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });
  };

  const handleClose = () => {
    setSelectedReport(null);
    setSelectedClass('');
    setSelectedPeriod('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Générer un Rapport" size="xl">
      <div className="space-y-6">
        {/* Type de rapport */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            Sélectionner le type de rapport <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedReport === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedReport(option.id)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                    isSelected
                      ? `border-transparent bg-gradient-to-br ${option.color} text-white shadow-lg transform scale-105`
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-white/20' : `bg-gradient-to-br ${option.color}`
                    }`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-white'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {option.label}
                      </h3>
                      <p className={`text-sm ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <FiCheck className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options supplémentaires selon le type de rapport */}
        {selectedReport && (
          <div className="space-y-4 animate-fade-in border-t border-gray-200 pt-6">
            {(selectedReport === 'grades' || selectedReport === 'absences' || selectedReport === 'students') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filtrer par classe (optionnel)
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                >
                  <option value="">Toutes les classes</option>
                  {classes?.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.level}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(selectedReport === 'grades' || selectedReport === 'absences') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Période
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                >
                  {periods.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Aperçu des données */}
            {selectedReport === 'overview' && dashboardStats && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                <h4 className="font-semibold text-gray-900 mb-3">Aperçu des données</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Élèves</p>
                    <p className="text-2xl font-bold text-indigo-600">{dashboardStats.totalStudents || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Enseignants</p>
                    <p className="text-2xl font-bold text-purple-600">{dashboardStats.totalTeachers || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Classes</p>
                    <p className="text-2xl font-bold text-indigo-600">{dashboardStats.totalClasses || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Parents</p>
                    <p className="text-2xl font-bold text-purple-600">{dashboardStats.totalParents || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={generatePDF}
            disabled={!selectedReport || isGenerating}
            className="min-w-[180px]"
          >
            {isGenerating ? (
              <>
                <FiLoader className="w-5 h-5 mr-2 animate-spin inline" />
                Génération...
              </>
            ) : (
              <>
                <FiDownload className="w-5 h-5 mr-2 inline" />
                Générer le PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GenerateReportModal;

