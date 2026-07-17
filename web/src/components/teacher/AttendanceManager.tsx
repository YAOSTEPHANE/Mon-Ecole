import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import NFCAttendanceScanner from './NFCAttendanceScanner';
import ExternalNFCReceiver from '../ui/ExternalNFCReceiver';
import toast from 'react-hot-toast';
import { 
  FiUserCheck, 
  FiCalendar, 
  FiSearch,
  FiCheck,
  FiX,
  FiClock,
  FiBook,
  FiFilter,
  FiWifi
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AttendanceManagerProps {
  searchQuery?: string;
}

const AttendanceManager = ({ searchQuery = '' }: AttendanceManagerProps) => {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showTakeAttendanceModal, setShowTakeAttendanceModal] = useState(false);
  const [showNFCScanner, setShowNFCScanner] = useState(true); // Scan de badge affiché par défaut
  const [useExternalDevice, setUseExternalDevice] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE'>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [scannedStudents, setScannedStudents] = useState<string[]>([]);

  // Fetch courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: teacherApi.getCourses,
  });

  // Fetch absences for selected course and date
  const { data: absences, isLoading: absencesLoading } = useQuery({
    queryKey: ['teacher-course-absences', selectedCourse, selectedDate],
    queryFn: () => teacherApi.getCourseAbsences(selectedCourse!, selectedDate),
    enabled: !!selectedCourse,
  });

  // Auto-select first course
  useEffect(() => {
    if (courses && courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0].id);
    }
  }, [courses, selectedCourse]);

  // Get students for the selected course (actifs uniquement)
  const selectedCourseData = courses?.find((c: any) => c.id === selectedCourse);
  const students = useMemo(
    () => (selectedCourseData?.class?.students || []).filter((s: any) => s.isActive !== false),
    [selectedCourseData]
  );

  // Synchroniser les statuts de pointage depuis les absences chargées (ou défaut ABSENT)
  useEffect(() => {
    if (students.length === 0) return;
    const status: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
    students.forEach((student: any) => {
      const record = absences?.find((a: any) => a.studentId === student.id);
      if (record) {
        status[student.id] = record.status === 'PRESENT' ? 'PRESENT' : record.status === 'LATE' ? 'LATE' : 'ABSENT';
      } else {
        status[student.id] = 'ABSENT';
      }
    });
    setAttendanceStatus(status);
  }, [absences, students]);

  // Filter absences
  const filteredAbsences = useMemo(() => {
    if (!absences) return [];
    
    let filtered = absences;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a: any) => {
        const studentName = `${a.student?.user?.firstName || ''} ${a.student?.user?.lastName || ''}`.toLowerCase();
        return studentName.includes(query);
      });
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((a: any) => a.status === filterStatus);
    }
    
    return filtered;
  }, [absences, searchQuery, filterStatus]);

  // Initialize attendance mutation (marquer tous les élèves comme ABSENT)
  const initAttendanceMutation = useMutation({
    mutationFn: (data: { courseId: string; date: string }) => teacherApi.initAttendance(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course-absences'] });
      toast.success(`Prise d'appel initialisée: ${data.total} élèves marqués comme absents`);
      // Réinitialiser le statut de présence
      const status: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
      students.forEach((student: any) => {
        status[student.id] = 'ABSENT';
      });
      setAttendanceStatus(status);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'initialisation');
    },
  });

  // Take attendance mutation
  const takeAttendanceMutation = useMutation({
    mutationFn: (data: any) => teacherApi.takeAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course-absences'] });
      toast.success('Appel enregistré avec succès');
      setShowTakeAttendanceModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
    },
  });

  const handleInitAttendance = () => {
    if (!selectedCourse || !selectedDate) {
      toast.error('Veuillez sélectionner un cours et une date');
      return;
    }

    if (window.confirm(
      `Démarrer le pointage pour ce cours et cette date ?\n\n` +
      `Tous les élèves seront marqués absents par défaut.\n` +
      `Chaque passage carte scolaire, empreinte digitale ou badge sera enregistré comme présent automatiquement.`
    )) {
      initAttendanceMutation.mutate({
        courseId: selectedCourse,
        date: selectedDate,
      });
    }
  };

  const handleTakeAttendance = () => {
    if (!selectedCourse || !selectedDate) {
      toast.error('Veuillez sélectionner un cours et une date');
      return;
    }

    const attendance = students.map((student: any) => ({
      studentId: student.id,
      status: attendanceStatus[student.id] || 'ABSENT',
      excused: false,
    }));

    takeAttendanceMutation.mutate({
      courseId: selectedCourse,
      date: selectedDate,
      attendance,
    });
  };

  const toggleStudentStatus = (studentId: string) => {
    setAttendanceStatus((prev) => {
      const current = prev[studentId] || 'PRESENT';
      const next = current === 'PRESENT' ? 'ABSENT' : current === 'ABSENT' ? 'LATE' : 'PRESENT';
      return { ...prev, [studentId]: next };
    });
  };

  const handleStudentScanned = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
    if (!scannedStudents.includes(studentId)) {
      setScannedStudents((prev) => [...prev, studentId]);
    }
  };

  if (coursesLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Chargement des cours...</p>
        </div>
      </Card>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <FiUserCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucun cours assigné</p>
        </div>
      </Card>
    );
  }

  const presentCount = Object.values(attendanceStatus).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(attendanceStatus).filter(s => s === 'ABSENT').length;
  const lateCount = Object.values(attendanceStatus).filter(s => s === 'LATE').length;

  return (
    <div className="space-y-6">
      {/* En-tête : cours, date, démarrage pointage */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pointage des élèves</h2>
            <p className="text-gray-600">
              Trois modes : <strong>carte scolaire</strong> (badge ou lecteur NFC), <strong>empreinte digitale</strong> (identifiant biométrique associé à l’élève comme une carte), ou <strong>saisie manuelle</strong> dans la liste. Choisissez le cours et la date, démarrez le pointage, puis enregistrez les présences.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Choisir un cours"
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>
                  {course.name} - {course.class.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label="Date du pointage"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {selectedCourse && (
              <>
                <Button
                  onClick={handleInitAttendance}
                  disabled={initAttendanceMutation.isPending}
                  variant="primary"
                  size="md"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {initAttendanceMutation.isPending ? 'Initialisation...' : 'Démarrer le pointage'}
                </Button>
                <Button
                  onClick={() => setShowTakeAttendanceModal(true)}
                  variant="secondary"
                  size="md"
                >
                  <FiUserCheck className="w-4 h-4 mr-2" />
                  Saisie manuelle
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {selectedCourse && (
        <>
          {/* Carte / empreinte / lecteur externe */}
          <Card className="border-2 border-green-200 bg-green-50/50">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiWifi className="w-5 h-5 text-green-600" />
                Carte scolaire ou empreinte digitale
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Lecture par carte NFC, lecteur externe ou terminal biométrique : le même identifiant élève que pour la carte doit être enregistré dans le dossier. Sinon utilisez la saisie manuelle ci-dessus.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant={!useExternalDevice ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => { setUseExternalDevice(false); setShowNFCScanner(true); }}
                  className={!useExternalDevice ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  Scanner navigateur
                </Button>
                <Button
                  variant={useExternalDevice ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => { setUseExternalDevice(true); setShowNFCScanner(false); }}
                  className={useExternalDevice ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  Appareil NFC externe
                </Button>
              </div>
            </div>

            {useExternalDevice ? (
              <ExternalNFCReceiver
                courseId={selectedCourse}
                selectedDate={selectedDate}
                onScanReceived={() => {
                  queryClient.invalidateQueries({ queryKey: ['teacher-course-absences'] });
                  toast.success('Pointage enregistré (carte ou lecteur)');
                }}
              />
            ) : (
              <NFCAttendanceScanner
                courseId={selectedCourse}
                selectedDate={selectedDate}
                onStudentScanned={handleStudentScanned}
                scannedStudents={scannedStudents}
              />
            )}
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total élèves</p>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FiUserCheck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Présents</p>
                  <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <FiCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Absents</p>
                  <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <FiX className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En retard</p>
                  <p className="text-2xl font-bold text-orange-600">{lateCount}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <FiClock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-2">
                <FiFilter className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtrer par statut:</span>
                <select
                  aria-label="Filtrer par statut"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">Tous</option>
                  <option value="PRESENT">Présents</option>
                  <option value="ABSENT">Absents</option>
                  <option value="LATE">En retard</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                {filteredAbsences.length} absence(s) trouvée(s)
              </div>
            </div>
          </Card>

          {/* Absences List */}
          {absencesLoading ? (
            <Card>
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p className="mt-4 text-gray-600">Chargement des absences...</p>
              </div>
            </Card>
          ) : filteredAbsences.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <FiUserCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Aucune absence enregistrée pour cette date</p>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Élève</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Justifiée</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Raison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAbsences.map((absence: any) => (
                      <tr key={absence.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <FiUserCheck className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {absence.student?.user?.firstName} {absence.student?.user?.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              absence.status === 'PRESENT' ? 'success' :
                              absence.status === 'LATE' ? 'warning' : 'danger'
                            }
                            size="sm"
                          >
                            {absence.status === 'PRESENT' ? 'Présent' :
                             absence.status === 'LATE' ? 'En retard' : 'Absent'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <FiCalendar className="w-4 h-4" />
                            <span className="text-sm">
                              {format(new Date(absence.date), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={absence.excused ? 'success' : 'secondary'}
                            size="sm"
                          >
                            {absence.excused ? 'Oui' : 'Non'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {absence.reason || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal Pointage */}
      {showTakeAttendanceModal && selectedCourse && (
        <Modal
          isOpen={showTakeAttendanceModal}
          onClose={() => setShowTakeAttendanceModal(false)}
          title={`Pointage - ${selectedCourseData?.name || 'Cours'} - ${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}`}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Cliquez sur un élève pour changer son statut : <strong>Présent</strong> → <strong>Absent</strong> → <strong>En retard</strong> → Présent.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const next: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
                  students.forEach((s: any) => { next[s.id] = 'PRESENT'; });
                  setAttendanceStatus(next);
                }}
              >
                Tous présents
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const next: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
                  students.forEach((s: any) => { next[s.id] = 'ABSENT'; });
                  setAttendanceStatus(next);
                }}
              >
                Tous absents
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {students.map((student: any) => {
                const status = attendanceStatus[student.id] || 'PRESENT';
                return (
                  <div
                    key={student.id}
                    onClick={() => toggleStudentStatus(student.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      status === 'PRESENT' ? 'bg-green-50 border-green-200 hover:bg-green-100' :
                      status === 'ABSENT' ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                      'bg-orange-50 border-orange-200 hover:bg-orange-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        status === 'PRESENT' ? 'bg-green-500' :
                        status === 'ABSENT' ? 'bg-red-500' :
                        'bg-orange-500'
                      }`}>
                        {status === 'PRESENT' ? (
                          <FiCheck className="w-5 h-5 text-white" />
                        ) : status === 'ABSENT' ? (
                          <FiX className="w-5 h-5 text-white" />
                        ) : (
                          <FiClock className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {student.user.firstName} {student.user.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {status === 'PRESENT' ? 'Présent' :
                           status === 'ABSENT' ? 'Absent' :
                           'En retard'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        status === 'PRESENT' ? 'success' :
                        status === 'ABSENT' ? 'danger' : 'warning'
                      }
                      size="sm"
                    >
                      {status === 'PRESENT' ? 'Présent' :
                       status === 'ABSENT' ? 'Absent' :
                       'En retard'}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => setShowTakeAttendanceModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleTakeAttendance}
                disabled={takeAttendanceMutation.isPending}
              >
                {takeAttendanceMutation.isPending ? 'Enregistrement...' : 'Enregistrer le pointage'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AttendanceManager;
