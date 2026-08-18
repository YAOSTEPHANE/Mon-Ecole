import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import FilterDropdown from '../ui/FilterDropdown';
import toast from 'react-hot-toast';
import { ACADEMIC_CHANGE_VALIDATION_MESSAGE } from '@/lib/academicValidationMessages';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import {
  generateSchoolReportCardPdf,
  SCHOOL_REPORT_CARD_DEFAULT_BRANDING,
  REPORT_CARD_DISTINCTION_OPTIONS,
  REPORT_CARD_SANCTION_OPTIONS,
} from '@/lib/schoolReportCardPdf';
import { getCurrentAcademicYear, getCurrentTrimester } from '@/lib/academicCalendar';
import { resolveUploadFetchUrl } from '@/lib/uploadsPublicUrl';

import {
  FiFileText,
  FiUsers,
  FiAlertCircle,
  FiLoader,
} from 'react-icons/fi';

interface GenerateReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const periods = [
  { value: 'trim1', label: 'Trimestre 1' },
  { value: 'trim2', label: 'Trimestre 2' },
  { value: 'trim3', label: 'Trimestre 3' },
  { value: 'sem1', label: 'Semestre 1' },
  { value: 'sem2', label: 'Semestre 2' },
];

const academicYears = [
  { value: '2023-2024', label: '2023-2024' },
  { value: '2024-2025', label: '2024-2025' },
  { value: '2025-2026', label: '2025-2026' },
  { value: '2026-2027', label: '2026-2027' },
];

const GenerateReportCardModal: React.FC<GenerateReportCardModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { branding, navigationLogoAbsolute, loginLogoAbsolute } = useAppBranding();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => getCurrentTrimester());
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(() => getCurrentAcademicYear());
  const [isGenerating, setIsGenerating] = useState(false);
  /** Après génération PDF : enregistrer en base et rendre visible aux élèves / familles */
  const [publishAfterSave, setPublishAfterSave] = useState(false);
  const [mentionsByStudent, setMentionsByStudent] = useState<
    Record<string, { distinction: string; sanctions: string[] }>
  >({});

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
    enabled: isOpen,
  });

  // Fetch report card data when class is selected
  const { data: reportCardPayload, isLoading: isLoadingData } = useQuery({
    queryKey: ['report-card-data', selectedClass, selectedPeriod, selectedAcademicYear],
    queryFn: () => adminApi.generateReportCardData({
      classId: selectedClass,
      period: selectedPeriod,
      academicYear: selectedAcademicYear,
    }),
    enabled: isOpen && !!selectedClass && !!selectedPeriod && !!selectedAcademicYear,
  });

  const reportCardStudents = reportCardPayload?.students ?? [];

  useEffect(() => {
    const students = reportCardPayload?.students as
      | Array<{ studentId: string; distinctions?: string[]; sanctions?: string[] }>
      | undefined;
    if (!students) return;
    const next: Record<string, { distinction: string; sanctions: string[] }> = {};
    for (const student of students) {
      next[student.studentId] = {
        distinction: student.distinctions?.[0] ?? '',
        sanctions: student.sanctions ?? [],
      };
    }
    setMentionsByStudent(next);
  }, [reportCardPayload]);

  const pdfBranding = useMemo(
    () => ({
      schoolName:
        branding.schoolDisplayName?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolName,
      schoolPhone:
        branding.schoolPhone?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolPhone,
      schoolAddress:
        branding.schoolAddress?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolAddress,
      schoolEmail:
        branding.schoolEmail?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolEmail,
      schoolCode:
        branding.schoolCode?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolCode,
      principalName: branding.schoolPrincipal?.trim() || '',
      studiesDirectorName: branding.studiesDirectorName?.trim() || '',
      logoDataUrl: reportCardPayload?.logoDataUrl ?? null,
      logoAbsoluteUrl:
        resolveUploadFetchUrl(navigationLogoAbsolute || loginLogoAbsolute) ??
        navigationLogoAbsolute ??
        loginLogoAbsolute ??
        null,
      city:
        branding.schoolAddress?.trim().split(',')[0]?.trim() ||
        SCHOOL_REPORT_CARD_DEFAULT_BRANDING.city,
    }),
    [branding, navigationLogoAbsolute, loginLogoAbsolute, reportCardPayload?.logoDataUrl],
  );

  const periodLabel = useMemo(
    () => periods.find((p) => p.value === selectedPeriod)?.label || selectedPeriod,
    [selectedPeriod],
  );

  // Generate report card mutation
  const generateReportCardMutation = useMutation({
    mutationFn: async () => {
      if (!reportCardPayload?.students?.length) {
        throw new Error('Données de bulletin non disponibles');
      }

      // Generate PDF for each student
      for (const studentData of reportCardPayload.students) {
        const row = studentData as {
          studentId: string;
          distinctions?: string[];
          sanctions?: string[];
        };
        const draft = mentionsByStudent[row.studentId];
        await generateSchoolReportCardPdf(
          {
            ...(studentData as Parameters<typeof generateSchoolReportCardPdf>[0]),
            distinctions: draft?.distinction ? [draft.distinction] : [],
            sanctions: draft?.sanctions ?? [],
          },
          {
            periodLabel,
            periodKey: selectedPeriod,
            academicYear: selectedAcademicYear,
            branding: pdfBranding,
          },
        );
      }

      try {
        const councils = (await adminApi.getClassCouncils({
          classId: selectedClass,
          period: selectedPeriod,
          academicYear: selectedAcademicYear,
        })) as Array<{ id: string }>;
        let councilId = councils[0]?.id;
        if (!councilId) {
          const created = (await adminApi.createClassCouncil({
            classId: selectedClass,
            period: selectedPeriod,
            academicYear: selectedAcademicYear,
            meetingDate: new Date().toISOString(),
            title: `Mentions bulletins — ${periodLabel}`,
          })) as { id: string };
          councilId = created.id;
        }
        await adminApi.updateClassCouncilOpinions(
          councilId,
          reportCardPayload.students.map((studentData: { studentId: string }) => {
            const draft = mentionsByStudent[studentData.studentId];
            return {
              studentId: studentData.studentId,
              councilDecision: draft?.distinction || (draft?.sanctions?.[0] ?? ''),
              distinctions: draft?.distinction ? [draft.distinction] : [],
              sanctions: draft?.sanctions ?? [],
            };
          }),
        );
      } catch (mentionError) {
        console.error('Enregistrement des mentions bulletin:', mentionError);
      }

      let saveResult: { message?: string; skippedPending?: number } | null = null;
      let saveWarning: string | null = null;
      try {
        saveResult = await adminApi.saveReportCards({
          classId: selectedClass,
          period: selectedPeriod,
          academicYear: selectedAcademicYear,
          publish: publishAfterSave,
        });
      } catch (saveError: unknown) {
        const axiosErr = saveError as {
          code?: string;
          message?: string;
          response?: { status?: number; data?: { error?: string } };
        };
        const apiMessage = axiosErr.response?.data?.error;
        const backendUnreachable =
          axiosErr.code === 'ERR_NETWORK' ||
          axiosErr.code === 'ECONNREFUSED' ||
          (axiosErr.response?.status === 500 && !apiMessage);

        if (backendUnreachable) {
          saveWarning =
            'Les PDF ont été téléchargés, mais le serveur API est injoignable. Vérifiez que `npm run dev` tourne dans le dossier server/, puis resynchronisez depuis l’onglet Bulletins.';
        } else if (axiosErr.response?.status === 409) {
          saveWarning =
            apiMessage ??
            'Les PDF ont été téléchargés. Une demande de validation est déjà en cours pour cette période.';
        } else {
          saveWarning =
            apiMessage ??
            'Les PDF ont été téléchargés, mais l’enregistrement en base a échoué.';
        }
      }

      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report-cards-tab'] });
      return { count: reportCardPayload.students.length, saveResult, saveWarning };
    },
    onSuccess: ({
      count,
      saveResult,
      saveWarning,
    }: {
      count: number;
      saveResult?: { message?: string; skippedPending?: number } | null;
      saveWarning?: string | null;
    }) => {
      if (saveWarning) {
        toast.success(`${count} PDF généré(s) et téléchargé(s).`, { duration: 6000 });
        toast.error(saveWarning, { duration: 10000 });
      } else {
        const validationMsg = saveResult?.message ?? ACADEMIC_CHANGE_VALIDATION_MESSAGE;
        toast.success(`${count} PDF généré(s). ${validationMsg}`, { duration: 8000 });
      }
      handleClose();
    },
    onError: (error: unknown) => {
      console.error('Error generating report cards:', error);
      const axiosErr = error as {
        code?: string;
        response?: { status?: number; data?: { error?: string } };
      };
      const apiMessage = axiosErr.response?.data?.error;
      if (axiosErr.code === 'ERR_NETWORK' || axiosErr.response?.status === 500) {
        toast.error(
          apiMessage ||
            'Serveur API inaccessible. Lancez le backend : cd server puis npm run dev (port 5000).',
          { duration: 10000 },
        );
        return;
      }
      toast.error(apiMessage || 'Erreur lors de la génération des bulletins');
    },
    onSettled: () => setIsGenerating(false),
  });

  const handleGenerate = async () => {
    if (!selectedClass) {
      toast.error('Veuillez sélectionner une classe');
      return;
    }
    if (!selectedPeriod) {
      toast.error('Veuillez sélectionner une période');
      return;
    }
    if (!selectedAcademicYear) {
      toast.error('Veuillez sélectionner une année scolaire');
      return;
    }

    setIsGenerating(true);
    generateReportCardMutation.mutate();
  };

  const handleClose = () => {
    setSelectedClass('');
    setSelectedPeriod(getCurrentTrimester());
    setSelectedAcademicYear(getCurrentAcademicYear());
    setPublishAfterSave(false);
    setMentionsByStudent({});
    onClose();
  };

  const canGenerate =
    selectedClass &&
    selectedPeriod &&
    selectedAcademicYear &&
    reportCardStudents.length > 0;

  const studentsWithoutGrades = useMemo(() => {
    if (!reportCardStudents.length) return 0;
    return reportCardStudents.filter(
      (s: { grades?: unknown[]; courseAverages?: Record<string, { average?: number }> }) => {
        const gradeCount = s.grades?.length ?? 0;
        const hasAverage = s.courseAverages
          ? Object.values(s.courseAverages).some((c) => (c.average ?? 0) > 0)
          : false;
        return gradeCount === 0 && !hasAverage;
      },
    ).length;
  }, [reportCardStudents]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Génération de Bulletins" size="lg">
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FiAlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium mb-1">Instructions</p>
              <p className="text-sm text-blue-700">
                Sélectionnez une classe, une période et une année scolaire. Le PDF reprend le modèle officiel
                Bulletin scolaire (colonnes Trim. 1–3, bilans lettres/sciences, résumé, distinctions, signatures).
                Pour le <strong>3e trimestre</strong>, les moyennes et rangs des trimestres précédents sont
                inclus automatiquement. Cochez les <strong>mentions du conseil de classe</strong> (distinctions
                et sanctions) pour chaque élève avant de générer : elles apparaissent comme cases cochées sur
                le PDF. L’enregistrement des moyennes en base passe par le{' '}
                <strong>circuit de validation</strong> (prof. principal → éducateur → directeur des
                études). La publication aux familles intervient après approbation.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Classe <span className="text-red-500">*</span>
            </label>
            <FilterDropdown
              options={[
                { value: '', label: 'Sélectionner une classe' },
                ...(classes || []).map((cls: any) => ({
                  value: cls.id,
                  label: `${cls.name} - ${cls.level}`,
                })),
              ]}
              selected={selectedClass}
              onChange={setSelectedClass}
              label="Classe"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Période <span className="text-red-500">*</span>
            </label>
            <FilterDropdown
              options={periods}
              selected={selectedPeriod}
              onChange={setSelectedPeriod}
              label="Période"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Année scolaire <span className="text-red-500">*</span>
            </label>
            <FilterDropdown
              options={academicYears}
              selected={selectedAcademicYear}
              onChange={setSelectedAcademicYear}
              label="Année scolaire"
            />
          </div>
        </div>

        {/* Preview */}
        {isLoadingData && (
          <div className="flex items-center justify-center py-8">
            <FiLoader className="w-6 h-6 animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Chargement des données...</span>
          </div>
        )}

        {reportCardStudents.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <FiUsers className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Aperçu</h3>
            </div>
            <p className="text-sm text-gray-700">
              {reportCardStudents.length} élève(s) trouvé(s) dans cette classe. Les bulletins seront générés pour tous les élèves.
            </p>
            {studentsWithoutGrades > 0 && (
              <p className="text-sm text-amber-800 mt-2 bg-amber-50 border border-amber-200 rounded-md p-2">
                {studentsWithoutGrades} élève(s) sans note pour <strong>{periodLabel}</strong> ({selectedAcademicYear}).
                Vérifiez l&apos;année et le trimestre, ou rattachez les notes au bon trimestre lors de la saisie.
              </p>
            )}
            {selectedClass && classes && (
              <p className="text-sm text-gray-600 mt-2">
                Classe: {classes.find((c: any) => c.id === selectedClass)?.name}
              </p>
            )}
          </div>
        )}

        {reportCardStudents.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">Mentions du conseil de classe</h3>
            <p className="text-xs text-gray-600 mb-3">
              Une distinction par élève, sanctions cumulables. Prérempli depuis le conseil de classe et le
              dossier disciplinaire s’ils existent.
            </p>
            <div className="max-h-64 overflow-auto space-y-3">
              {reportCardStudents.map((student: {
                studentId: string;
                user?: { firstName?: string; lastName?: string };
                average?: number;
              }) => {
                const draft = mentionsByStudent[student.studentId] ?? { distinction: '', sanctions: [] };
                const name = `${student.user?.lastName ?? ''} ${student.user?.firstName ?? ''}`.trim() || 'Élève';
                return (
                  <div key={student.studentId} className="rounded-lg bg-gray-50 p-3 text-sm">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <p className="font-semibold text-gray-900">{name}</p>
                      {typeof student.average === 'number' ? (
                        <span className="text-xs text-gray-500">{student.average.toFixed(2)}/20</span>
                      ) : null}
                    </div>
                    <p className="text-[11px] font-medium text-gray-500 mb-1">Distinctions</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                      <label className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={`distinction-${student.studentId}`}
                          checked={!draft.distinction}
                          onChange={() =>
                            setMentionsByStudent((prev) => ({
                              ...prev,
                              [student.studentId]: { ...draft, distinction: '' },
                            }))
                          }
                        />
                        Aucune
                      </label>
                      {REPORT_CARD_DISTINCTION_OPTIONS.map((label) => (
                        <label key={label} className="inline-flex items-center gap-1 text-xs">
                          <input
                            type="radio"
                            name={`distinction-${student.studentId}`}
                            checked={draft.distinction === label}
                            onChange={() =>
                              setMentionsByStudent((prev) => ({
                                ...prev,
                                [student.studentId]: { ...draft, distinction: label },
                              }))
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <p className="text-[11px] font-medium text-gray-500 mb-1">Sanctions</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {REPORT_CARD_SANCTION_OPTIONS.map((label) => (
                        <label key={label} className="inline-flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={draft.sanctions.includes(label)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...draft.sanctions, label]
                                : draft.sanctions.filter((item) => item !== label);
                              setMentionsByStudent((prev) => ({
                                ...prev,
                                [student.studentId]: { ...draft, sanctions: next },
                              }));
                            }}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {reportCardPayload && reportCardStudents.length === 0 && selectedClass && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <FiAlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Aucun élève trouvé dans cette classe pour la période sélectionnée.
              </p>
            </div>
          </div>
        )}

        <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 bg-gray-50/80 p-3">
          <input
            type="checkbox"
            className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
            checked={publishAfterSave}
            onChange={(e) => setPublishAfterSave(e.target.checked)}
          />
          <span>
            <span className="text-sm font-semibold text-gray-900">Publier les bulletins</span>
            <span className="block text-xs text-gray-600 mt-0.5">
              Sinon ils restent en brouillon : visibles uniquement dans l’administration jusqu’à publication manuelle.
            </span>
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={handleClose} disabled={isGenerating}>
            Annuler
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="bg-green-600 hover:bg-green-700"
          >
            {isGenerating ? (
              <>
                <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FiFileText className="w-4 h-4 mr-2" />
                Générer les bulletins
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GenerateReportCardModal;

