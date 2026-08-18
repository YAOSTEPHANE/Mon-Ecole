import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  FiDownload, 
  FiUsers, 
  FiBook, 
  FiUserCheck,
  FiFileText,
  FiDatabase,
  FiLoader,
  FiCheck,
  FiFile,
  FiCode
} from 'react-icons/fi';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportType = 'csv' | 'json' | 'pdf';
type DataType = 'students' | 'classes' | 'teachers' | 'all';

interface ExportOption {
  id: ExportType;
  label: string;
  description: string;
  icon: typeof FiFile;
  color: string;
}

interface DataOption {
  id: DataType;
  label: string;
  description: string;
  icon: typeof FiUsers;
  color: string;
}

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const ExportDataModal: React.FC<ExportDataModalProps> = ({ isOpen, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportType | null>(null);
  const [selectedData, setSelectedData] = useState<DataType | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data
  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: adminApi.getStudents,
    enabled: isOpen && (selectedData === 'students' || selectedData === 'all'),
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
    enabled: isOpen && (selectedData === 'classes' || selectedData === 'all'),
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: adminApi.getTeachers,
    enabled: isOpen && (selectedData === 'teachers' || selectedData === 'all'),
  });

  const exportFormats: ExportOption[] = [
    {
      id: 'csv',
      label: 'CSV',
      description: 'Format tableur compatible Excel',
      icon: FiFileText,
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'json',
      label: 'JSON',
      description: 'Format de données structuré',
      icon: FiCode,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'pdf',
      label: 'PDF',
      description: 'Document formaté et imprimable',
      icon: FiFile,
      color: 'from-red-500 to-red-600',
    },
  ];

  const dataTypes: DataOption[] = [
    {
      id: 'students',
      label: 'Élèves',
      description: 'Toutes les données des élèves',
      icon: FiUsers,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'classes',
      label: 'Classes',
      description: 'Toutes les données des classes',
      icon: FiBook,
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'teachers',
      label: 'Enseignants',
      description: 'Toutes les données des enseignants',
      icon: FiUserCheck,
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'all',
      label: 'Toutes les données',
      description: 'Export complet de l\'établissement',
      icon: FiDatabase,
      color: 'from-indigo-500 to-indigo-600',
    },
  ];

  // Convert data to CSV
  const convertToCSV = (data: any[], headers: string[]): string => {
    const csvRows: string[] = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach((row) => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  // Download file
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!selectedData) return;

    try {
      let csvContent = '';
      let filename = '';

      switch (selectedData) {
        case 'students':
          const studentHeaders = ['ID', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Classe', 'Statut'];
          const studentData = students?.map((s: any) => ({
            'ID': s.studentId,
            'Prénom': s.user.firstName,
            'Nom': s.user.lastName,
            'Email': s.user.email,
            'Téléphone': s.user.phone || '',
            'Classe': s.class?.name || 'Non assigné',
            'Statut': s.isActive ? 'Actif' : 'Inactif',
          })) || [];
          csvContent = convertToCSV(studentData, studentHeaders);
          filename = `eleves_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'classes':
          const classHeaders = ['Nom', 'Niveau', 'Année', 'Salle', 'Capacité', 'Élèves', 'Professeur'];
          const classData = classes?.map((c: any) => ({
            'Nom': c.name,
            'Niveau': c.level,
            'Année': c.academicYear,
            'Salle': c.room || '',
            'Capacité': c.capacity,
            'Élèves': c._count?.students || 0,
            'Professeur': c.teacher?.user ? `${c.teacher.user.firstName} ${c.teacher.user.lastName}` : '',
          })) || [];
          csvContent = convertToCSV(classData, classHeaders);
          filename = `classes_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'teachers':
          const teacherHeaders = ['ID', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Spécialité', 'Contrat'];
          const teacherData = teachers?.map((t: any) => ({
            'ID': t.employeeId,
            'Prénom': t.user.firstName,
            'Nom': t.user.lastName,
            'Email': t.user.email,
            'Téléphone': t.user.phone || '',
            'Spécialité': t.specialization,
            'Contrat': t.contractType,
          })) || [];
          csvContent = convertToCSV(teacherData, teacherHeaders);
          filename = `enseignants_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'all':
          // Export all data - create a combined CSV
          const allHeaders = ['Type', 'ID', 'Nom', 'Email', 'Classe/Spécialité', 'Statut'];
          const allDataRows: any[] = [];
          
          // Add students
          students?.forEach((s: any) => {
            allDataRows.push({
              'Type': 'Élève',
              'ID': s.studentId,
              'Nom': `${s.user.firstName} ${s.user.lastName}`,
              'Email': s.user.email,
              'Classe/Spécialité': s.class?.name || 'Non assigné',
              'Statut': s.isActive ? 'Actif' : 'Inactif',
            });
          });
          
          // Add teachers
          teachers?.forEach((t: any) => {
            allDataRows.push({
              'Type': 'Enseignant',
              'ID': t.employeeId,
              'Nom': `${t.user.firstName} ${t.user.lastName}`,
              'Email': t.user.email,
              'Classe/Spécialité': t.specialization,
              'Statut': t.contractType,
            });
          });
          
          csvContent = convertToCSV(allDataRows, allHeaders);
          filename = `export_complet_${new Date().toISOString().split('T')[0]}.csv`;
          break;
      }

      downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
      toast.success('Données exportées en CSV avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  // Export to JSON
  const exportToJSON = () => {
    if (!selectedData) return;

    try {
      let jsonData: any = {};
      let filename = '';

      switch (selectedData) {
        case 'students':
          jsonData = students || [];
          filename = `eleves_${new Date().toISOString().split('T')[0]}.json`;
          break;

        case 'classes':
          jsonData = classes || [];
          filename = `classes_${new Date().toISOString().split('T')[0]}.json`;
          break;

        case 'teachers':
          jsonData = teachers || [];
          filename = `enseignants_${new Date().toISOString().split('T')[0]}.json`;
          break;

        case 'all':
          jsonData = {
            students: students || [],
            classes: classes || [],
            teachers: teachers || [],
            exportDate: new Date().toISOString(),
          };
          filename = `export_complet_${new Date().toISOString().split('T')[0]}.json`;
          break;
      }

      const jsonContent = JSON.stringify(jsonData, null, 2);
      downloadFile(jsonContent, filename, 'application/json');
      toast.success('Données exportées en JSON avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export JSON:', error);
      toast.error('Erreur lors de l\'export JSON');
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!selectedData) return;

    try {
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString('fr-FR');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(99, 102, 241);
      doc.text('École à jour', 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Export généré le ${currentDate}`, 14, 28);

      switch (selectedData) {
        case 'students':
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text('Export des Élèves', 14, 40);

          const studentTableData = students?.map((s: any) => [
            s.studentId,
            `${s.user.firstName} ${s.user.lastName}`,
            s.user.email,
            s.class?.name || 'Non assigné',
            s.isActive ? 'Actif' : 'Inactif',
          ]) || [];

          doc.autoTable({
            startY: 45,
            head: [['ID', 'Nom', 'Email', 'Classe', 'Statut']],
            body: studentTableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
          });
          break;

        case 'classes':
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text('Export des Classes', 14, 40);

          const classTableData = classes?.map((c: any) => [
            c.name,
            c.level,
            c.academicYear,
            c.room || 'N/A',
            `${c._count?.students || 0} / ${c.capacity}`,
          ]) || [];

          doc.autoTable({
            startY: 45,
            head: [['Nom', 'Niveau', 'Année', 'Salle', 'Élèves']],
            body: classTableData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
          });
          break;

        case 'teachers':
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text('Export des Enseignants', 14, 40);

          const teacherTableData = teachers?.map((t: any) => [
            t.employeeId,
            `${t.user.firstName} ${t.user.lastName}`,
            t.user.email,
            t.specialization,
            t.contractType,
          ]) || [];

          doc.autoTable({
            startY: 45,
            head: [['ID', 'Nom', 'Email', 'Spécialité', 'Contrat']],
            body: teacherTableData,
            theme: 'striped',
            headStyles: { fillColor: [139, 92, 246] },
          });
          break;

        case 'all':
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text('Export Complet', 14, 40);

          // Students
          doc.setFontSize(12);
          doc.text('Élèves', 14, 50);
          const allStudentData = students?.map((s: any) => [
            s.studentId,
            `${s.user.firstName} ${s.user.lastName}`,
            s.class?.name || 'Non assigné',
          ]) || [];
          doc.autoTable({
            startY: 55,
            head: [['ID', 'Nom', 'Classe']],
            body: allStudentData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
          });

          // Classes
          const finalY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(12);
          doc.text('Classes', 14, finalY);
          const allClassData = classes?.map((c: any) => [
            c.name,
            c.level,
            `${c._count?.students || 0} / ${c.capacity}`,
          ]) || [];
          doc.autoTable({
            startY: finalY + 5,
            head: [['Nom', 'Niveau', 'Élèves']],
            body: allClassData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
          });

          // Teachers
          const finalY2 = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(12);
          doc.text('Enseignants', 14, finalY2);
          const allTeacherData = teachers?.map((t: any) => [
            t.employeeId,
            `${t.user.firstName} ${t.user.lastName}`,
            t.specialization,
          ]) || [];
          doc.autoTable({
            startY: finalY2 + 5,
            head: [['ID', 'Nom', 'Spécialité']],
            body: allTeacherData,
            theme: 'striped',
            headStyles: { fillColor: [139, 92, 246] },
          });
          break;
      }

      const filename = `export_${selectedData}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('Données exportées en PDF avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const handleExport = async () => {
    if (!selectedFormat || !selectedData) {
      toast.error('Veuillez sélectionner un format et des données');
      return;
    }

    setIsExporting(true);

    try {
      switch (selectedFormat) {
        case 'csv':
          exportToCSV();
          break;
        case 'json':
          exportToJSON();
          break;
        case 'pdf':
          exportToPDF();
          break;
      }
      handleClose();
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFormat(null);
    setSelectedData(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Exporter les Données" size="xl">
      <div className="space-y-6">
        {/* Format d'export */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            Format d'export <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exportFormats.map((format) => {
              const Icon = format.icon;
              const isSelected = selectedFormat === format.id;
              
              return (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                    isSelected
                      ? `border-transparent bg-gradient-to-br ${format.color} text-white shadow-lg transform scale-105`
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-white/20' : `bg-gradient-to-br ${format.color}`
                    }`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {format.label}
                      </h3>
                      <p className={`text-xs ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                        {format.description}
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

        {/* Type de données */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            Données à exporter <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataTypes.map((dataType) => {
              const Icon = dataType.icon;
              const isSelected = selectedData === dataType.id;
              
              return (
                <button
                  key={dataType.id}
                  onClick={() => setSelectedData(dataType.id)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                    isSelected
                      ? `border-transparent bg-gradient-to-br ${dataType.color} text-white shadow-lg transform scale-105`
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-white/20' : `bg-gradient-to-br ${dataType.color}`
                    }`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {dataType.label}
                      </h3>
                      <p className={`text-xs ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                        {dataType.description}
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

        {/* Aperçu des données */}
        {selectedData && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200 animate-fade-in">
            <h4 className="font-semibold text-gray-900 mb-3">Aperçu des données</h4>
            <div className="grid grid-cols-3 gap-4">
              {selectedData === 'students' || selectedData === 'all' ? (
                <div>
                  <p className="text-sm text-gray-600">Élèves</p>
                  <p className="text-2xl font-bold text-blue-600">{students?.length || 0}</p>
                </div>
              ) : null}
              {selectedData === 'classes' || selectedData === 'all' ? (
                <div>
                  <p className="text-sm text-gray-600">Classes</p>
                  <p className="text-2xl font-bold text-green-600">{classes?.length || 0}</p>
                </div>
              ) : null}
              {selectedData === 'teachers' || selectedData === 'all' ? (
                <div>
                  <p className="text-sm text-gray-600">Enseignants</p>
                  <p className="text-2xl font-bold text-purple-600">{teachers?.length || 0}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isExporting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={!selectedFormat || !selectedData || isExporting}
            className="min-w-[180px]"
          >
            {isExporting ? (
              <>
                <FiLoader className="w-5 h-5 mr-2 animate-spin inline" />
                Export en cours...
              </>
            ) : (
              <>
                <FiDownload className="w-5 h-5 mr-2 inline" />
                Exporter les données
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportDataModal;

