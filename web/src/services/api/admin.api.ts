import api from './client';
import type { AppBrandingUploadSlot } from '@/lib/appBrandingUpload';
import type { EducationSectorValue } from '@/lib/educationSector';

export const adminApi = {
  getStudents: async (
    params?:
      | {
          includeParents?: boolean;
          educationSector?: EducationSectorValue;
          enrollmentStatus?: 'ACTIVE' | 'SUSPENDED' | 'GRADUATED' | 'ARCHIVED';
        }
      | { queryKey?: unknown; signal?: unknown }
  ) => {
    const isQueryOpts =
      params &&
      typeof params === 'object' &&
      ('queryKey' in params || 'signal' in params);
    const opts = !isQueryOpts
      ? (params as
          | {
              includeParents?: boolean;
              educationSector?: EducationSectorValue;
              enrollmentStatus?: 'ACTIVE' | 'SUSPENDED' | 'GRADUATED' | 'ARCHIVED';
            }
          | undefined)
      : undefined;
    const includeParents = Boolean(opts?.includeParents);
    const educationSector = opts?.educationSector;
    const enrollmentStatus = opts?.enrollmentStatus;
    const response = await api.get('/admin/students', {
      params: {
        ...(includeParents ? { includeParents: '1' } : {}),
        ...(educationSector ? { educationSector } : {}),
        ...(enrollmentStatus ? { enrollmentStatus } : {}),
      },
    });
    return response.data;
  },
  createStudent: async (data: any) => {
    const response = await api.post('/admin/students', data);
    return response.data;
  },
  downloadStudentImportCsvTemplate: async () => {
    const response = await api.get('/admin/students/import/csv-template', {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
  importStudentsCsv: async (data: { csv: string; defaultPassword?: string }) => {
    const response = await api.post('/admin/students/import-csv', data);
    return response.data as {
      total: number;
      created: number;
      failed: number;
      results: Array<{
        line: number;
        studentId: string;
        ok: boolean;
        error?: string;
        loginIdentifier?: string;
        passwordSetupEmailSent?: boolean;
      }>;
    };
  },
  getStudent: async (id: string) => {
    const response = await api.get(`/admin/students/${id}`);
    return response.data;
  },
  getStudentEnrollmentDossier: async (id: string) => {
    const response = await api.get(`/admin/students/${id}/enrollment-dossier`);
    return response.data;
  },
  getStudentByNFC: async (nfcId: string) => {
    const response = await api.get(`/admin/students/nfc/${nfcId}`);
    return response.data;
  },
  getTeacherByNFC: async (nfcId: string) => {
    const response = await api.get(`/admin/teachers/nfc/${nfcId}`);
    return response.data;
  },
  recordTeacherNFCAttendance: async (data: {
    teacherId: string;
    date: string;
    status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  }) => {
    const response = await api.post('/admin/teachers/nfc-attendance', data);
    return response.data;
  },
  getTeacherAttendance: async (params?: { teacherId?: string; from?: string; to?: string }) => {
    const response = await api.get('/admin/teachers/attendance', { params });
    return response.data;
  },
  getTeacherAttendanceSummary: async (params: {
    from: string;
    to: string;
    groupBy?: 'day' | 'week' | 'month';
    teacherId?: string;
  }) => {
    const response = await api.get('/admin/teachers/attendance/summary', { params });
    return response.data;
  },
  getStaffAttendanceSummary: async (params: {
    from: string;
    to: string;
    groupBy?: 'day' | 'week' | 'month';
    staffId?: string;
  }) => {
    const response = await api.get('/admin/staff/attendance/summary', { params });
    return response.data;
  },
  getAccessControlOverview: async () => {
    const response = await api.get('/admin/access-control/overview');
    return response.data;
  },
  getAccessControlEntryLogs: async (params?: { type?: string; limit?: number }) => {
    const response = await api.get('/admin/access-control/entry-logs', { params });
    return response.data;
  },
  createAccessControlEntryLog: async (data: {
    type: string;
    description: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    userId?: string;
    metadata?: Record<string, unknown>;
  }) => {
    const response = await api.post('/admin/access-control/entry-logs', data);
    return response.data;
  },
  getAccessControlAppointments: async (params?: { from?: string; to?: string; status?: string }) => {
    const response = await api.get('/admin/access-control/appointments', { params });
    return response.data;
  },
  getAccessControlCctv: async () => {
    const response = await api.get('/admin/access-control/cctv');
    return response.data;
  },
  getAccessControlAlarm: async () => {
    const response = await api.get('/admin/access-control/alarm');
    return response.data;
  },
  updateStudent: async (id: string, data: any) => {
    const response = await api.put(`/admin/students/${id}`, data);
    return response.data;
  },
  uploadStudentAvatar: async (studentId: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post(`/admin/students/${studentId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as { url: string };
  },
  deleteStudent: async (id: string) => {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data;
  },
  getClasses: async () => {
    const response = await api.get('/admin/classes');
    return response.data;
  },
  createClass: async (data: any) => {
    const response = await api.post('/admin/classes', data);
    return response.data;
  },
  updateClass: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/classes/${id}`, data);
    return response.data;
  },
  deleteClass: async (id: string, options?: { unassignStudents?: boolean }) => {
    const response = await api.delete(`/admin/classes/${id}`, {
      params: options?.unassignStudents ? { unassignStudents: 'true' } : undefined,
    });
    return response.data;
  },
  createClassGroup: async (classId: string, data: { name: string; sortOrder?: number }) => {
    const response = await api.post(`/admin/classes/${classId}/groups`, data);
    return response.data;
  },
  updateClassGroup: async (
    groupId: string,
    data: { name?: string; sortOrder?: number }
  ) => {
    const response = await api.patch(`/admin/class-groups/${groupId}`, data);
    return response.data;
  },
  deleteClassGroup: async (groupId: string) => {
    const response = await api.delete(`/admin/class-groups/${groupId}`);
    return response.data;
  },
  getTeachers: async () => {
    const response = await api.get('/admin/teachers');
    return response.data;
  },
  createTeacher: async (data: any) => {
    const response = await api.post('/admin/teachers', data);
    return response.data;
  },
  getTeacher: async (id: string) => {
    const response = await api.get(`/admin/teachers/${id}`);
    return response.data;
  },
  updateTeacher: async (id: string, data: any) => {
    const response = await api.put(`/admin/teachers/${id}`, data);
    return response.data;
  },
  deleteTeacher: async (id: string) => {
    const response = await api.delete(`/admin/teachers/${id}`);
    return response.data;
  },
  getTeacherAdministrativeDocuments: async (teacherId: string) => {
    const response = await api.get(`/admin/teachers/${teacherId}/administrative-documents`);
    return response.data;
  },
  deleteTeacherAdministrativeDocument: async (teacherId: string, documentId: string) => {
    const response = await api.delete(
      `/admin/teachers/${teacherId}/administrative-documents/${documentId}`
    );
    return response.data;
  },
  addTeacherQualification: async (
    teacherId: string,
    data: {
      title: string;
      institution?: string;
      field?: string;
      obtainedAt?: string | null;
      notes?: string;
    }
  ) => {
    const response = await api.post(`/admin/teachers/${teacherId}/qualifications`, data);
    return response.data;
  },
  deleteTeacherQualification: async (teacherId: string, qualificationId: string) => {
    const response = await api.delete(`/admin/teachers/${teacherId}/qualifications/${qualificationId}`);
    return response.data;
  },
  addTeacherCareerHistory: async (
    teacherId: string,
    data: {
      institution: string;
      role: string;
      startDate: string;
      endDate?: string | null;
      country?: string;
      notes?: string;
    }
  ) => {
    const response = await api.post(`/admin/teachers/${teacherId}/career-history`, data);
    return response.data;
  },
  deleteTeacherCareerHistoryEntry: async (teacherId: string, entryId: string) => {
    const response = await api.delete(`/admin/teachers/${teacherId}/career-history/${entryId}`);
    return response.data;
  },
  getProfessionalTrainings: async () => {
    const response = await api.get('/admin/professional-trainings');
    return response.data;
  },
  addTeacherProfessionalTraining: async (
    teacherId: string,
    data: {
      title: string;
      organization?: string;
      hours?: number | null;
      completedAt?: string | null;
      notes?: string;
    }
  ) => {
    const response = await api.post(`/admin/teachers/${teacherId}/professional-trainings`, data);
    return response.data;
  },
  deleteTeacherProfessionalTraining: async (teacherId: string, trainingId: string) => {
    const response = await api.delete(
      `/admin/teachers/${teacherId}/professional-trainings/${trainingId}`
    );
    return response.data;
  },
  createTeacherPerformanceReview: async (
    teacherId: string,
    data: {
      periodLabel: string;
      academicYear: string;
      overallScore?: number | null;
      objectives?: string | null;
      achievements?: string | null;
      improvements?: string | null;
      reviewerName?: string | null;
    }
  ) => {
    const response = await api.post(`/admin/teachers/${teacherId}/performance-reviews`, data);
    return response.data;
  },
  updateTeacherLeaveStatus: async (
    teacherId: string,
    leaveId: string,
    data: { status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; adminComment?: string | null }
  ) => {
    const response = await api.patch(`/admin/teachers/${teacherId}/leaves/${leaveId}`, data);
    return response.data;
  },
  getTeacherPerformanceReviews: async (teacherId: string) => {
    const response = await api.get(`/admin/teachers/${teacherId}/performance-reviews`);
    return response.data;
  },
  getTeacherLeaves: async (teacherId: string) => {
    const response = await api.get(`/admin/teachers/${teacherId}/leaves`);
    return response.data;
  },
  /** Vue RH : tous les congés enseignants */
  getHrTeacherLeaves: async (params?: { status?: string }) => {
    const response = await api.get('/admin/hr/teacher-leaves', { params });
    return response.data;
  },
  getHrEducatorLeaves: async (params?: { status?: string }) => {
    const response = await api.get('/admin/hr/educator-leaves', { params });
    return response.data;
  },
  getHrStaffLeaves: async (params?: { status?: string }) => {
    const response = await api.get('/admin/hr/staff-leaves', { params });
    return response.data;
  },
  updateEducatorLeaveStatus: async (
    educatorId: string,
    leaveId: string,
    data: { status: 'APPROVED' | 'REJECTED'; adminComment?: string | null }
  ) => {
    const response = await api.put(`/admin/educators/${educatorId}/leaves/${leaveId}`, data);
    return response.data;
  },
  updateStaffLeaveStatus: async (
    staffId: string,
    leaveId: string,
    data: { status: 'APPROVED' | 'REJECTED'; adminComment?: string | null }
  ) => {
    const response = await api.put(`/admin/staff/${staffId}/leaves/${leaveId}`, data);
    return response.data;
  },
  /** Vue RH : toutes les fiches d’évaluation */
  getHrTeacherPerformanceReviews: async () => {
    const response = await api.get('/admin/hr/teacher-performance-reviews');
    return response.data;
  },
  /** Paie mensuelle — aperçu sans enregistrement */
  getPayrollPreview: async (params: { year: number; month: number }) => {
    const response = await api.get('/admin/hr/payroll/preview', { params });
    return response.data;
  },
  getPayrollRuns: async (params?: { year?: number }) => {
    const response = await api.get('/admin/hr/payroll/runs', { params });
    return response.data;
  },
  getPayrollRun: async (id: string) => {
    const response = await api.get(`/admin/hr/payroll/runs/${id}`);
    return response.data;
  },
  createPayrollRun: async (data: {
    year: number;
    month: number;
    notes?: string;
    force?: boolean;
  }) => {
    const response = await api.post('/admin/hr/payroll/runs', data);
    return response.data;
  },
  updatePayrollLine: async (
    runId: string,
    lineId: string,
    data: {
      baseSalary?: number;
      bonuses?: number;
      deductions?: number;
      included?: boolean;
      notes?: string | null;
    }
  ) => {
    const response = await api.patch(`/admin/hr/payroll/runs/${runId}/lines/${lineId}`, data);
    return response.data;
  },
  validatePayrollRun: async (id: string) => {
    const response = await api.post(`/admin/hr/payroll/runs/${id}/validate`);
    return response.data;
  },
  markPayrollRunPaid: async (
    id: string,
    data?: { createExpense?: boolean; paymentMethod?: string; academicYear?: string }
  ) => {
    const response = await api.post(`/admin/hr/payroll/runs/${id}/mark-paid`, data ?? {});
    return response.data;
  },
  cancelPayrollRun: async (id: string) => {
    const response = await api.post(`/admin/hr/payroll/runs/${id}/cancel`);
    return response.data;
  },
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
  getDashboardKpis: async () => {
    const response = await api.get('/admin/dashboard/kpis');
    return response.data;
  },
  getSystemMetrics: async () => {
    const response = await api.get('/admin/system/metrics');
    return response.data;
  },
  getAllGrades: async (params?: { studentId?: string; courseId?: string; classId?: string }) => {
    const response = await api.get('/admin/grades', { params });
    return response.data;
  },
  getAllAbsences: async (params?: { studentId?: string; courseId?: string; classId?: string; date?: string }) => {
    const response = await api.get('/admin/absences', { params });
    return response.data;
  },
  getAbsencePermissionRequests: async (params?: { status?: string; studentId?: string }) => {
    const response = await api.get('/admin/absence-permission-requests', { params });
    return response.data;
  },
  getAbsencePermissionRequestStats: async (params?: { studentId?: string }) => {
    const response = await api.get('/admin/absence-permission-requests/stats', { params });
    return response.data as {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
  },
  updateAbsencePermissionRequest: async (
    id: string,
    data: { status: 'APPROVED' | 'REJECTED'; adminComment?: string }
  ) => {
    const response = await api.patch(`/admin/absence-permission-requests/${id}`, data);
    return response.data;
  },
  deleteAbsencePermissionRequest: async (id: string) => {
    const response = await api.delete(`/admin/absence-permission-requests/${id}`);
    return response.data;
  },
  getReenrollmentRequests: async (params?: { status?: string; studentId?: string }) => {
    const response = await api.get('/admin/reenrollment-requests', { params });
    return response.data;
  },
  getReenrollmentRequestStats: async (params?: { studentId?: string }) => {
    const response = await api.get('/admin/reenrollment-requests/stats', { params });
    return response.data as {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
  },
  updateReenrollmentRequest: async (
    id: string,
    data: {
      status: 'APPROVED' | 'REJECTED';
      approvedClassId?: string;
      adminComment?: string;
      effectiveDate?: string;
      allowPromotionOverride?: boolean;
    }
  ) => {
    const response = await api.patch(`/admin/reenrollment-requests/${id}`, data);
    return response.data;
  },
  previewClassYearRollover: async (params?: {
    fromAcademicYear?: string;
    toAcademicYear?: string;
  }) => {
    const response = await api.get('/admin/classes/rollover/preview', { params });
    return response.data;
  },
  applyClassYearRollover: async (data: {
    fromAcademicYear?: string;
    toAcademicYear?: string;
    copyTeacherAssignments?: boolean;
  }) => {
    const response = await api.post('/admin/classes/rollover', data);
    return response.data;
  },
  getAllAssignments: async (params?: { courseId?: string; classId?: string }) => {
    const response = await api.get('/admin/assignments', { params });
    return response.data;
  },
  getAllCourses: async (params?: { classId?: string }) => {
    const response = await api.get('/admin/courses', { params });
    return response.data;
  },
  getCourseById: async (courseId: string) => {
    const response = await api.get(`/admin/courses/${courseId}`);
    return response.data;
  },
  createCourse: async (data: {
    name: string;
    code: string;
    classId: string;
    teacherId: string;
    description?: string | null;
    weeklyHours?: number | null;
    gradingCoefficient?: number;
  }) => {
    const response = await api.post('/admin/courses', data);
    return response.data;
  },
  updateCourse: async (
    courseId: string,
    data: Partial<{
      name: string;
      code: string;
      classId: string;
      teacherId: string;
      description: string | null;
      weeklyHours: number | null;
      gradingCoefficient: number | null;
    }>
  ) => {
    const response = await api.put(`/admin/courses/${courseId}`, data);
    return response.data;
  },
  deleteCourse: async (courseId: string) => {
    const response = await api.delete(`/admin/courses/${courseId}`);
    return response.data;
  },
  getSchoolTracks: async (params?: { academicYear?: string }) => {
    const response = await api.get('/admin/school-tracks', { params });
    return response.data;
  },
  createSchoolTrack: async (data: {
    name: string;
    code: string;
    description?: string | null;
    academicYear?: string | null;
    levels?: string[];
    sortOrder?: number;
    educationSector?: EducationSectorValue;
  }) => {
    const response = await api.post('/admin/school-tracks', data);
    return response.data;
  },
  updateSchoolTrack: async (
    id: string,
    data: Partial<{
      name: string;
      code: string;
      description: string | null;
      academicYear: string | null;
      levels: string[];
      sortOrder: number;
      educationSector: EducationSectorValue;
    }>
  ) => {
    const response = await api.patch(`/admin/school-tracks/${id}`, data);
    return response.data;
  },
  deleteSchoolTrack: async (id: string) => {
    const response = await api.delete(`/admin/school-tracks/${id}`);
    return response.data;
  },
  getSubjectOptions: async () => {
    const response = await api.get('/admin/subject-options');
    return response.data;
  },
  createSubjectOption: async (data: {
    name: string;
    code: string;
    description?: string | null;
    weeklyHours?: number | null;
    gradingCoefficient?: number | null;
  }) => {
    const response = await api.post('/admin/subject-options', data);
    return response.data;
  },
  updateSubjectOption: async (
    id: string,
    data: Partial<{
      name: string;
      code: string;
      description: string | null;
      weeklyHours: number | null;
      gradingCoefficient: number | null;
    }>
  ) => {
    const response = await api.patch(`/admin/subject-options/${id}`, data);
    return response.data;
  },
  deleteSubjectOption: async (id: string) => {
    const response = await api.delete(`/admin/subject-options/${id}`);
    return response.data;
  },
  getTrackAvailableOptions: async (trackId: string) => {
    const response = await api.get(`/admin/school-tracks/${trackId}/available-options`);
    return response.data;
  },
  addTrackAvailableOption: async (
    trackId: string,
    data: { optionId: string; sortOrder?: number; notes?: string | null }
  ) => {
    const response = await api.post(`/admin/school-tracks/${trackId}/available-options`, data);
    return response.data;
  },
  removeTrackAvailableOption: async (trackId: string, linkId: string) => {
    const response = await api.delete(
      `/admin/school-tracks/${trackId}/available-options/${linkId}`
    );
    return response.data;
  },
  getSchoolCurricula: async (params?: {
    level?: string;
    academicYear?: string;
    /** Absent = tous les programmes du couple niveau/année ; `null` = tronc commun uniquement */
    trackId?: string | null;
  }) => {
    const q: Record<string, string> = {};
    if (params?.level) q.level = params.level;
    if (params?.academicYear) q.academicYear = params.academicYear;
    if (params?.trackId === null) q.trackId = 'null';
    else if (params?.trackId) q.trackId = params.trackId;
    const response = await api.get('/admin/school-curricula', { params: q });
    return response.data;
  },
  getSchoolCurriculumById: async (id: string) => {
    const response = await api.get(`/admin/school-curricula/${id}`);
    return response.data;
  },
  createSchoolCurriculum: async (data: {
    level: string;
    academicYear: string;
    trackId?: string | null;
    label?: string | null;
    notes?: string | null;
  }) => {
    const response = await api.post('/admin/school-curricula', data);
    return response.data;
  },
  updateSchoolCurriculum: async (
    id: string,
    data: { label?: string | null; notes?: string | null; trackId?: string | null }
  ) => {
    const response = await api.patch(`/admin/school-curricula/${id}`, data);
    return response.data;
  },
  deleteSchoolCurriculum: async (id: string) => {
    const response = await api.delete(`/admin/school-curricula/${id}`);
    return response.data;
  },
  createSchoolCurriculumSubject: async (
    curriculumId: string,
    data: {
      name: string;
      code: string;
      weeklyHours?: number | null;
      gradingCoefficient?: number | null;
      sortOrder?: number;
      description?: string | null;
    }
  ) => {
    const response = await api.post(`/admin/school-curricula/${curriculumId}/subjects`, data);
    return response.data;
  },
  updateSchoolCurriculumSubject: async (
    subjectId: string,
    data: Partial<{
      name: string;
      code: string;
      weeklyHours: number | null;
      gradingCoefficient: number | null;
      sortOrder: number;
      description: string | null;
    }>
  ) => {
    const response = await api.patch(`/admin/school-curriculum-subjects/${subjectId}`, data);
    return response.data;
  },
  deleteSchoolCurriculumSubject: async (subjectId: string) => {
    const response = await api.delete(`/admin/school-curriculum-subjects/${subjectId}`);
    return response.data;
  },
  getSchoolCalendarEvents: async (params?: { academicYear?: string }) => {
    const response = await api.get('/admin/school-calendar-events', { params });
    return response.data;
  },
  createSchoolCalendarEvent: async (data: {
    title: string;
    description?: string | null;
    type?: 'HOLIDAY' | 'VACATION' | 'EXAM_PERIOD' | 'MEETING' | 'OTHER';
    startDate: string;
    endDate: string;
    academicYear: string;
    allDay?: boolean;
  }) => {
    const response = await api.post('/admin/school-calendar-events', data);
    return response.data;
  },
  updateSchoolCalendarEvent: async (
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      type: 'HOLIDAY' | 'VACATION' | 'EXAM_PERIOD' | 'MEETING' | 'OTHER';
      startDate: string;
      endDate: string;
      academicYear: string;
      allDay: boolean;
    }>
  ) => {
    const response = await api.put(`/admin/school-calendar-events/${id}`, data);
    return response.data;
  },
  deleteSchoolCalendarEvent: async (id: string) => {
    const response = await api.delete(`/admin/school-calendar-events/${id}`);
    return response.data;
  },
  takeAttendance: async (data: {
    courseId: string;
    date: string;
    attendance: Array<{
      studentId: string;
      status: string;
      excused?: boolean;
      reason?: string;
      minutesLate?: number;
      justificationDocuments?: string[];
      hasMedicalCertificate?: boolean;
      sanctionNote?: string;
      attendanceSource?: string;
    }>;
    notifyParentsOnSave?: boolean;
    attendanceSource?: string;
  }) => {
    const response = await api.post('/admin/absences/take-attendance', data);
    return response.data;
  },
  getCourseAbsences: async (courseId: string, date?: string) => {
    const response = await api.get('/admin/absences', { params: { courseId, date } });
    return response.data;
  },
  initAttendance: async (data: { courseId: string; date: string }) => {
    const response = await api.post('/admin/absences/init-attendance', data);
    return response.data;
  },
  recordNFCAttendance: async (data: {
    courseId: string;
    studentId: string;
    date: string;
    status?: 'PRESENT' | 'ABSENT' | 'LATE';
    minutesLate?: number;
      attendanceSource?: 'NFC' | 'BIOMETRIC' | 'FACE' | 'MANUAL';
    notifyParentsOnSave?: boolean;
  }) => {
    const response = await api.post('/admin/absences/nfc-attendance', data);
    return response.data;
  },
  // Grades Management
  getGrade: async (id: string) => {
    const response = await api.get(`/admin/grades/${id}`);
    return response.data;
  },
  createGrade: async (data: any) => {
    const response = await api.post('/admin/grades', data);
    return response.data;
  },
  updateGrade: async (id: string, data: any) => {
    const response = await api.put(`/admin/grades/${id}`, data);
    return response.data;
  },
  deleteGrade: async (id: string) => {
    const response = await api.delete(`/admin/grades/${id}`);
    return response.data;
  },
  // Absences Management
  getAbsence: async (id: string) => {
    const response = await api.get(`/admin/absences/${id}`);
    return response.data;
  },
  createAbsence: async (data: any) => {
    const response = await api.post('/admin/absences', data);
    return response.data;
  },
  updateAbsence: async (id: string, data: any) => {
    const response = await api.put(`/admin/absences/${id}`, data);
    return response.data;
  },
  deleteAbsence: async (id: string) => {
    const response = await api.delete(`/admin/absences/${id}`);
    return response.data;
  },
  getAbsenceStats: async (params?: { classId?: string; from?: string; to?: string }) => {
    const response = await api.get('/admin/absences/stats', { params });
    return response.data as import('@/lib/attendanceStats').AttendanceStats;
  },
  notifyAbsenceParents: async (absenceId: string) => {
    const response = await api.post(`/admin/absences/${absenceId}/notify-parents`);
    return response.data;
  },
  // Assignments Management
  getAssignment: async (id: string) => {
    const response = await api.get(`/admin/assignments/${id}`);
    return response.data;
  },
  createAssignment: async (data: any) => {
    const response = await api.post('/admin/assignments', data);
    return response.data;
  },
  updateAssignment: async (id: string, data: any) => {
    const response = await api.put(`/admin/assignments/${id}`, data);
    return response.data;
  },
  deleteAssignment: async (id: string) => {
    const response = await api.delete(`/admin/assignments/${id}`);
    return response.data;
  },
  getAllUsers: async (params?: { role?: string; isActive?: boolean }) => {
    const response = await api.get('/admin/users', { params });
    const data = response.data as unknown;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as { users?: unknown[] }).users)) {
      return (data as { users: unknown[] }).users;
    }
    return [];
  },
  updateUserRole: async (userId: string, role: string) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
  getRoleStats: async () => {
    const response = await api.get('/admin/roles/stats');
    return response.data;
  },
  getUser: async (id: string) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  updateUser: async (id: string, data: any) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
  getLibraryBooks: async (params?: { search?: string; category?: string; isActive?: string }) => {
    const response = await api.get('/admin/library/books', { params });
    return response.data;
  },
  createLibraryBook: async (data: {
    isbn?: string | null;
    title: string;
    author: string;
    publisher?: string | null;
    publicationYear?: number | null;
    category?: string | null;
    description?: string | null;
    copiesTotal?: number;
    copiesAvailable?: number;
    shelfLocation?: string | null;
  }) => {
    const response = await api.post('/admin/library/books', data);
    return response.data;
  },
  updateLibraryBook: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/library/books/${id}`, data);
    return response.data;
  },
  deleteLibraryBook: async (id: string) => {
    const response = await api.delete(`/admin/library/books/${id}`);
    return response.data;
  },
  getLibraryLoans: async (params?: { status?: 'ACTIVE' | 'RETURNED' }) => {
    const response = await api.get('/admin/library/loans', { params });
    return response.data;
  },
  searchLibraryBorrowers: async (q: string) => {
    const response = await api.get('/admin/library/borrowers/search', { params: { q } });
    return response.data;
  },
  createLibraryLoan: async (data: {
    bookId: string;
    borrowerId: string;
    dueDate: string;
    notes?: string | null;
  }) => {
    const response = await api.post('/admin/library/loans', data);
    return response.data;
  },
  createLibraryLoansBatch: async (data: {
    bookIds: string[];
    borrowerId: string;
    dueDate: string;
    notes?: string | null;
  }) => {
    const response = await api.post('/admin/library/loans/batch', data);
    return response.data;
  },
  returnLibraryLoan: async (loanId: string) => {
    const response = await api.patch(`/admin/library/loans/${loanId}/return`);
    return response.data;
  },
  getLibraryReservations: async (params?: { status?: string }) => {
    const response = await api.get('/admin/library/reservations', { params });
    return response.data;
  },
  createLibraryReservation: async (data: { bookId: string; userId: string }) => {
    const response = await api.post('/admin/library/reservations', data);
    return response.data;
  },
  updateLibraryReservation: async (
    id: string,
    data: { status: 'PENDING' | 'READY' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED' }
  ) => {
    const response = await api.patch(`/admin/library/reservations/${id}`, data);
    return response.data;
  },
  getLibraryPenalties: async (params?: { paid?: string }) => {
    const response = await api.get('/admin/library/penalties', { params });
    return response.data;
  },
  createLibraryPenalty: async (data: {
    loanId?: string | null;
    userId: string;
    amount: number;
    reason: string;
    notes?: string | null;
  }) => {
    const response = await api.post('/admin/library/penalties', data);
    return response.data;
  },
  updateLibraryPenalty: async (
    id: string,
    data: { paid?: boolean; waived?: boolean; notes?: string | null }
  ) => {
    const response = await api.patch(`/admin/library/penalties/${id}`, data);
    return response.data;
  },
  getMaterialRooms: async (params?: { search?: string; isActive?: string }) => {
    const response = await api.get('/admin/material/rooms', { params });
    return response.data;
  },
  createMaterialRoom: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/material/rooms', data);
    return response.data;
  },
  updateMaterialRoom: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/material/rooms/${id}`, data);
    return response.data;
  },
  deleteMaterialRoom: async (id: string) => {
    const response = await api.delete(`/admin/material/rooms/${id}`);
    return response.data;
  },
  getMaterialRoomReservations: async (params?: {
    roomId?: string;
    from?: string;
    to?: string;
    status?: string;
  }) => {
    const response = await api.get('/admin/material/room-reservations', { params });
    return response.data;
  },
  createMaterialRoomReservation: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/material/room-reservations', data);
    return response.data;
  },
  updateMaterialRoomReservation: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/material/room-reservations/${id}`, data);
    return response.data;
  },
  deleteMaterialRoomReservation: async (id: string) => {
    const response = await api.delete(`/admin/material/room-reservations/${id}`);
    return response.data;
  },
  getMaterialRoomUnavailableSlots: async (params?: { roomKey?: string }) => {
    const response = await api.get('/admin/material/room-unavailable-slots', { params });
    return response.data;
  },
  createMaterialRoomUnavailableSlot: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/material/room-unavailable-slots', data);
    return response.data;
  },
  deleteMaterialRoomUnavailableSlot: async (id: string) => {
    const response = await api.delete(`/admin/material/room-unavailable-slots/${id}`);
    return response.data;
  },
  getMaterialRoomOccupancy: async (roomId: string, params?: { from?: string; to?: string; academicYear?: string }) => {
    const response = await api.get(`/admin/material/rooms/${roomId}/occupancy`, { params });
    return response.data;
  },
  getMaterialEquipment: async (params?: {
    search?: string;
    category?: string;
    roomId?: string;
    isActive?: string;
  }) => {
    const response = await api.get('/admin/material/equipment', { params });
    return response.data;
  },
  createMaterialEquipment: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/material/equipment', data);
    return response.data;
  },
  updateMaterialEquipment: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/material/equipment/${id}`, data);
    return response.data;
  },
  deleteMaterialEquipment: async (id: string) => {
    const response = await api.delete(`/admin/material/equipment/${id}`);
    return response.data;
  },
  getMaterialMaintenance: async (params?: { status?: string; equipmentId?: string; roomId?: string }) => {
    const response = await api.get('/admin/material/maintenance', { params });
    return response.data;
  },
  createMaterialMaintenance: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/material/maintenance', data);
    return response.data;
  },
  updateMaterialMaintenance: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/material/maintenance/${id}`, data);
    return response.data;
  },
  getMaterialAllocations: async (params?: { status?: string; equipmentId?: string }) => {
    const response = await api.get('/admin/material/allocations', { params });
    return response.data;
  },
  createMaterialAllocation: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/material/allocations', data);
    return response.data;
  },
  updateMaterialAllocation: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/material/allocations/${id}`, data);
    return response.data;
  },
  getMaterialStockItems: async (params?: {
    search?: string;
    type?: string;
    lowStockOnly?: string;
    isActive?: string;
  }) => {
    const response = await api.get('/admin/material/stock-items', { params });
    return response.data;
  },
  createMaterialStockItem: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/material/stock-items', data);
    return response.data;
  },
  updateMaterialStockItem: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/material/stock-items/${id}`, data);
    return response.data;
  },
  getMaterialStockMovements: async (itemId: string) => {
    const response = await api.get(`/admin/material/stock-items/${itemId}/movements`);
    return response.data;
  },
  createMaterialStockMovement: async (itemId: string, data: Record<string, unknown>) => {
    const response = await api.post(`/admin/material/stock-items/${itemId}/movements`, data);
    return response.data;
  },
  getMaterialStockOrders: async (params?: { status?: string }) => {
    const response = await api.get('/admin/material/stock-orders', { params });
    return response.data;
  },
  createMaterialStockOrder: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/material/stock-orders', data);
    return response.data;
  },
  updateMaterialStockOrder: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/material/stock-orders/${id}`, data);
    return response.data;
  },
  getMaterialStockPeriodicInventories: async (params?: { from?: string; to?: string; type?: string }) => {
    const response = await api.get('/admin/material/stock-periodic-inventories', { params });
    return response.data;
  },
  getReportsSummary: async () => {
    const response = await api.get('/admin/reports/summary');
    return response.data;
  },
  getAcademicReports: async (params?: { academicYear?: string; classId?: string; period?: string }) => {
    const response = await api.get('/admin/reports/academic', { params });
    return response.data;
  },
  getAdministrativeReports: async (params?: { academicYear?: string; from?: string; to?: string }) => {
    const response = await api.get('/admin/reports/administrative', { params });
    return response.data;
  },
  getMenaReports: async (params?: { academicYear?: string }) => {
    const response = await api.get('/admin/reports/mena', { params });
    return response.data;
  },
  getMenaStatus: async () => {
    const response = await api.get('/admin/mena/status');
    return response.data;
  },
  getMenaPresenceStatus: async () => {
    const response = await api.get('/admin/mena-presence/status');
    return response.data;
  },
  getMenaPresenceDay: async (date?: string) => {
    const response = await api.get('/admin/mena-presence/day', { params: { date } });
    return response.data;
  },
  importMenaPresenceCsv: async (data: { csv: string; date?: string }) => {
    const response = await api.post('/admin/mena-presence/import-csv', data);
    return response.data;
  },
  downloadMenaPresenceCsvTemplate: async () => {
    const response = await api.get('/admin/mena-presence/csv-template', {
      responseType: 'blob',
    });
    return response.data;
  },
  runMenaPresenceScheduledImport: async () => {
    const response = await api.post('/admin/mena-presence/run-scheduled');
    return response.data;
  },
  getMenaExportPackage: async (params?: { academicYear?: string; format?: 'json' | 'csv' }) => {
    const response = await api.get('/admin/mena/export-package', {
      params,
      ...(params?.format === 'csv' ? { responseType: 'blob' as const } : {}),
    });
    return response.data;
  },
  transmitMenaPackage: async (data?: { academicYear?: string; forceExportOnly?: boolean }) => {
    const response = await api.post('/admin/mena/transmit', data ?? {});
    return response.data;
  },
  getMenaTransmissions: async (params?: { limit?: number }) => {
    const response = await api.get('/admin/mena/transmissions', { params });
    return response.data;
  },
  getMenaTransmission: async (id: string) => {
    const response = await api.get(`/admin/mena/transmissions/${id}`);
    return response.data;
  },
  getFneOptions: async (params?: { cycle?: 'secondary' | 'primary'; q?: string }) => {
    const response = await api.get('/admin/mena/fne-options', { params });
    return response.data;
  },
  lookupFneMatricule: async (data: {
    cycle?: 'secondary' | 'primary';
    annee: string;
    nom: string;
    prenoms?: string;
    datenaiss?: string;
    etablissement?: string;
  }) => {
    const response = await api.post('/admin/mena/fne-lookup', data);
    return response.data;
  },
  getStudentStatsReports: async (params?: { academicYear?: string; period?: string }) => {
    const response = await api.get('/admin/reports/student-stats', { params });
    return response.data;
  },
  getFinancialReports: async (params?: { academicYear?: string; from?: string; to?: string }) => {
    const response = await api.get('/admin/reports/financial', { params });
    return response.data;
  },
  getFinancialBreakdown: async (params?: { academicYear?: string; from?: string; to?: string }) => {
    const response = await api.get('/admin/reports/financial/breakdown', { params });
    return response.data;
  },
  toggleUserStatus: async (id: string, isActive: boolean) => {
    const response = await api.put(`/admin/security/users/${id}/status`, { isActive });
    return response.data;
  },
  getClassStats: async (classId: string) => {
    const response = await api.get('/admin/pedagogical/class-stats', { params: { classId } });
    return response.data;
  },
  getStudentProgress: async (studentId: string, period?: string) => {
    const response = await api.get(`/admin/pedagogical/student-progress/${studentId}`, {
      params: { period },
    });
    return response.data;
  },
  getCourseStats: async (params?: { courseId?: string; classId?: string }) => {
    const response = await api.get('/admin/pedagogical/course-stats', { params });
    return response.data;
  },
  getStudentsAtRisk: async (classId?: string) => {
    const response = await api.get('/admin/pedagogical/students-at-risk', {
      params: classId ? { classId } : {},
    });
    return response.data;
  },
  getMessages: async (params?: { userId?: string; unread?: boolean }) => {
    const response = await api.get('/admin/messages', { params });
    return response.data;
  },
  sendMessage: async (data: {
    receiverId?: string;
    subject?: string;
    content: string;
    category?: string;
    channels?: string[];
    threadKey?: string;
    attachmentUrls?: string[];
    broadcastClassId?: string;
    broadcastLevel?: string;
    academicYear?: string;
  }) => {
    const response = await api.post('/admin/messages', data);
    return response.data;
  },
  markMessageAsRead: async (messageId: string) => {
    const response = await api.put(`/admin/messages/${messageId}/read`);
    return response.data;
  },
  getAnnouncements: async (params?: { published?: boolean; targetRole?: string; targetClass?: string }) => {
    const response = await api.get('/admin/announcements', { params });
    return response.data;
  },
  createAnnouncement: async (data: any) => {
    const response = await api.post('/admin/announcements', data);
    return response.data;
  },
  publishAnnouncement: async (announcementId: string) => {
    const response = await api.put(`/admin/announcements/${announcementId}/publish`);
    return response.data;
  },
  getNotifications: async (params?: { userId?: string; unread?: boolean }) => {
    const response = await api.get('/admin/notifications', { params });
    return response.data;
  },
  markNotificationAsRead: async (notificationId: string) => {
    const response = await api.put(`/admin/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllNotificationsAsRead: async (userId?: string) => {
    const params = userId ? { userId } : {};
    const response = await api.put('/admin/notifications/read-all', {}, { params });
    return response.data;
  },
  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/admin/notifications/${notificationId}`);
    return response.data;
  },
  getNotificationsChannelStatus: async () => {
    const response = await api.get('/admin/notifications/channel-status');
    return response.data as {
      pushWeb: boolean;
      emailSmtp: boolean;
      smsTwilio: boolean;
      attendanceParentNotify: boolean;
      announcementUrgentSms: boolean;
      tuitionSmsOverdue: boolean;
    };
  },
  testNotificationsChannels: async () => {
    const response = await api.post('/admin/notifications/test', {});
    return response.data as { ok: boolean };
  },
  deleteMessage: async (messageId: string) => {
    const response = await api.delete(`/admin/messages/${messageId}`);
    return response.data;
  },
  updateAnnouncement: async (announcementId: string, data: any) => {
    const response = await api.put(`/admin/announcements/${announcementId}`, data);
    return response.data;
  },
  deleteAnnouncement: async (announcementId: string) => {
    const response = await api.delete(`/admin/announcements/${announcementId}`);
    return response.data;
  },
  getMessage: async (messageId: string) => {
    const response = await api.get(`/admin/messages/${messageId}`);
    return response.data;
  },
  getAnnouncement: async (announcementId: string) => {
    const response = await api.get(`/admin/announcements/${announcementId}`);
    return response.data;
  },
  getSchoolGalleryItems: async () => {
    const response = await api.get('/admin/school-gallery-items');
    return response.data;
  },
  createSchoolGalleryItem: async (data: {
    title?: string | null;
    caption?: string | null;
    imageUrl: string;
    sortOrder?: number;
    published?: boolean;
  }) => {
    const response = await api.post('/admin/school-gallery-items', data);
    return response.data;
  },
  updateSchoolGalleryItem: async (
    id: string,
    data: Partial<{
      title: string | null;
      caption: string | null;
      imageUrl: string;
      sortOrder: number;
      published: boolean;
    }>
  ) => {
    const response = await api.put(`/admin/school-gallery-items/${id}`, data);
    return response.data;
  },
  deleteSchoolGalleryItem: async (id: string) => {
    const response = await api.delete(`/admin/school-gallery-items/${id}`);
    return response.data;
  },
  getSchedules: async (params?: {
    classId?: string;
    courseId?: string;
    teacherId?: string;
    room?: string;
  }) => {
    const response = await api.get('/admin/schedules', { params });
    return response.data;
  },
  getSchedule: async (id: string) => {
    const response = await api.get(`/admin/schedules/${id}`);
    return response.data;
  },
  createSchedule: async (data: any) => {
    const response = await api.post('/admin/schedules', data);
    return response.data;
  },
  getClassScheduleVolumeSummary: async (classId: string) => {
    const response = await api.get(`/admin/classes/${classId}/schedule-volume-summary`);
    return response.data as {
      classId: string;
      courses: Array<{
        courseId: string;
        courseName: string;
        weeklyHours: number | null;
        targetMinutes: number;
        scheduledMinutes: number;
        missingMinutes: number;
        excessMinutes: number;
        targetSlots: number;
        scheduledSlots: number;
        missingSlots: number;
        excessSlots: number;
      }>;
    };
  },
  autoGenerateSchedules: async (data: {
    classId: string;
    clearExisting?: boolean;
    days?: number[];
    slotDurationMinutes?: number;
    slotStepMinutes?: number;
    morningStart?: string;
    morningEnd?: string;
    afternoonStart?: string;
    afternoonEnd?: string;
  }) => {
    const response = await api.post('/admin/schedules/auto-generate', data);
    return response.data as {
      created: number;
      errors: string[];
      skippedCourses: string[];
      mode: 'replace' | 'reconcile';
    };
  },
  importSchedules: async (data: {
    csv: string;
    classId?: string;
    clearExisting?: boolean;
    skipConstraintErrors?: boolean;
  }) => {
    const response = await api.post('/admin/schedules/import', data);
    return response.data as {
      created: number;
      skipped: number;
      errors: Array<{ line: number; message: string }>;
    };
  },
  updateSchedule: async (id: string, data: any) => {
    const response = await api.put(`/admin/schedules/${id}`, data);
    return response.data;
  },
  deleteSchedule: async (id: string) => {
    const response = await api.delete(`/admin/schedules/${id}`);
    return response.data;
  },
  getTeacherScheduleAvailability: async (teacherId: string) => {
    const response = await api.get(`/admin/teachers/${teacherId}/schedule-availability`);
    return response.data;
  },
  createTeacherScheduleAvailability: async (
    teacherId: string,
    data: { dayOfWeek: number; startTime: string; endTime: string; label?: string }
  ) => {
    const response = await api.post(`/admin/teachers/${teacherId}/schedule-availability`, data);
    return response.data;
  },
  deleteTeacherScheduleAvailability: async (teacherId: string, slotId: string) => {
    const response = await api.delete(`/admin/teachers/${teacherId}/schedule-availability/${slotId}`);
    return response.data;
  },
  getScheduleRoomBlocks: async () => {
    const response = await api.get('/admin/schedule-room-blocks');
    return response.data;
  },
  createScheduleRoomBlock: async (data: {
    room: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    reason?: string;
  }) => {
    const response = await api.post('/admin/schedule-room-blocks', data);
    return response.data;
  },
  deleteScheduleRoomBlock: async (blockId: string) => {
    const response = await api.delete(`/admin/schedule-room-blocks/${blockId}`);
    return response.data;
  },
  getLoginLogs: async (params?: { userId?: string; limit?: number }) => {
    const response = await api.get('/admin/security/login-logs', { params });
    return response.data;
  },
  getSecurityEvents: async (params?: { userId?: string; severity?: string; limit?: number }) => {
    const response = await api.get('/admin/security/events', { params });
    return response.data;
  },
  getAuditLogs: async (params?: {
    limit?: number;
    skip?: number;
    entityType?: string;
    entityId?: string;
    action?: string;
    actorUserId?: string;
  }) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data as {
      items: Array<{
        id: string;
        actorUserId: string | null;
        actorEmail: string | null;
        actorRole: string | null;
        action: string;
        entityType: string;
        entityId: string;
        summary: string;
        changes: Record<string, { before: unknown; after: unknown }> | null;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: string;
      }>;
      total: number;
      skip: number;
      take: number;
    };
  },
  getSecurityStats: async () => {
    const response = await api.get('/admin/security/stats');
    return response.data;
  },
  getRolePermissionsOverview: async () => {
    const response = await api.get('/admin/security/role-permissions');
    return response.data;
  },
  getTwoFactorUsers: async () => {
    const response = await api.get('/admin/security/2fa/users');
    return response.data;
  },
  getSlowEndpoints: async (params?: { limit?: number }) => {
    const response = await api.get('/admin/security/performance/slow-endpoints', { params });
    return response.data;
  },
  setUserTwoFactorEnabled: async (userId: string, enabled: boolean) => {
    const response = await api.patch(`/admin/security/2fa/users/${userId}`, { enabled });
    return response.data;
  },
  getDataProtectionSummary: async () => {
    const response = await api.get('/admin/security/data-protection-summary');
    return response.data;
  },
  runMongoBackupNow: async () => {
    const response = await api.post('/admin/security/backups/run');
    return response.data as { ok: boolean; filename?: string; archivePath?: string; error?: string };
  },
  listMongoBackups: async () => {
    const response = await api.get('/admin/security/backups');
    return response.data as {
      backups: Array<{ filename: string; size: number; createdAt: string }>;
    };
  },
  downloadMongoBackup: async (filename: string) => {
    const response = await api.get(`/admin/security/backups/${encodeURIComponent(filename)}/download`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
  restoreMongoBackup: async (payload: { filename?: string; confirmPhrase: string; file?: File }) => {
    const form = new FormData();
    form.append('confirmPhrase', payload.confirmPhrase);
    if (payload.filename) form.append('filename', payload.filename);
    if (payload.file) form.append('archive', payload.file);
    const response = await api.post('/admin/security/backups/restore', form);
    return response.data as { ok: boolean; message?: string; error?: string };
  },
  changeUserPassword: async (userId: string, newPassword: string) => {
    const response = await api.put(`/admin/security/users/${userId}/password`, { newPassword });
    return response.data;
  },
  sendUserPasswordInvite: async (userId: string) => {
    const response = await api.post(`/admin/security/users/${userId}/password-invite`);
    return response.data;
  },
  changeUserStatus: async (userId: string, isActive: boolean) => {
    const response = await api.put(`/admin/security/users/${userId}/status`, { isActive });
    return response.data;
  },
  // Report Cards
  generateReportCardData: async (params: { classId: string; period: string; academicYear: string }) => {
    const response = await api.get('/admin/report-cards/generate-data', { params });
    const data = response.data;
    if (Array.isArray(data)) {
      return { students: data, logoDataUrl: null as string | null };
    }
    if (data && typeof data === 'object' && Array.isArray((data as { students?: unknown }).students)) {
      const payload = data as { students: unknown[]; logoDataUrl?: string | null };
      return {
        students: payload.students,
        logoDataUrl: typeof payload.logoDataUrl === 'string' ? payload.logoDataUrl : null,
      };
    }
    return { students: [] as unknown[], logoDataUrl: null as string | null };
  },
  saveReportCards: async (data: {
    classId: string;
    period: string;
    academicYear: string;
    publish?: boolean;
  }) => {
    const response = await api.post('/admin/report-cards/save', data);
    return response.data;
  },
  getReportCards: async (params?: {
    classId?: string;
    period?: string;
    academicYear?: string;
    limit?: number;
  }) => {
    const response = await api.get('/admin/report-cards', { params });
    return response.data;
  },
  getDefaultReportCardTemplate: async () => {
    const response = await api.get('/admin/report-cards/template/default');
    return response.data;
  },
  saveDefaultReportCardTemplate: async (data: {
    name?: string;
    description?: string;
    settings?: Record<string, unknown>;
  }) => {
    const response = await api.put('/admin/report-cards/template/default', data);
    return response.data;
  },
  getGradeHistory: async (studentId: string) => {
    const response = await api.get(`/admin/grades/history/${studentId}`);
    return response.data;
  },
  getGradeRankings: async (params: { classId: string; period: string; academicYear: string }) => {
    const response = await api.get('/admin/grades/rankings', { params });
    return response.data;
  },
  getPromotionDecisions: async (params: {
    academicYear: string;
    period?: string;
    classId?: string;
    threshold?: number;
  }) => {
    const response = await api.get('/admin/grades/promotion-decisions', { params });
    return response.data;
  },
  declarePromotionDecisions: async (data: {
    academicYear: string;
    period?: string;
    classId?: string;
    threshold?: number;
    notifyParents?: boolean;
    includeSansNotesAsDoublant?: boolean;
  }) => {
    const response = await api.post('/admin/grades/promotion-decisions/declare', data);
    return response.data;
  },
  getClassCouncils: async (params?: { classId?: string; period?: string; academicYear?: string }) => {
    const response = await api.get('/admin/class-councils', { params });
    return response.data;
  },
  createClassCouncil: async (data: {
    classId: string;
    period: string;
    academicYear: string;
    title?: string;
    meetingDate: string;
    summary?: string;
    decisions?: string;
    recommendations?: string;
  }) => {
    const response = await api.post('/admin/class-councils', data);
    return response.data;
  },
  updateClassCouncil: async (
    id: string,
    data: {
      title?: string;
      meetingDate?: string;
      summary?: string;
      decisions?: string;
      recommendations?: string;
    }
  ) => {
    const response = await api.put(`/admin/class-councils/${id}`, data);
    return response.data;
  },
  // Frais de scolarité
  getTuitionFees: async (params?: {
    studentId?: string;
    classId?: string;
    academicYear?: string;
    period?: string;
    isPaid?: boolean;
    grouped?: boolean;
    feeType?: string;
  }) => {
    const response = await api.get('/admin/tuition-fees', { params });
    return response.data;
  },
  getTuitionFeesGrouped: async (params?: { studentId?: string; classId?: string; academicYear?: string; period?: string; isPaid?: boolean }) => {
    const response = await api.get('/admin/tuition-fees', { params: { ...params, grouped: true } });
    return response.data;
  },
  createTuitionFee: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/tuition-fees', data);
    return response.data;
  },
  createTuitionFeesBulk: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/tuition-fees/bulk', data);
    return response.data;
  },
  updateTuitionFee: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/tuition-fees/${id}`, data);
    return response.data;
  },
  deleteTuitionFee: async (id: string) => {
    const response = await api.delete(`/admin/tuition-fees/${id}`);
    return response.data;
  },
  createTestTuitionFees: async () => {
    const response = await api.post('/admin/tuition-fees/create-test');
    return response.data;
  },
  getPaymentsGrouped: async () => {
    const response = await api.get('/admin/payments/grouped');
    return response.data;
  },
  getPayments: async () => {
    const response = await api.get('/admin/payments');
    return response.data;
  },
  verifyPaymentReceipt: async (code: string) => {
    const response = await api.get('/admin/payments/verify-receipt', { params: { code } });
    return response.data as {
      valid: boolean;
      message?: string;
      payment?: {
        id: string;
        receiptNumber: string | null;
        verificationCode: string | null;
        amount: number;
        paidAt: string | null;
        paymentMethod: string;
        paymentReference: string | null;
        student: {
          firstName: string;
          lastName: string;
          studentId: string | null;
          className: string | null;
        };
        tuitionFee: {
          period: string;
          academicYear: string;
          billingStatus: string;
        };
      };
    };
  },
  listPendingCashPayments: async () => {
    const response = await api.get('/admin/payments/pending-cash');
    return response.data;
  },
  validateCashPayment: async (paymentId: string) => {
    const response = await api.post(`/admin/payments/${paymentId}/validate-cash`);
    return response.data;
  },
  rejectCashPayment: async (paymentId: string, reason?: string) => {
    const response = await api.post(`/admin/payments/${paymentId}/reject-cash`, { reason });
    return response.data;
  },
  assignTuitionFeeInvoices: async (data?: {
    academicYear?: string;
    prefix?: string;
    limit?: number;
  }) => {
    const response = await api.post('/admin/tuition-fees/assign-invoices', data ?? {});
    return response.data;
  },
  runTuitionFeeAutoReminders: async () => {
    const response = await api.post('/admin/tuition-fees/run-reminders', {});
    return response.data;
  },
  recordCounterTuitionPayment: async (data: {
    tuitionFeeId: string;
    amount: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER';
    notes?: string;
  }) => {
    const response = await api.post('/admin/tuition-fees/counter-payment', data);
    return response.data;
  },
  getEducators: async () => {
    const response = await api.get('/admin/educators');
    return response.data;
  },
  getEducator: async (id: string) => {
    const response = await api.get(`/admin/educators/${id}`);
    return response.data;
  },
  createEducator: async (data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    employeeId: string;
    specialization: string;
    hireDate: string;
    contractType?: string;
    salary?: number;
    classIds?: string[];
  }) => {
    const response = await api.post('/admin/educators', data);
    return response.data;
  },
  updateEducator: async (id: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    specialization?: string;
    contractType?: string;
    salary?: number;
    isActive?: boolean;
    classIds?: string[];
  }) => {
    const response = await api.put(`/admin/educators/${id}`, data);
    return response.data;
  },
  deleteEducator: async (id: string) => {
    const response = await api.delete(`/admin/educators/${id}`);
    return response.data;
  },

  getStaffJobDescriptions: async () => {
    const response = await api.get('/admin/staff/job-descriptions');
    return response.data;
  },
  createStaffJobDescription: async (data: {
    title: string;
    responsibilities: string;
    code?: string | null;
    summary?: string | null;
    requirements?: string | null;
    suggestedCategory?: 'ADMINISTRATION' | 'SUPPORT' | 'SECURITY' | null;
    suggestedCategoryOther?: string | null;
    isActive?: boolean;
  }) => {
    const response = await api.post('/admin/staff/job-descriptions', data);
    return response.data;
  },
  updateStaffJobDescription: async (
    id: string,
    data: Partial<{
      title: string;
      responsibilities: string;
      code: string | null;
      summary: string | null;
      requirements: string | null;
      suggestedCategory: 'ADMINISTRATION' | 'SUPPORT' | 'SECURITY' | null;
      suggestedCategoryOther: string | null;
      isActive: boolean;
    }>
  ) => {
    const response = await api.put(`/admin/staff/job-descriptions/${id}`, data);
    return response.data;
  },
  deleteStaffJobDescription: async (id: string) => {
    const response = await api.delete(`/admin/staff/job-descriptions/${id}`);
    return response.data;
  },
  getStaffOrgChart: async () => {
    const response = await api.get('/admin/staff/org-chart');
    return response.data;
  },
  getPersonnelRegistry: async () => {
    const response = await api.get('/admin/staff/personnel-registry');
    return response.data;
  },
  getStaffMembers: async () => {
    const response = await api.get('/admin/staff');
    return response.data;
  },
  getStaffMember: async (id: string) => {
    const response = await api.get(`/admin/staff/${id}`);
    return response.data;
  },
  createStaffMember: async (data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    employeeId: string;
    staffCategory: 'ADMINISTRATION' | 'SUPPORT' | 'SECURITY';
    supportKind?:
      | 'LIBRARIAN'
      | 'NURSE'
      | 'SECRETARY'
      | 'ACCOUNTANT'
      | 'IT'
      | 'MAINTENANCE'
      | 'STUDIES_DIRECTOR'
      | 'BURSAR'
      | 'OTHER';
    jobTitle?: string;
    department?: string;
    hireDate: string;
    contractType?: string;
    salary?: number;
    bio?: string;
    nfcId?: string;
    biometricId?: string;
    jobDescriptionId?: string | null;
    managerId?: string | null;
    visibleStaffModules?: string[];
  }) => {
    const response = await api.post('/admin/staff', data);
    return response.data;
  },
  updateStaffMember: async (
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      phone: string | null;
      employeeId: string;
      staffCategory: 'ADMINISTRATION' | 'SUPPORT' | 'SECURITY';
      supportKind: string | null;
      jobTitle: string | null;
      department: string | null;
      hireDate: string;
      contractType: string;
      salary: number | null;
      bio: string | null;
      nfcId: string | null;
      biometricId: string | null;
      jobDescriptionId: string | null;
      managerId: string | null;
      isActive: boolean;
      visibleStaffModules?: string[];
    }>
  ) => {
    const response = await api.put(`/admin/staff/${id}`, data);
    return response.data;
  },
  deleteStaffMember: async (id: string) => {
    const response = await api.delete(`/admin/staff/${id}`);
    return response.data;
  },
  getStaffAttendances: async (staffId: string, params?: { from?: string; to?: string }) => {
    const response = await api.get(`/admin/staff/${staffId}/attendances`, { params });
    return response.data;
  },
  recordStaffAttendance: async (
    staffId: string,
    data: {
      attendanceDate: string;
      status?: string;
      source?: string;
      notes?: string | null;
      checkInAt?: string | null;
      checkOutAt?: string | null;
      workedMinutes?: number | null;
    }
  ) => {
    const response = await api.post(`/admin/staff/${staffId}/attendances`, data);
    return response.data;
  },
  deleteStaffAttendance: async (staffId: string, attendanceId: string) => {
    const response = await api.delete(`/admin/staff/${staffId}/attendances/${attendanceId}`);
    return response.data;
  },

  getAdmissions: async (params?: { status?: string; academicYear?: string }) => {
    const response = await api.get('/admin/admissions', { params });
    return response.data;
  },
  getAdmissionStats: async () => {
    const response = await api.get('/admin/admissions/stats');
    return response.data;
  },
  getAdmission: async (id: string) => {
    const response = await api.get(`/admin/admissions/${id}`);
    return response.data;
  },
  updateAdmission: async (
    id: string,
    data: {
      status?: string;
      adminNotes?: string;
      proposedClassId?: string | null;
    }
  ) => {
    const response = await api.patch(`/admin/admissions/${id}`, data);
    return response.data;
  },
  enrollFromAdmission: async (
    id: string,
    data: {
      password?: string;
      studentId?: string;
      classId?: string;
      address?: string;
      emergencyContact?: string;
      emergencyPhone?: string;
      medicalInfo?: string;
      stateAssignment?: 'STATE_ASSIGNED' | 'NOT_STATE_ASSIGNED';
    }
  ) => {
    const response = await api.post(`/admin/admissions/${id}/enroll`, data);
    return response.data;
  },
  getStudentIdentityDocuments: async (studentId: string) => {
    const response = await api.get(`/admin/students/${studentId}/identity-documents`);
    return response.data;
  },
  deleteStudentIdentityDocument: async (studentId: string, documentId: string) => {
    const response = await api.delete(
      `/admin/students/${studentId}/identity-documents/${documentId}`
    );
    return response.data;
  },
  getStudentDigitalCard: async (studentId: string) => {
    const response = await api.get(`/admin/students/${studentId}/digital-card`);
    return response.data as { publicId: string; cardPageUrl: string; qrDataUrl: string };
  },
  addStudentSchoolHistory: async (
    studentId: string,
    data: {
      academicYear: string;
      className?: string;
      classLevel?: string;
      establishment?: string;
      notes?: string;
      classId?: string;
    }
  ) => {
    const response = await api.post(`/admin/students/${studentId}/school-history`, data);
    return response.data;
  },
  deleteStudentSchoolHistory: async (studentId: string, historyId: string) => {
    const response = await api.delete(
      `/admin/students/${studentId}/school-history/${historyId}`
    );
    return response.data;
  },
  recordStudentTransfer: async (
    studentId: string,
    data: {
      effectiveDate: string;
      transferType: 'CLASS_CHANGE' | 'REENROLLMENT' | 'MUTATION' | 'DEPARTURE';
      toClassId?: string | null;
      reason?: string;
      notes?: string;
    }
  ) => {
    const response = await api.post(`/admin/students/${studentId}/transfer`, data);
    return response.data;
  },
  archiveStudent: async (studentId: string) => {
    const response = await api.post(`/admin/students/${studentId}/archive`);
    return response.data;
  },
  unarchiveStudent: async (studentId: string) => {
    const response = await api.post(`/admin/students/${studentId}/unarchive`);
    return response.data;
  },

  getDisciplineRulebooks: async () => {
    const response = await api.get("/admin/discipline/rulebooks");
    return response.data;
  },
  createDisciplineRulebook: async (data: {
    title?: string;
    content: string;
    academicYear?: string;
    effectiveFrom?: string;
    isPublished?: boolean;
    sortOrder?: number;
  }) => {
    const response = await api.post("/admin/discipline/rulebooks", data);
    return response.data;
  },
  updateDisciplineRulebook: async (
    id: string,
    data: Partial<{
      title: string;
      content: string;
      academicYear: string | null;
      effectiveFrom: string;
      isPublished: boolean;
      sortOrder: number;
    }>
  ) => {
    const response = await api.put(`/admin/discipline/rulebooks/${id}`, data);
    return response.data;
  },
  deleteDisciplineRulebook: async (id: string) => {
    const response = await api.delete(`/admin/discipline/rulebooks/${id}`);
    return response.data;
  },
  getDisciplineRecords: async (params?: {
    studentId?: string;
    classId?: string;
    academicYear?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get("/admin/discipline/records", { params });
    return response.data;
  },
  createDisciplineRecord: async (data: Record<string, unknown>) => {
    const response = await api.post("/admin/discipline/records", data);
    return response.data;
  },
  updateDisciplineRecord: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/discipline/records/${id}`, data);
    return response.data;
  },
  deleteDisciplineRecord: async (id: string) => {
    const response = await api.delete(`/admin/discipline/records/${id}`);
    return response.data;
  },

  getExtracurricularOfferings: async (params?: {
    academicYear?: string;
    kind?: 'CLUB' | 'EVENT';
    category?: string;
    classId?: string;
    publishedOnly?: boolean;
  }) => {
    const response = await api.get('/admin/extracurricular/offerings', { params });
    return response.data;
  },
  createExtracurricularOffering: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/extracurricular/offerings', data);
    return response.data;
  },
  updateExtracurricularOffering: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/extracurricular/offerings/${id}`, data);
    return response.data;
  },
  deleteExtracurricularOffering: async (id: string) => {
    const response = await api.delete(`/admin/extracurricular/offerings/${id}`);
    return response.data;
  },
  getExtracurricularOfferingRegistrations: async (offeringId: string) => {
    const response = await api.get(`/admin/extracurricular/offerings/${offeringId}/registrations`);
    return response.data;
  },
  createExtracurricularRegistration: async (data: { studentId: string; offeringId: string }) => {
    const response = await api.post('/admin/extracurricular/registrations', data);
    return response.data;
  },
  deleteExtracurricularRegistration: async (id: string) => {
    const response = await api.delete(`/admin/extracurricular/registrations/${id}`);
    return response.data;
  },

  getCanteenPlans: async (params?: { academicYear?: string; publishedOnly?: boolean }) => {
    const response = await api.get('/admin/campus/canteen/plans', { params });
    return response.data;
  },
  createCanteenPlan: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/campus/canteen/plans', data);
    return response.data;
  },
  deleteCanteenPlan: async (id: string) => {
    const response = await api.delete(`/admin/campus/canteen/plans/${id}`);
    return response.data;
  },
  createCanteenSubscription: async (data: { studentId: string; planId: string }) => {
    const response = await api.post('/admin/campus/canteen/subscriptions', data);
    return response.data;
  },
  getTransportRoutes: async (params?: { academicYear?: string; publishedOnly?: boolean }) => {
    const response = await api.get('/admin/campus/transport/routes', { params });
    return response.data;
  },
  createTransportRoute: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/campus/transport/routes', data);
    return response.data;
  },
  deleteTransportRoute: async (id: string) => {
    const response = await api.delete(`/admin/campus/transport/routes/${id}`);
    return response.data;
  },
  createTransportSubscription: async (data: {
    studentId: string;
    routeId: string;
    stopLabel?: string;
  }) => {
    const response = await api.post('/admin/campus/transport/subscriptions', data);
    return response.data;
  },
  getPendingMobileMoneyPayments: async () => {
    const response = await api.get('/admin/payments/pending-mobile-money');
    return response.data;
  },
  confirmMobileMoneyPayment: async (id: string, data?: { transactionId?: string }) => {
    const response = await api.post(`/admin/payments/${id}/confirm-mobile-money`, data || {});
    return response.data;
  },

  getPaymentIntegrations: async () => {
    const response = await api.get('/admin/integrations/payments');
    return response.data;
  },
  getIntegrationSettings: async () => {
    const response = await api.get('/admin/integrations/settings');
    return response.data as {
      webhooks: {
        menaPresence: string;
        paymentMobileMoney: string;
        paymentWave: string;
        paymentCinetpay: string;
        paymentPaystack: string;
        paymentMtn: string;
        paymentOrange: string;
      };
      mena: {
        webhookSecretConfigured: boolean;
        webhookSecretFromDb: boolean;
        watchDir: string | null;
        watchDirFromDb: boolean;
        importEnabled: boolean;
        importEnabledFromDb: boolean;
        cron: string;
        cronFromDb: boolean;
        dbUrlConfigured: boolean;
        dbUrlFromDb: boolean;
        dbQuery: string | null;
        dbQueryFromDb: boolean;
      };
      nfc: { apiKeyConfigured: boolean; apiKeyFromDb: boolean };
      payments: {
        webhookSecretConfigured: boolean;
        webhookSecretFromDb: boolean;
        waveConfigured: boolean;
        waveFromDb: boolean;
        orangeConfigured: boolean;
        orangeFromDb: boolean;
        mtnConfigured: boolean;
        mtnFromDb: boolean;
        cinetpayConfigured: boolean;
        cinetpayFromDb: boolean;
        cinetpaySiteId: string | null;
        paystackConfigured: boolean;
        paystackFromDb: boolean;
      };
      whatsapp: {
        configured: boolean;
        tokenFromDb: boolean;
        phoneNumberId: string | null;
        phoneNumberIdFromDb: boolean;
        defaultCountryCode: string;
        defaultCountryCodeFromDb: boolean;
      };
      smtp: {
        configured: boolean;
        host: string | null;
        hostFromDb: boolean;
        port: number;
        portFromDb: boolean;
        secure: boolean;
        secureFromDb: boolean;
        user: string | null;
        userFromDb: boolean;
        passConfigured: boolean;
        passFromDb: boolean;
        emailFrom: string | null;
        emailFromFromDb: boolean;
      };
    };
  },
  updateIntegrationSettings: async (data: Record<string, unknown>) => {
    const response = await api.put('/admin/integrations/settings', data);
    return response.data;
  },
  getWhatsAppStatus: async () => {
    const response = await api.get('/admin/integrations/whatsapp/status');
    return response.data;
  },
  sendWhatsAppTest: async (data: { phone: string; message: string }) => {
    const response = await api.post('/admin/integrations/whatsapp/send', data);
    return response.data;
  },
  getLtiConfig: async () => {
    const response = await api.get('/admin/integrations/lti/config');
    return response.data;
  },
  putLtiConfig: async (data: {
    issuer: string;
    clientId: string;
    deploymentId?: string;
    keysetUrl?: string;
    enabled?: boolean;
    redirectUris?: string[];
  }) => {
    const response = await api.put('/admin/lti/config', data);
    return response.data;
  },
  getScormPackages: async () => {
    const response = await api.get('/admin/scorm/packages');
    return response.data;
  },
  createScormPackage: async (data: { title: string; entryUrl: string; version?: string }) => {
    const response = await api.post('/admin/scorm/packages', data);
    return response.data;
  },
  getAlumniProfiles: async () => {
    const response = await api.get('/admin/alumni/profiles');
    return response.data;
  },
  createAlumniProfile: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/alumni/profiles', data);
    return response.data;
  },
  syncAlumniFromGraduated: async () => {
    const response = await api.post('/admin/alumni/profiles/sync-graduated');
    return response.data;
  },
  getAlumniEvents: async () => {
    const response = await api.get('/admin/alumni/events');
    return response.data;
  },
  createAlumniEvent: async (data: { title: string; eventDate: string; location?: string; description?: string }) => {
    const response = await api.post('/admin/alumni/events', data);
    return response.data;
  },
  getAlumniDonations: async () => {
    const response = await api.get('/admin/alumni/donations');
    return response.data;
  },
  createAlumniDonation: async (data: { amount: number; note?: string; alumniProfileId?: string; currency?: string }) => {
    const response = await api.post('/admin/alumni/donations', data);
    return response.data;
  },
  getSignatureRequests: async () => {
    const response = await api.get('/admin/esignature/requests');
    return response.data;
  },
  createSignatureRequest: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/esignature/requests', data);
    return response.data;
  },
  signSignatureRequest: async (id: string, signatureData: string) => {
    const response = await api.post(`/admin/esignature/requests/${id}/sign`, { signatureData });
    return response.data;
  },
  getProcurementRequests: async () => {
    const response = await api.get('/admin/procurement/requests');
    return response.data;
  },
  createProcurementRequest: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/procurement/requests', data);
    return response.data;
  },
  updateProcurementStatus: async (id: string, status: string) => {
    const response = await api.patch(`/admin/procurement/requests/${id}/status`, { status });
    return response.data;
  },
  addProcurementBid: async (id: string, data: { vendorName: string; amount: number; notes?: string }) => {
    const response = await api.post(`/admin/procurement/requests/${id}/bids`, data);
    return response.data;
  },
  selectProcurementBid: async (id: string, bidId: string) => {
    const response = await api.post(`/admin/procurement/requests/${id}/select-bid`, { bidId });
    return response.data;
  },
  getMarketingCampaigns: async () => {
    const response = await api.get('/admin/marketing/campaigns');
    return response.data;
  },
  createMarketingCampaign: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/marketing/campaigns', data);
    return response.data;
  },
  sendMarketingCampaign: async (id: string) => {
    const response = await api.post(`/admin/marketing/campaigns/${id}/send`);
    return response.data;
  },
  patchMarketingLead: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/marketing/leads/${id}`, data);
    return response.data;
  },
  getEstateBuildings: async () => {
    const response = await api.get('/admin/estate/buildings');
    return response.data;
  },
  createEstateBuilding: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/estate/buildings', data);
    return response.data;
  },
  createEstateAsset: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/estate/assets', data);
    return response.data;
  },
  getGamificationLeaderboard: async () => {
    const response = await api.get('/admin/gamification/leaderboard');
    return response.data;
  },
  getInspectionExport: async (params?: { academicYear?: string }) => {
    const response = await api.get('/admin/reports/inspection-export', { params });
    return response.data as {
      generatedAt: string;
      files: Array<{ name: string; contentType: string; content: string }>;
    };
  },
  getTransportTracking: async (routeId: string, params?: { limit?: number }) => {
    const response = await api.get(`/admin/campus/transport/routes/${routeId}/tracking`, { params });
    return response.data;
  },
  postTransportPing: async (
    routeId: string,
    data: { latitude: number; longitude: number; speedKmh?: number; heading?: number; note?: string }
  ) => {
    const response = await api.post(`/admin/campus/transport/routes/${routeId}/tracking`, data);
    return response.data;
  },
  getPaymentsForecast: async (params?: { months?: number }) => {
    const response = await api.get('/admin/analytics/forecast/payments', { params });
    return response.data;
  },
  optimizeSchedule: async (data: {
    classId: string;
    teacherId?: string;
    candidates: Array<{ dayOfWeek: number; startTime: string; endTime: string; roomKey?: string }>;
    preferMorning?: boolean;
  }) => {
    const response = await api.post('/admin/schedule/optimize', data);
    return response.data;
  },
  getStudentGamification: async (studentId: string) => {
    const response = await api.get(`/admin/gamification/students/${studentId}`);
    return response.data;
  },
  awardStudentGamification: async (
    studentId: string,
    data: { points: number; label: string; kind?: string; badgeCode?: string }
  ) => {
    const response = await api.post(`/admin/gamification/students/${studentId}/award`, data);
    return response.data;
  },

  getMockExams: async (params?: { academicYear?: string }) => {
    const response = await api.get('/admin/mock-exams', { params });
    return response.data;
  },
  getMockExamClasses: async (params?: { academicYear?: string }) => {
    const response = await api.get('/admin/mock-exams/exam-classes', { params });
    return response.data;
  },
  getMockExam: async (id: string) => {
    const response = await api.get(`/admin/mock-exams/${id}`);
    return response.data;
  },
  createMockExam: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/mock-exams', data);
    return response.data;
  },
  updateMockExam: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/mock-exams/${id}`, data);
    return response.data;
  },
  deleteMockExam: async (id: string) => {
    const response = await api.delete(`/admin/mock-exams/${id}`);
    return response.data;
  },

  getOrientationFilieres: async (params?: { publishedOnly?: boolean }) => {
    const response = await api.get('/admin/orientation/filieres', { params });
    return response.data;
  },
  createOrientationFiliere: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/orientation/filieres', data);
    return response.data;
  },
  updateOrientationFiliere: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/orientation/filieres/${id}`, data);
    return response.data;
  },
  deleteOrientationFiliere: async (id: string) => {
    const response = await api.delete(`/admin/orientation/filieres/${id}`);
    return response.data;
  },
  getOrientationPartnerships: async (params?: { publishedOnly?: boolean }) => {
    const response = await api.get('/admin/orientation/partnerships', { params });
    return response.data;
  },
  createOrientationPartnership: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/orientation/partnerships', data);
    return response.data;
  },
  updateOrientationPartnership: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/orientation/partnerships/${id}`, data);
    return response.data;
  },
  deleteOrientationPartnership: async (id: string) => {
    const response = await api.delete(`/admin/orientation/partnerships/${id}`);
    return response.data;
  },
  getOrientationAptitudeTests: async (params?: { publishedOnly?: boolean; academicYear?: string }) => {
    const response = await api.get('/admin/orientation/aptitude-tests', { params });
    return response.data;
  },
  createOrientationAptitudeTest: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/orientation/aptitude-tests', data);
    return response.data;
  },
  updateOrientationAptitudeTest: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/orientation/aptitude-tests/${id}`, data);
    return response.data;
  },
  deleteOrientationAptitudeTest: async (id: string) => {
    const response = await api.delete(`/admin/orientation/aptitude-tests/${id}`);
    return response.data;
  },
  getOrientationAdvice: async (params?: { publishedOnly?: boolean }) => {
    const response = await api.get('/admin/orientation/advice', { params });
    return response.data;
  },
  createOrientationAdvice: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/orientation/advice', data);
    return response.data;
  },
  updateOrientationAdvice: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/orientation/advice/${id}`, data);
    return response.data;
  },
  deleteOrientationAdvice: async (id: string) => {
    const response = await api.delete(`/admin/orientation/advice/${id}`);
    return response.data;
  },
  getOrientationFollowUps: async (params?: { studentId?: string; academicYear?: string }) => {
    const response = await api.get('/admin/orientation/follow-ups', { params });
    return response.data;
  },
  createOrientationFollowUp: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/orientation/follow-ups', data);
    return response.data;
  },
  updateOrientationFollowUp: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/orientation/follow-ups/${id}`, data);
    return response.data;
  },
  deleteOrientationFollowUp: async (id: string) => {
    const response = await api.delete(`/admin/orientation/follow-ups/${id}`);
    return response.data;
  },
  getOrientationPlacements: async (params?: { studentId?: string }) => {
    const response = await api.get('/admin/orientation/placements', { params });
    return response.data;
  },
  createOrientationPlacement: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/orientation/placements', data);
    return response.data;
  },
  updateOrientationPlacement: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/orientation/placements/${id}`, data);
    return response.data;
  },
  deleteOrientationPlacement: async (id: string) => {
    const response = await api.delete(`/admin/orientation/placements/${id}`);
    return response.data;
  },
  getAppBranding: async () => {
    const response = await api.get('/admin/app-branding');
    return response.data;
  },
  updateAppBranding: async (data: Record<string, unknown>) => {
    const response = await api.put('/admin/app-branding', data);
    return response.data;
  },
  uploadAppBrandingFile: async (slot: AppBrandingUploadSlot, file: File) => {
    const formData = new FormData();
    formData.append('branding', file);
    const response = await api.post(
      `/admin/app-branding/upload?slot=${encodeURIComponent(slot)}`,
      formData
    );
    return response.data;
  },
  getAdminWorkspaceContext: async () => {
    const response = await api.get('/admin/workspaces/my-context');
    return response.data;
  },
  getAdminWorkspaces: async () => {
    const response = await api.get('/admin/workspaces');
    return response.data;
  },
  createAdminWorkspace: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/workspaces', data);
    return response.data;
  },
  updateAdminWorkspace: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/workspaces/${id}`, data);
    return response.data;
  },
  deactivateAdminWorkspace: async (id: string) => {
    const response = await api.delete(`/admin/workspaces/${id}`);
    return response.data;
  },
  listSchools: async () => {
    const response = await api.get('/admin/schools');
    return response.data;
  },
  setActiveSchool: async (schoolId: string) => {
    const response = await api.put('/admin/schools/active', { schoolId });
    return response.data;
  },
  listSchoolsManage: async () => {
    const response = await api.get('/admin/schools/manage');
    return response.data;
  },
  createSchool: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/schools', data);
    return response.data;
  },
  updateSchool: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/schools/${id}`, data);
    return response.data;
  },

  getSchoolStaffMetiers: async () => {
    const response = await api.get('/admin/school-staff-metiers');
    return response.data as {
      metiers: Array<{
        id: string;
        schoolId: string;
        supportKind: string;
        label: string;
        description: string | null;
        defaultModules: string[];
        isActive: boolean;
        sortOrder: number;
      }>;
      moduleLabels: Record<string, string>;
    };
  },
  updateSchoolStaffMetier: async (
    supportKind: string,
    data: {
      label?: string | null;
      description?: string | null;
      defaultModules?: string[];
      isActive?: boolean;
      sortOrder?: number;
    },
  ) => {
    const response = await api.put(`/admin/school-staff-metiers/${supportKind}`, data);
    return response.data;
  },
  seedSchoolStaffMetiersDefaults: async () => {
    const response = await api.post('/admin/school-staff-metiers/seed-defaults');
    return response.data;
  },

  getPublicVisitorStats: async () => {
    const response = await api.get('/admin/public-visitors/stats');
    return response.data as {
      visitorsCount: number;
      pageViewsCount: number;
      contactLeadsCount: number;
      openThreadsCount: number;
      recommendationsCount: number;
    };
  },
  getPublicVisitors: async (params?: { limit?: number }) => {
    const response = await api.get('/admin/public-visitors', { params });
    return response.data as Array<{
      id: string;
      visitorId: string;
      firstSeenAt: string;
      lastSeenAt: string;
      createdAt: string;
      lastIp: string | null;
      countryCode: string | null;
      country: string | null;
      region: string | null;
      city: string | null;
      userAgent: string | null;
      deviceType: string | null;
      browser: string | null;
      os: string | null;
      language: string | null;
      timezone: string | null;
      _count: { events: number; contactLeads: number; chatThreads: number };
    }>;
  },
  getPublicVisitorDetail: async (id: string) => {
    const response = await api.get(`/admin/public-visitors/${id}`);
    return response.data as {
      visitor: {
        id: string;
        visitorId: string;
        firstSeenAt: string;
        lastSeenAt: string;
        lastIp: string | null;
        countryCode: string | null;
        country: string | null;
        region: string | null;
        city: string | null;
        userAgent: string | null;
        deviceType: string | null;
        browser: string | null;
        os: string | null;
        language: string | null;
        timezone: string | null;
        contactLeads: Array<{
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string | null;
          createdAt: string;
        }>;
        chatThreads: Array<{
          id: string;
          status: string;
          updatedAt: string;
          _count: { messages: number };
        }>;
      };
      events: Array<{
        id: string;
        eventType: string;
        pageUrl: string | null;
        referrerUrl: string | null;
        createdAt: string;
        metadata: Record<string, unknown> | null;
      }>;
    };
  },
  getPublicContactLeads: async (params?: { limit?: number }) => {
    const response = await api.get('/admin/public-contact-leads', { params });
    return response.data;
  },
  getPublicRecommendations: async (params?: { limit?: number }) => {
    const response = await api.get('/admin/public-recommendations', { params });
    return response.data as Array<{
      id: string;
      criteria: Record<string, unknown> | null;
      result: { summary?: string; suggestions?: Array<string | { title: string }> } | null;
      createdAt: string;
      publicVisitorId: string | null;
    }>;
  },
  replyPublicRecommendation: async (id: string, content: string) => {
    const response = await api.post(`/admin/public-recommendations/${id}/reply`, { content });
    return response.data as {
      threadId: string;
      message: { id: string; senderType: string; content: string; createdAt: string };
    };
  },
  getPublicChatThreads: async (params?: { status?: 'OPEN' | 'CLOSED'; limit?: number }) => {
    const response = await api.get('/admin/public-chat/threads', { params });
    return response.data;
  },
  getPublicChatThreadMessages: async (threadId: string) => {
    const response = await api.get(`/admin/public-chat/threads/${threadId}/messages`);
    return response.data as {
      thread: {
        id: string;
        status: 'OPEN' | 'CLOSED';
        createdAt: string;
        publicVisitor: { id: string; visitorId: string } | null;
      };
      messages: Array<{
        id: string;
        senderType: string;
        content: string;
        createdAt: string;
      }>;
    };
  },
  sendPublicChatStaffMessage: async (threadId: string, content: string) => {
    const response = await api.post(`/admin/public-chat/threads/${threadId}/messages`, { content });
    return response.data;
  },
  updatePublicChatThreadStatus: async (threadId: string, status: 'OPEN' | 'CLOSED') => {
    const response = await api.patch(`/admin/public-chat/threads/${threadId}`, { status });
    return response.data;
  },

  // ——— Opérations scolaires (lot 10 fonctionnalités) ———
  auditTimetableConflicts: async (params?: { classId?: string }) => {
    const response = await api.get('/admin/timetable/conflicts-audit', { params });
    return response.data as {
      conflicts: Array<{
        kind: string;
        dayOfWeek: number;
        detail: string;
        slotA: { label: string; startTime: string; endTime: string };
        slotB: { label: string; startTime: string; endTime: string };
      }>;
      scheduleCount: number;
    };
  },
  billCampusSubscriptions: async (data?: { academicYear?: string; dueDate?: string }) => {
    const response = await api.post('/admin/campus/bill-subscriptions', data ?? {});
    return response.data;
  },
  runAbsenceReminders: async () => {
    const response = await api.post('/admin/attendance/run-absence-reminders');
    return response.data as { studentsChecked: number; remindersSent: number; skippedAlreadyNotified: number };
  },
  getCanteenDailyMenus: async (params?: { menuDate?: string; planId?: string }) => {
    const response = await api.get('/admin/campus/canteen/menus', { params });
    return response.data;
  },
  createCanteenDailyMenu: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/campus/canteen/menus', data);
    return response.data;
  },
  deleteCanteenDailyMenu: async (id: string) => {
    const response = await api.delete(`/admin/campus/canteen/menus/${id}`);
    return response.data;
  },
  getCanteenMealCheckIns: async (menuDate: string) => {
    const response = await api.get('/admin/campus/canteen/check-ins', { params: { menuDate } });
    return response.data;
  },
  postCanteenMealCheckIn: async (data: { studentId: string; menuDate?: string; mealType?: string }) => {
    const response = await api.post('/admin/campus/canteen/check-ins', data);
    return response.data;
  },
  getTransportCheckIns: async (params?: { routeId?: string; date?: string }) => {
    const response = await api.get('/admin/campus/transport/check-ins', { params });
    return response.data;
  },
  postTransportCheckIn: async (data: {
    routeId: string;
    studentId: string;
    checkInType?: 'BOARD' | 'DROPOFF';
    stopLabel?: string;
  }) => {
    const response = await api.post('/admin/campus/transport/check-ins', data);
    return response.data;
  },
  getPhysicalExamSessions: async (params?: { academicYear?: string }) => {
    const response = await api.get('/admin/physical-exams', { params });
    return response.data;
  },
  createPhysicalExamSession: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/physical-exams', data);
    return response.data;
  },
  updatePhysicalExamSession: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/physical-exams/${id}`, data);
    return response.data;
  },
  deletePhysicalExamSession: async (id: string) => {
    const response = await api.delete(`/admin/physical-exams/${id}`);
    return response.data;
  },
  updateClassCouncilOpinions: async (id: string, studentOpinions: unknown[]) => {
    const response = await api.put(`/admin/class-councils/${id}/opinions`, { studentOpinions });
    return response.data;
  },
  finalizeClassCouncil: async (id: string) => {
    const response = await api.post(`/admin/class-councils/${id}/finalize`);
    return response.data;
  },
  getAdminLessonLogs: async (params?: { classId?: string; courseId?: string }) => {
    const response = await api.get('/admin/lesson-logs', { params });
    return response.data;
  },
  openClassCouncilMinutesHtml: async (id: string) => {
    const response = await api.get(`/admin/class-councils/${id}/minutes-html`, {
      responseType: 'text',
    });
    const blob = new Blob([response.data as string], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
  },
  openPayrollPayslipHtml: async (runId: string, lineId: string) => {
    const response = await api.get(
      `/admin/hr/payroll/runs/${runId}/lines/${lineId}/payslip-html`,
      { responseType: 'text' }
    );
    const blob = new Blob([response.data as string], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
  },
  getOfficialExamStats: async (params?: { academicYear?: string }) => {
    const response = await api.get('/admin/official-exam-stats', { params });
    return response.data;
  },
  createOfficialExamStat: async (data: Record<string, unknown>) => {
    const response = await api.post('/admin/official-exam-stats', data);
    return response.data;
  },
  updateOfficialExamStat: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/admin/official-exam-stats/${id}`, data);
    return response.data;
  },
  deleteOfficialExamStat: async (id: string) => {
    const response = await api.delete(`/admin/official-exam-stats/${id}`);
    return response.data;
  },
  updateHonorRollSettings: async (data: {
    enabled?: boolean;
    academicYear?: string | null;
    period?: string | null;
  }) => {
    const response = await api.put('/admin/honor-roll-settings', data);
    return response.data;
  },
};
