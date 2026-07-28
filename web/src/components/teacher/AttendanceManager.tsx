import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi, educatorApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import NFCAttendanceScanner from './NFCAttendanceScanner';
import ExternalNFCReceiver from '../ui/ExternalNFCReceiver';
import toast from 'react-hot-toast';
import {
  FiUserCheck,
  FiCalendar,
  FiCheck,
  FiX,
  FiClock,
  FiFilter,
  FiWifi,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AttendanceManagerProps {
  searchQuery?: string;
  /** teacher (défaut) ou educator — appel de remplacement sur classes assignées. */
  variant?: 'teacher' | 'educator';
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';
type CourseScope = 'mine' | 'substitute';

type RollcallCourse = {
  id: string;
  name: string;
  isSubstitute?: boolean;
  class: { name: string; students?: Array<{ id: string; isActive?: boolean; user: { firstName: string; lastName: string } }> };
  teacher?: { user?: { firstName?: string; lastName?: string } };
};

const AttendanceManager = ({ searchQuery = '', variant = 'teacher' }: AttendanceManagerProps) => {
  const queryClient = useQueryClient();
  const isEducator = variant === 'educator';
  const [courseScope, setCourseScope] = useState<CourseScope>('mine');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showOtherModes, setShowOtherModes] = useState(false);
  const [useExternalDevice, setUseExternalDevice] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, AttendanceStatus>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [scannedStudents, setScannedStudents] = useState<string[]>([]);

  const coursesQueryKey = isEducator
    ? (['educator-attendance-courses'] as const)
    : (['teacher-courses', courseScope] as const);
  const absencesQueryKey = isEducator
    ? (['educator-course-absences', selectedCourse, selectedDate] as const)
    : (['teacher-course-absences', selectedCourse, selectedDate] as const);

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: coursesQueryKey,
    queryFn: () =>
      isEducator
        ? educatorApi.getAttendanceCourses()
        : teacherApi.getCourses({ scope: courseScope }),
  });

  const { data: absences, isLoading: absencesLoading } = useQuery({
    queryKey: absencesQueryKey,
    queryFn: () =>
      isEducator
        ? educatorApi.getCourseAbsences(selectedCourse!, selectedDate)
        : teacherApi.getCourseAbsences(selectedCourse!, selectedDate),
    enabled: !!selectedCourse,
  });

  useEffect(() => {
    setSelectedCourse(null);
  }, [courseScope, isEducator]);

  useEffect(() => {
    if (courses && courses.length > 0) {
      const stillValid = selectedCourse && courses.some((c: RollcallCourse) => c.id === selectedCourse);
      if (!stillValid) {
        setSelectedCourse(courses[0].id);
      }
    } else if (courses && courses.length === 0) {
      setSelectedCourse(null);
    }
  }, [courses, selectedCourse]);

  const selectedCourseData = (courses as RollcallCourse[] | undefined)?.find(
    (c) => c.id === selectedCourse
  );
  const isSubstituteCall =
    isEducator || courseScope === 'substitute' || Boolean(selectedCourseData?.isSubstitute);

  const students = useMemo(
    () =>
      (selectedCourseData?.class?.students || []).filter(
        (s) => s.isActive !== false
      ),
    [selectedCourseData]
  );

  useEffect(() => {
    if (students.length === 0) return;
    const status: Record<string, AttendanceStatus> = {};
    students.forEach((student) => {
      const record = absences?.find((a: { studentId: string; status: string }) => a.studentId === student.id);
      if (record) {
        status[student.id] =
          record.status === 'PRESENT' ? 'PRESENT' : record.status === 'LATE' ? 'LATE' : 'ABSENT';
      } else {
        status[student.id] = 'ABSENT';
      }
    });
    setAttendanceStatus(status);
  }, [absences, students]);

  const filteredStudents = useMemo(() => {
    let list = students;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const studentName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
        return studentName.includes(query);
      });
    }

    if (filterStatus !== 'all') {
      list = list.filter((s) => (attendanceStatus[s.id] || 'ABSENT') === filterStatus);
    }

    return list;
  }, [students, searchQuery, filterStatus, attendanceStatus]);

  const initAttendanceMutation = useMutation({
    mutationFn: (data: { courseId: string; date: string }) =>
      isEducator ? educatorApi.initAttendance(data) : teacherApi.initAttendance(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: absencesQueryKey });
      toast.success(`Appel réinitialisé : ${data.total} élèves marqués absents`);
      const status: Record<string, AttendanceStatus> = {};
      students.forEach((student) => {
        status[student.id] = 'ABSENT';
      });
      setAttendanceStatus(status);
      setScannedStudents([]);
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || "Erreur lors de la réinitialisation");
    },
  });

  const takeAttendanceMutation = useMutation({
    mutationFn: (data: {
      courseId: string;
      date: string;
      attendance: Array<{ studentId: string; status: AttendanceStatus; excused: boolean }>;
    }) => (isEducator ? educatorApi.takeAttendance(data) : teacherApi.takeAttendance(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: absencesQueryKey });
      toast.success(
        isSubstituteCall ? 'Appel de remplacement enregistré' : 'Appel enregistré avec succès'
      );
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || "Erreur lors de l'enregistrement");
    },
  });

  const handleResetAttendance = () => {
    if (!selectedCourse || !selectedDate) {
      toast.error('Veuillez sélectionner un cours et une date');
      return;
    }

    if (
      window.confirm(
        `Réinitialiser l'appel pour ce cours et cette date ?\n\n` +
          `Tous les élèves seront marqués absents. Les pointages déjà enregistrés pour ce cours/jour seront remplacés.`
      )
    ) {
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

    const attendance = students.map((student) => ({
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
      const current = prev[studentId] || 'ABSENT';
      const next: AttendanceStatus =
        current === 'PRESENT' ? 'ABSENT' : current === 'ABSENT' ? 'LATE' : 'PRESENT';
      return { ...prev, [studentId]: next };
    });
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      next[s.id] = 'PRESENT';
    });
    setAttendanceStatus(next);
  };

  const handleStudentScanned = (studentId: string, status: AttendanceStatus) => {
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
    if (!scannedStudents.includes(studentId)) {
      setScannedStudents((prev) => [...prev, studentId]);
    }
  };

  const titulaireLabel = selectedCourseData?.teacher?.user
    ? `${selectedCourseData.teacher.user.firstName || ''} ${selectedCourseData.teacher.user.lastName || ''}`.trim()
    : '';

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
        <div className="text-center py-12 space-y-4">
          <FiUserCheck className="w-16 h-16 mx-auto text-gray-400" />
          <p className="text-gray-600">
            {isEducator
              ? 'Aucun cours sur vos classes assignées'
              : courseScope === 'substitute'
                ? 'Aucun autre cours disponible pour un remplacement'
                : 'Aucun cours assigné'}
          </p>
          {!isEducator && (
            <div className="flex justify-center gap-2">
              <Button
                variant={courseScope === 'mine' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCourseScope('mine')}
                className={courseScope === 'mine' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Mes cours
              </Button>
              <Button
                variant={courseScope === 'substitute' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCourseScope('substitute')}
                className={courseScope === 'substitute' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Remplacement
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  const presentCount = Object.values(attendanceStatus).filter((s) => s === 'PRESENT').length;
  const absentCount = Object.values(attendanceStatus).filter((s) => s === 'ABSENT').length;
  const lateCount = Object.values(attendanceStatus).filter((s) => s === 'LATE').length;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isEducator ? 'Appel numérique (vie scolaire)' : 'Appel numérique'}
            </h2>
            <p className="text-gray-600">
              {isEducator
                ? 'Faites l’appel à la place d’un enseignant absent sur vos classes assignées.'
                : 'Marquez la présence de chaque élève, y compris en remplacement d’un collègue absent.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isEducator && (
              <div className="flex gap-1 mr-1">
                <Button
                  variant={courseScope === 'mine' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setCourseScope('mine')}
                  className={courseScope === 'mine' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  Mes cours
                </Button>
                <Button
                  variant={courseScope === 'substitute' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setCourseScope('substitute')}
                  className={courseScope === 'substitute' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                >
                  Remplacement
                </Button>
              </div>
            )}
            <select
              aria-label="Choisir un cours"
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {(courses as RollcallCourse[]).map((course) => {
                const owner = course.teacher?.user
                  ? ` (${course.teacher.user.firstName || ''} ${course.teacher.user.lastName || ''})`.trimEnd()
                  : '';
                return (
                  <option key={course.id} value={course.id}>
                    {course.name} - {course.class.name}
                    {courseScope === 'substitute' || isEducator ? owner : ''}
                  </option>
                );
              })}
            </select>
            <input
              type="date"
              aria-label="Date de l'appel"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>
        {isSubstituteCall && selectedCourseData && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Appel de remplacement
            {titulaireLabel ? (
              <>
                {' '}
                — titulaire : <strong>{titulaireLabel}</strong>
              </>
            ) : null}
            . L’enregistrement reste associé au cours du titulaire.
          </div>
        )}
      </Card>

      {selectedCourse && (
        <>
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

          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Liste d&apos;appel — {selectedCourseData?.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Cliquez sur un élève pour changer son statut :{' '}
                    <strong>Présent</strong> → <strong>Absent</strong> → <strong>En retard</strong> →
                    Présent.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={markAllPresent}>
                    Tout marquer présent
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleResetAttendance}
                    disabled={initAttendanceMutation.isPending}
                  >
                    {initAttendanceMutation.isPending ? 'Réinitialisation...' : "Réinitialiser l'appel"}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleTakeAttendance}
                    disabled={takeAttendanceMutation.isPending || students.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {takeAttendanceMutation.isPending ? 'Enregistrement...' : "Enregistrer l'appel"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <FiFilter className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filtrer par statut :</span>
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
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiCalendar className="w-4 h-4" />
                  {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}
                  <span>·</span>
                  {filteredStudents.length} élève(s)
                </div>
              </div>

              {absencesLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  <p className="mt-4 text-gray-600">Chargement de l&apos;appel...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12">
                  <FiUserCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Aucun élève actif dans cette classe</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <FiUserCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Aucun élève ne correspond au filtre</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredStudents.map((student) => {
                    const status = attendanceStatus[student.id] || 'ABSENT';
                    return (
                      <button
                        type="button"
                        key={student.id}
                        onClick={() => toggleStudentStatus(student.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${
                          status === 'PRESENT'
                            ? 'bg-green-50 border-green-200 hover:bg-green-100'
                            : status === 'ABSENT'
                              ? 'bg-red-50 border-red-200 hover:bg-red-100'
                              : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              status === 'PRESENT'
                                ? 'bg-green-500'
                                : status === 'ABSENT'
                                  ? 'bg-red-500'
                                  : 'bg-orange-500'
                            }`}
                          >
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
                              {status === 'PRESENT'
                                ? 'Présent'
                                : status === 'ABSENT'
                                  ? 'Absent'
                                  : 'En retard'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            status === 'PRESENT'
                              ? 'success'
                              : status === 'ABSENT'
                                ? 'danger'
                                : 'warning'
                          }
                          size="sm"
                        >
                          {status === 'PRESENT'
                            ? 'Présent'
                            : status === 'ABSENT'
                              ? 'Absent'
                              : 'En retard'}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}

              {students.length > 0 && (
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleTakeAttendance}
                    disabled={takeAttendanceMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {takeAttendanceMutation.isPending ? 'Enregistrement...' : "Enregistrer l'appel"}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {!isEducator && (
            <Card>
              <button
                type="button"
                onClick={() => setShowOtherModes((open) => !open)}
                className="w-full flex items-center justify-between text-left"
                aria-expanded={showOtherModes}
              >
                <div className="flex items-center gap-2">
                  <FiWifi className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Autres modes de pointage</h3>
                    <p className="text-sm text-gray-600">
                      Carte scolaire NFC, lecteur externe ou empreinte digitale
                    </p>
                  </div>
                </div>
                {showOtherModes ? (
                  <FiChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <FiChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {showOtherModes && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={!useExternalDevice ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setUseExternalDevice(false)}
                      className={!useExternalDevice ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      Scanner navigateur
                    </Button>
                    <Button
                      variant={useExternalDevice ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setUseExternalDevice(true)}
                      className={useExternalDevice ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      Appareil NFC externe
                    </Button>
                  </div>

                  {useExternalDevice ? (
                    <ExternalNFCReceiver
                      courseId={selectedCourse}
                      selectedDate={selectedDate}
                      onScanReceived={() => {
                        queryClient.invalidateQueries({ queryKey: absencesQueryKey });
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
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceManager;
