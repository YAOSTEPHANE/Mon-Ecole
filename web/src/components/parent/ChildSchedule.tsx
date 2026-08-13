import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parentApi } from '../../services/api';
import Card from '../ui/Card';
import { FiSearch, FiDownload, FiCalendar } from 'react-icons/fi';
import StudentScheduleCalendar from '../student/StudentScheduleCalendar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from '../ui/Button';

interface ChildScheduleProps {
  studentId: string;
  searchQuery?: string;
}

const DAYS = [
  { value: 0, label: 'Dimanche', short: 'Dim' },
  { value: 1, label: 'Lundi', short: 'Lun' },
  { value: 2, label: 'Mardi', short: 'Mar' },
  { value: 3, label: 'Mercredi', short: 'Mer' },
  { value: 4, label: 'Jeudi', short: 'Jeu' },
  { value: 5, label: 'Vendredi', short: 'Ven' },
  { value: 6, label: 'Samedi', short: 'Sam' },
];

const ChildSchedule = ({ studentId, searchQuery = '' }: ChildScheduleProps) => {
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['parent-child-schedule', studentId],
    queryFn: () => parentApi.getChildSchedule(studentId),
    enabled: !!studentId,
  });

  const exportToPDF = () => {
    if (!schedule || schedule.length === 0) {
      toast.error('Aucun emploi du temps à exporter');
      return;
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape pour un meilleur affichage
      const currentDate = new Date().toLocaleDateString('fr-FR');

      // Header
      doc.setFillColor(139, 92, 246);
      doc.roundedRect(14, 10, 40, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SM', 34, 18, { align: 'center' });
      
      doc.setTextColor(139, 92, 246);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('School Manager', 60, 18);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('Emploi du Temps', 60, 25);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${currentDate}`, 60, 30);

      // Organiser les cours par jour
      const scheduleByDay: Record<number, any[]> = {};
      DAYS.forEach(day => {
        scheduleByDay[day.value] = schedule.filter((s: any) => s.dayOfWeek === day.value);
      });

      // Créer les données du tableau
      const tableData: any[][] = [];
      
      // Trouver le nombre maximum de cours par jour
      const maxCoursesPerDay = Math.max(...Object.values(scheduleByDay).map(daySchedule => daySchedule.length));

      // Créer les lignes pour chaque créneau
      for (let i = 0; i < maxCoursesPerDay; i++) {
        const row: any[] = [];
        DAYS.forEach(day => {
          const daySchedule = scheduleByDay[day.value] || [];
          if (daySchedule[i]) {
            const course = daySchedule[i];
            const timeRange = `${course.startTime} - ${course.endTime}`;
            const courseInfo = `${course.course.name}\n${course.course.teacher.user.firstName} ${course.course.teacher.user.lastName}\n${timeRange}${course.room ? `\nSalle: ${course.room}` : ''}`;
            row.push(courseInfo);
          } else {
            row.push('');
          }
        });
        tableData.push(row);
      }

      // En-têtes des colonnes (jours de la semaine)
      const headers = DAYS.map(day => day.label);

      const useAutoTable = (options: any) => {
        if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(options);
        } else if (typeof autoTable === 'function') {
          autoTable(doc, options);
        } else {
          throw new Error('autoTable is not available');
        }
      };

      useAutoTable({
        startY: 38,
        head: [headers],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [139, 92, 246], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 10
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
          5: { cellWidth: 35 },
          6: { cellWidth: 35 },
        },
        margin: { left: 14, right: 14, top: 38 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`emploi-du-temps-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Emploi du temps exporté en PDF avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const filteredSchedule = useMemo(() => {
    if (!schedule || !searchQuery) return schedule || [];
    
    const query = searchQuery.toLowerCase();
    return schedule.filter((s: any) => {
      const courseName = s.course?.name?.toLowerCase() || '';
      const teacherName = `${s.course?.teacher?.user?.firstName || ''} ${s.course?.teacher?.user?.lastName || ''}`.toLowerCase();
      const room = s.room?.toLowerCase() || '';
      return courseName.includes(query) || teacherName.includes(query) || room.includes(query);
    });
  }, [schedule, searchQuery]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement de l'emploi du temps...</p>
        </div>
      </Card>
    );
  }

  if (!schedule || schedule.length === 0) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Aucun emploi du temps disponible</p>
          <p className="text-sm">L'emploi du temps apparaîtra ici une fois configuré</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec bouton d'export */}
      <Card className="border border-cptb-gold/20 bg-gradient-to-r from-amber-50/80 to-stone-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Emploi du Temps</h2>
            <p className="text-sm text-gray-600">Visualisez et téléchargez l'emploi du temps</p>
          </div>
          <Button
            onClick={exportToPDF}
            variant="primary"
            size="sm"
          >
            <FiDownload className="w-4 h-4 mr-2" />
            Télécharger PDF
          </Button>
        </div>
      </Card>

      {searchQuery && (
        <Card className="border border-cptb-gold/20 bg-gradient-to-r from-amber-50/70 to-stone-50">
          <div className="flex items-center space-x-3">
            <FiSearch className="w-5 h-5 text-cptb-blue" />
            <div>
              <p className="font-semibold text-stone-900">
                Recherche: <span className="text-cptb-blue">"{searchQuery}"</span>
              </p>
              <p className="text-sm text-gray-600">
                {filteredSchedule.length} cours trouvé(s)
              </p>
            </div>
          </div>
        </Card>
      )}

      {filteredSchedule.length > 0 ? (
        <StudentScheduleCalendar schedule={filteredSchedule} />
      ) : searchQuery ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiSearch className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">Aucun cours trouvé</p>
            <p className="text-sm">Essayez avec d'autres mots-clés</p>
          </div>
        </Card>
      ) : (
        <StudentScheduleCalendar schedule={schedule} />
      )}
    </div>
  );
};

export default ChildSchedule;



