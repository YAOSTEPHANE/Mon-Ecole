import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StudentsList from './StudentsList';
import ClassesList from './ClassesList';
import TeachersList from './TeachersList';
import AddStudentModal from './AddStudentModal';
import AddClassModal from './AddClassModal';
import AddTeacherModal from './AddTeacherModal';
import {
  FiUsers,
  FiBook,
  FiUserCheck,
  FiPlus,
  FiBarChart,
  FiTrendingUp,
  FiFileText,
  FiDownload,
  FiSearch,
  FiFilter,
  FiBriefcase,
  FiAward,
  FiCalendar,
  FiMail,
  FiPhone,
  FiMapPin,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ADM } from './adminModuleLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type AdminTab = 'overview' | 'students' | 'classes' | 'teachers' | 'reports';

const AdministrativeManagement = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);

  // Fetch data
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: adminApi.getStudents,
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: adminApi.getTeachers,
  });

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Vue d\'ensemble', icon: FiBarChart },
    { id: 'students' as AdminTab, label: 'Élèves', icon: FiUsers },
    { id: 'classes' as AdminTab, label: 'Classes', icon: FiBook },
    { id: 'teachers' as AdminTab, label: 'Enseignants', icon: FiUserCheck },
    { id: 'reports' as AdminTab, label: 'Rapports', icon: FiFileText },
  ];

  // Export functions for Students
  const exportStudentsToCSV = () => {
    try {
      const headers = ['ID', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Classe', 'Niveau', 'Année scolaire'];
      const csvContent =
        '\ufeff' + // BOM for UTF-8
        '# École à jour - Rapport des Élèves\n' +
        `# Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n` +
        '#\n' +
        headers.join(';') +
        '\n' +
        (students || [])
          .map((s: any) =>
            [
              s.studentId || s.id,
              s.user?.lastName || 'N/A',
              s.user?.firstName || 'N/A',
              s.user?.email || 'N/A',
              s.user?.phone || 'N/A',
              s.class?.name || 'N/A',
              s.class?.level || 'N/A',
              s.class?.academicYear || 'N/A',
            ].join(';')
          )
          .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-eleves-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport des élèves exporté en CSV avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportStudentsToJSON = () => {
    try {
      const jsonData = {
        application: 'École à jour',
        logo: 'SM',
        dateExport: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
        total: students?.length || 0,
        élèves: (students || []).map((s: any) => ({
          id: s.id,
          studentId: s.studentId,
          nom: s.user?.lastName,
          prénom: s.user?.firstName,
          email: s.user?.email,
          téléphone: s.user?.phone,
          classe: s.class?.name,
          niveau: s.class?.level,
          annéeScolaire: s.class?.academicYear,
          dateNaissance: s.dateOfBirth,
          adresse: s.address,
        })),
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-eleves-${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport des élèves exporté en JSON avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
      toast.error('Erreur lors de l\'export JSON');
    }
  };

  const exportStudentsToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString('fr-FR');

      // Logo textuel stylisé
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(14, 10, 40, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SM', 34, 18, { align: 'center' });
      
      // Titre
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('École à jour', 60, 18);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('Rapport des Élèves', 60, 25);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${currentDate}`, 60, 30);

      const useAutoTable = (options: any) => {
        if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(options);
        } else if (typeof autoTable === 'function') {
          autoTable(doc, options);
        } else {
          throw new Error('autoTable is not available');
        }
      };

      const tableData = (students || []).map((s: any) => [
        s.studentId || s.id,
        `${s.user?.firstName || ''} ${s.user?.lastName || ''}`,
        s.user?.email || 'N/A',
        s.class?.name || 'N/A',
        s.class?.level || 'N/A',
      ]);

      useAutoTable({
        startY: 38,
        head: [['ID', 'Nom complet', 'Email', 'Classe', 'Niveau']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      doc.save(`rapport-eleves-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Rapport des élèves exporté en PDF avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error(`Erreur lors de l'export PDF: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Export functions for Classes
  const exportClassesToCSV = () => {
    try {
      const headers = ['Nom', 'Niveau', 'Année scolaire', 'Nombre d\'élèves', 'Enseignant principal'];
      const csvContent =
        '\ufeff' +
        '# École à jour - Rapport des Classes\n' +
        `# Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n` +
        '#\n' +
        headers.join(';') +
        '\n' +
        (classes || [])
          .map((c: any) =>
            [
              c.name,
              c.level || 'N/A',
              c.academicYear || 'N/A',
              c._count?.students || 0,
              c.teacher?.user ? `${c.teacher.user.firstName} ${c.teacher.user.lastName}` : 'N/A',
            ].join(';')
          )
          .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-classes-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport des classes exporté en CSV avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportClassesToJSON = () => {
    try {
      const jsonData = {
        application: 'École à jour',
        logo: 'SM',
        dateExport: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
        total: classes?.length || 0,
        classes: (classes || []).map((c: any) => ({
          nom: c.name,
          niveau: c.level,
          annéeScolaire: c.academicYear,
          nombreÉlèves: c._count?.students || 0,
          enseignantPrincipal: c.teacher?.user
            ? `${c.teacher.user.firstName} ${c.teacher.user.lastName}`
            : null,
        })),
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-classes-${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport des classes exporté en JSON avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
      toast.error('Erreur lors de l\'export JSON');
    }
  };

  const exportClassesToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString('fr-FR');

      // Logo textuel stylisé
      doc.setFillColor(139, 92, 246);
      doc.roundedRect(14, 10, 40, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SM', 34, 18, { align: 'center' });
      
      // Titre
      doc.setTextColor(139, 92, 246);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('École à jour', 60, 18);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('Rapport des Classes', 60, 25);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${currentDate}`, 60, 30);

      const useAutoTable = (options: any) => {
        if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(options);
        } else if (typeof autoTable === 'function') {
          autoTable(doc, options);
        } else {
          throw new Error('autoTable is not available');
        }
      };

      const tableData = (classes || []).map((c: any) => [
        c.name,
        c.level || 'N/A',
        c.academicYear || 'N/A',
        c._count?.students || 0,
        c.teacher?.user ? `${c.teacher.user.firstName} ${c.teacher.user.lastName}` : 'N/A',
      ]);

      useAutoTable({
        startY: 38,
        head: [['Nom', 'Niveau', 'Année scolaire', 'Nombre d\'élèves', 'Enseignant principal']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      doc.save(`rapport-classes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Rapport des classes exporté en PDF avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error(`Erreur lors de l'export PDF: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Export functions for Teachers
  const exportTeachersToCSV = () => {
    try {
      const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Spécialité', 'Classes assignées'];
      const csvContent =
        '\ufeff' +
        '# École à jour - Rapport du Personnel\n' +
        `# Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n` +
        '#\n' +
        headers.join(';') +
        '\n' +
        (teachers || [])
          .map((t: any) =>
            [
              t.user?.lastName || 'N/A',
              t.user?.firstName || 'N/A',
              t.user?.email || 'N/A',
              t.user?.phone || 'N/A',
              t.specialization || 'N/A',
              t.classes?.map((c: any) => c.name).join(', ') || 'Aucune',
            ].join(';')
          )
          .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-enseignants-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport des enseignants exporté en CSV avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportTeachersToJSON = () => {
    try {
      const jsonData = {
        application: 'École à jour',
        logo: 'SM',
        dateExport: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
        total: teachers?.length || 0,
        enseignants: (teachers || []).map((t: any) => ({
          nom: t.user?.lastName,
          prénom: t.user?.firstName,
          email: t.user?.email,
          téléphone: t.user?.phone,
          spécialité: t.specialization,
          classesAssignées: t.classes?.map((c: any) => c.name) || [],
        })),
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-enseignants-${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport des enseignants exporté en JSON avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
      toast.error('Erreur lors de l\'export JSON');
    }
  };

  const exportTeachersToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString('fr-FR');

      // Logo textuel stylisé
      doc.setFillColor(99, 102, 241);
      doc.roundedRect(14, 10, 40, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SM', 34, 18, { align: 'center' });
      
      // Titre
      doc.setTextColor(99, 102, 241);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('École à jour', 60, 18);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('Rapport du Personnel', 60, 25);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${currentDate}`, 60, 30);

      const useAutoTable = (options: any) => {
        if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(options);
        } else if (typeof autoTable === 'function') {
          autoTable(doc, options);
        } else {
          throw new Error('autoTable is not available');
        }
      };

      const tableData = (teachers || []).map((t: any) => [
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

      doc.save(`rapport-enseignants-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Rapport des enseignants exporté en PDF avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error(`Erreur lors de l'export PDF: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Export functions for Global Report
  const exportGlobalToCSV = () => {
    try {
      const csvContent =
        '\ufeff' +
        '# École à jour - Rapport Global Administratif\n' +
        `# Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n` +
        '#\n' +
        '=== RAPPORT GLOBAL ADMINISTRATIF ===\n' +
        `Date: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n\n` +
        '=== ÉLÈVES ===\n' +
        'ID;Nom;Prénom;Email;Téléphone;Classe;Niveau\n' +
        (students || [])
          .map((s: any) =>
            [
              s.studentId || s.id,
              s.user?.lastName || 'N/A',
              s.user?.firstName || 'N/A',
              s.user?.email || 'N/A',
              s.user?.phone || 'N/A',
              s.class?.name || 'N/A',
              s.class?.level || 'N/A',
            ].join(';')
          )
          .join('\n') +
        '\n\n=== CLASSES ===\n' +
        'Nom;Niveau;Année scolaire;Nombre d\'élèves\n' +
        (classes || [])
          .map((c: any) =>
            [c.name, c.level || 'N/A', c.academicYear || 'N/A', c._count?.students || 0].join(';')
          )
          .join('\n') +
        '\n\n=== ENSEIGNANTS ===\n' +
        'Nom;Prénom;Email;Spécialité\n' +
        (teachers || [])
          .map((t: any) =>
            [
              t.user?.lastName || 'N/A',
              t.user?.firstName || 'N/A',
              t.user?.email || 'N/A',
              t.specialization || 'N/A',
            ].join(';')
          )
          .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-global-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport global exporté en CSV avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportGlobalToJSON = () => {
    try {
      const jsonData = {
        application: 'École à jour',
        logo: 'SM',
        dateExport: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
        statistiques: {
          totalÉlèves: students?.length || 0,
          totalClasses: classes?.length || 0,
          totalEnseignants: teachers?.length || 0,
        },
        élèves: (students || []).map((s: any) => ({
          id: s.id,
          studentId: s.studentId,
          nom: s.user?.lastName,
          prénom: s.user?.firstName,
          email: s.user?.email,
          classe: s.class?.name,
        })),
        classes: (classes || []).map((c: any) => ({
          nom: c.name,
          niveau: c.level,
          annéeScolaire: c.academicYear,
          nombreÉlèves: c._count?.students || 0,
        })),
        enseignants: (teachers || []).map((t: any) => ({
          nom: t.user?.lastName,
          prénom: t.user?.firstName,
          email: t.user?.email,
          spécialité: t.specialization,
        })),
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-global-${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport global exporté en JSON avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
      toast.error('Erreur lors de l\'export JSON');
    }
  };

  const exportGlobalToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString('fr-FR');

      // Logo textuel stylisé
      doc.setFillColor(139, 92, 246);
      doc.roundedRect(14, 10, 40, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SM', 34, 18, { align: 'center' });
      
      // Titre
      doc.setTextColor(139, 92, 246);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('École à jour', 60, 18);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('Rapport Global Administratif', 60, 25);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${currentDate}`, 60, 30);

      const useAutoTable = (options: any) => {
        if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(options);
        } else if (typeof autoTable === 'function') {
          autoTable(doc, options);
        } else {
          throw new Error('autoTable is not available');
        }
      };

      // Statistiques
      let yPos = 38;
      doc.setFontSize(14);
      doc.text('Statistiques', 14, yPos);
      yPos += 10;
      const statsData = [
        ['Total Élèves', stats?.totalStudents || 0],
        ['Total Classes', stats?.totalClasses || 0],
        ['Total Enseignants', stats?.totalTeachers || 0],
      ];
      useAutoTable({
        startY: yPos,
        head: [['Indicateur', 'Valeur']],
        body: statsData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });

      // Élèves
      yPos = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.text('Élèves', 14, yPos);
      yPos += 10;
      const studentsData = (students || []).slice(0, 20).map((s: any) => [
        s.studentId || s.id,
        `${s.user?.firstName || ''} ${s.user?.lastName || ''}`,
        s.class?.name || 'N/A',
      ]);
      useAutoTable({
        startY: yPos,
        head: [['ID', 'Nom complet', 'Classe']],
        body: studentsData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      // Classes
      yPos = (doc as any).lastAutoTable.finalY + 20;
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.text('Classes', 14, yPos);
      yPos += 10;
      const classesData = (classes || []).map((c: any) => [
        c.name,
        c.level || 'N/A',
        c._count?.students || 0,
      ]);
      useAutoTable({
        startY: yPos,
        head: [['Nom', 'Niveau', 'Nombre d\'élèves']],
        body: classesData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      // Enseignants
      yPos = (doc as any).lastAutoTable.finalY + 20;
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.text('Enseignants', 14, yPos);
      yPos += 10;
      const teachersData = (teachers || []).map((t: any) => [
        `${t.user?.firstName || ''} ${t.user?.lastName || ''}`,
        t.specialization || 'N/A',
      ]);
      useAutoTable({
        startY: yPos,
        head: [['Nom complet', 'Spécialité']],
        body: teachersData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      doc.save(`rapport-global-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Rapport global exporté en PDF avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error(`Erreur lors de l'export PDF: ${error.message || 'Erreur inconnue'}`);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-3 text-white sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="mb-0.5 text-lg font-black leading-tight text-indigo-50 sm:text-xl">
              Gestion Administrative
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-indigo-100/95">
              Gérez les inscriptions, le personnel et les ressources de l&apos;établissement
            </p>
          </div>
          <div className="hidden shrink-0 items-center space-x-3 md:flex">
            <div className="text-center">
              <div className="text-base font-bold tabular-nums text-indigo-50">
                {stats?.totalStudents || 0}
              </div>
              <div className="text-[10px] text-indigo-100">Élèves</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold tabular-nums text-indigo-50">
                {stats?.totalTeachers || 0}
              </div>
              <div className="text-[10px] text-indigo-100">Enseignants</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold tabular-nums text-indigo-50">
                {stats?.totalClasses || 0}
              </div>
              <div className="text-[10px] text-indigo-100">Classes</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="p-3 sm:p-4">
        <div className={`${ADM.bigTabRow} pb-1`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={ADM.bigTabBtn(
                  isActive,
                  'bg-gradient-to-r from-indigo-600 to-purple-600'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 h-0.5 w-2/5 -translate-x-1/2 transform rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Content */}
      <div className="animate-slide-up">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[11px] text-gray-600">Total Élèves</p>
                    <p className="text-2xl font-bold tabular-nums text-blue-600">
                      {stats?.totalStudents || 0}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-500">{stats?.activeStudents || 0} actifs</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                    <FiUsers className="h-5 w-5 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[11px] text-gray-600">Total Classes</p>
                    <p className="text-2xl font-bold tabular-nums text-purple-600">
                      {stats?.totalClasses || 0}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-500">Classes actives</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-purple-600">
                    <FiBook className="h-5 w-5 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 sm:p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[11px] text-gray-600">Total Enseignants</p>
                    <p className="text-2xl font-bold tabular-nums text-indigo-600">
                      {stats?.totalTeachers || 0}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-500">Personnel actif</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
                    <FiUserCheck className="h-5 w-5 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[11px] text-gray-600">Total Parents</p>
                    <p className="text-2xl font-bold tabular-nums text-green-600">
                      {stats?.totalParents || 0}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-500">Comptes parents</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-600">
                    <FiUsers className="h-5 w-5 text-white" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Actions rapides */}
            <Card className="p-3 sm:p-4">
              <h3 className="mb-3 text-base font-bold text-gray-800">Actions Rapides</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <button
                  onClick={() => setIsAddStudentModalOpen(true)}
                  type="button"
                  className="group rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-3 text-left transition-all duration-300 hover:border-green-400 hover:shadow-md sm:p-3.5"
                >
                  <div className="mb-2 flex items-center space-x-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 transition-transform group-hover:scale-105">
                      <FiUsers className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">Ajouter un élève</h4>
                  </div>
                  <p className="text-xs leading-snug text-gray-600">
                    Enregistrer un nouvel élève dans le système
                  </p>
                </button>

                <button
                  onClick={() => setIsAddClassModalOpen(true)}
                  type="button"
                  className="group rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-3 text-left transition-all duration-300 hover:border-purple-400 hover:shadow-md sm:p-3.5"
                >
                  <div className="mb-2 flex items-center space-x-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 transition-transform group-hover:scale-105">
                      <FiBook className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">Créer une classe</h4>
                  </div>
                  <p className="text-xs leading-snug text-gray-600">
                    Créer une nouvelle classe et assigner un enseignant
                  </p>
                </button>

                <button
                  onClick={() => setIsAddTeacherModalOpen(true)}
                  type="button"
                  className="group rounded-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 text-left transition-all duration-300 hover:border-indigo-400 hover:shadow-md sm:p-3.5"
                >
                  <div className="mb-2 flex items-center space-x-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 transition-transform group-hover:scale-105">
                      <FiUserCheck className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">Ajouter un enseignant</h4>
                  </div>
                  <p className="text-xs leading-snug text-gray-600">
                    Enregistrer un nouvel enseignant dans le système
                  </p>
                </button>
              </div>
            </Card>

            {/* Résumé récent */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-3 sm:p-4">
                <h3 className="mb-3 text-base font-bold text-gray-800">Élèves récemment ajoutés</h3>
                {students && students.length > 0 ? (
                  <div className="space-y-2">
                    {students.slice(0, 5).map((student: any) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-2 transition-colors hover:bg-gray-100"
                      >
                        <div className="flex min-w-0 items-center space-x-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                            <FiUsers className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">
                              {student.user.firstName} {student.user.lastName}
                            </p>
                            <p className="text-[10px] text-gray-500">{student.studentId}</p>
                          </div>
                        </div>
                        {student.class && (
                          <Badge className="shrink-0 bg-blue-100 text-xs text-blue-800">
                            {student.class.name}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-gray-500">Aucun élève enregistré</p>
                )}
              </Card>

              <Card className="p-3 sm:p-4">
                <h3 className="mb-3 text-base font-bold text-gray-800">Classes récemment créées</h3>
                {classes && classes.length > 0 ? (
                  <div className="space-y-2">
                    {classes.slice(0, 5).map((cls: any) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-2 transition-colors hover:bg-gray-100"
                      >
                        <div className="flex min-w-0 items-center space-x-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                            <FiBook className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">{cls.name}</p>
                            <p className="text-[10px] text-gray-500">
                              {cls.level} - {cls.academicYear}
                            </p>
                          </div>
                        </div>
                        <Badge className="shrink-0 bg-indigo-100 text-xs text-indigo-800">
                          {cls._count?.students || 0} élèves
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-gray-500">Aucune classe créée</p>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-3">
            <Card className="p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-gray-800">Gestion des Élèves</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportStudentsToCSV()}
                    className="flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportStudentsToJSON()}
                    className="flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportStudentsToPDF()}
                    className="flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </Card>
            <StudentsList searchQuery={searchQuery} />
          </div>
        )}
        {activeTab === 'classes' && (
          <div className="space-y-3">
            <Card className="p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-gray-800">Gestion des Classes</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportClassesToCSV()}
                    className="flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportClassesToJSON()}
                    className="flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportClassesToPDF()}
                    className="flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </Card>
            <ClassesList searchQuery={searchQuery} />
          </div>
        )}
        {activeTab === 'teachers' && (
          <div className="space-y-3">
            <Card className="p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-gray-800">Gestion des Enseignants</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportTeachersToCSV()}
                    className="flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportTeachersToJSON()}
                    className="flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportTeachersToPDF()}
                    className="flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </Card>
            <TeachersList searchQuery={searchQuery} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <Card className="p-3 sm:p-4">
              <h3 className="mb-3 text-base font-bold text-gray-800">Rapports Administratifs</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {/* Rapport des Élèves */}
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-3 transition-all hover:shadow-lg sm:p-3.5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                      <FiUsers className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-0.5 text-sm font-bold text-gray-800">Rapport des Élèves</h4>
                      <p className="text-xs leading-snug text-gray-600">Liste complète des élèves</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportStudentsToCSV()}
                    className="min-w-0 flex-1 sm:min-w-[5.5rem]"
                  >
                    <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                    <span>CSV</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportStudentsToJSON()}
                    className="min-w-0 flex-1 sm:min-w-[5.5rem]"
                  >
                    <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                    <span>JSON</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportStudentsToPDF()}
                    className="min-w-0 flex-1 sm:min-w-[5.5rem]"
                  >
                    <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                    <span>PDF</span>
                  </Button>
                  </div>
                </Card>

                {/* Rapport des Classes */}
                <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-3 transition-all hover:shadow-lg sm:p-3.5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-purple-600">
                      <FiBook className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-0.5 text-sm font-bold text-gray-800">Rapport des Classes</h4>
                      <p className="text-xs leading-snug text-gray-600">Statistiques par classe</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportClassesToCSV()}
                      className="min-w-0 flex-1 sm:min-w-[5.5rem]"
                    >
                      <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                      <span>CSV</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportClassesToJSON()}
                      className="min-w-0 flex-1 sm:min-w-[5.5rem]"
                    >
                      <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                      <span>JSON</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportClassesToPDF()}
                      className="min-w-0 flex-1 sm:min-w-[5.5rem]"
                    >
                      <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                      <span>PDF</span>
                    </Button>
                  </div>
                </Card>

                {/* Rapport du Personnel */}
                <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 transition-all hover:shadow-lg sm:p-3.5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
                      <FiUserCheck className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-0.5 text-sm font-bold text-gray-800">Rapport du Personnel</h4>
                      <p className="text-xs leading-snug text-gray-600">Liste des enseignants</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportTeachersToCSV()}
                      className="min-w-0 flex-1 sm:min-w-[5.5rem]"
                    >
                      <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                      <span>CSV</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportTeachersToJSON()}
                      className="min-w-0 flex-1 sm:min-w-[5.5rem]"
                    >
                      <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                      <span>JSON</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportTeachersToPDF()}
                      className="min-w-0 flex-1 sm:min-w-[5.5rem]"
                    >
                      <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                      <span>PDF</span>
                    </Button>
                  </div>
                </Card>
              </div>
            </Card>

            {/* Rapport global */}
            <Card className="p-3 sm:p-4">
              <h3 className="mb-2 text-base font-bold text-gray-800">Rapport Global</h3>
              <p className="mb-3 text-xs leading-relaxed text-gray-600">
                Exportez toutes les données administratives en un seul fichier
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportGlobalToCSV()}
                  className="min-w-[8rem] flex-1 text-xs"
                >
                  <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                  Tout en CSV
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportGlobalToJSON()}
                  className="min-w-[8rem] flex-1 text-xs"
                >
                  <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                  Tout en JSON
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportGlobalToPDF()}
                  className="min-w-[8rem] flex-1 text-xs"
                >
                  <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                  Tout en PDF
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
      />
      <AddClassModal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
      />
      <AddTeacherModal
        isOpen={isAddTeacherModalOpen}
        onClose={() => setIsAddTeacherModalOpen(false)}
      />
    </div>
  );
};

export default AdministrativeManagement;

