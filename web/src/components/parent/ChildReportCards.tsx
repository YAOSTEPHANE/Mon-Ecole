import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parentApi } from '../../services/api';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import {
  FiFileText,
  FiDownload,
  FiFilter,
  FiAlertCircle,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import {
  downloadOfficialReportCardPdf,
  type OfficialReportCardResponse,
} from '@/lib/officialReportCardClient';

interface ChildReportCardsProps {
  studentId: string;
}

type ReportCardRow = {
  id: string;
  period: string;
  academicYear: string;
  average: number;
  rank?: number | null;
  comments?: string | null;
  publishedAt?: string | null;
  parentAcknowledgedAt?: string | null;
  parentAckSignature?: string | null;
};

const ChildReportCards = ({ studentId }: ChildReportCardsProps) => {
  const qc = useQueryClient();
  const { branding, navigationLogoAbsolute, loginLogoAbsolute } = useAppBranding();
  const [selectedReportCard, setSelectedReportCard] = useState<ReportCardRow | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [ackSignature, setAckSignature] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  const { data: reportPayload, isLoading } = useQuery({
    queryKey: ['parent-child-report-cards', studentId],
    queryFn: () => parentApi.getChildReportCards(studentId),
  });

  const { data: official, isLoading: officialLoading } = useQuery({
    queryKey: ['parent-official-report-card', studentId, selectedReportCard?.id],
    queryFn: () => parentApi.getChildOfficialReportCard(studentId, selectedReportCard!.id) as Promise<OfficialReportCardResponse>,
    enabled: showDetailsModal && Boolean(selectedReportCard?.id),
  });

  const acknowledgeMut = useMutation({
    mutationFn: (reportCardId: string) =>
      parentApi.acknowledgeReportCard(studentId, reportCardId, ackSignature.trim()),
    onSuccess: () => {
      toast.success('Accusé de réception enregistré');
      setAckSignature('');
      void qc.invalidateQueries({ queryKey: ['parent-child-report-cards', studentId] });
      setShowDetailsModal(false);
      setSelectedReportCard(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const legacyList = Array.isArray(reportPayload);
  const reportCards: ReportCardRow[] = legacyList
    ? (reportPayload as ReportCardRow[])
    : ((reportPayload as { reportCards?: ReportCardRow[] } | undefined)?.reportCards ?? []);
  const tuitionBlock = legacyList
    ? undefined
    : (reportPayload as { tuitionBlock?: { active?: boolean; hiddenAcademicYears?: string[] } } | undefined)
        ?.tuitionBlock;

  const filteredReportCards = reportCards.filter((card) => {
    if (filterPeriod !== 'all' && card.period !== filterPeriod) return false;
    if (filterYear !== 'all' && card.academicYear !== filterYear) return false;
    return true;
  });

  const periods: string[] = Array.from(new Set(reportCards.map((c) => c.period))).sort();
  const academicYears: string[] = Array.from(new Set(reportCards.map((c) => c.academicYear)))
    .sort()
    .reverse();

  const exportOfficialPdf = async (reportCard: ReportCardRow) => {
    setPdfBusyId(reportCard.id);
    try {
      const payload = (await parentApi.getChildOfficialReportCard(
        studentId,
        reportCard.id,
      )) as OfficialReportCardResponse;
      await downloadOfficialReportCardPdf(payload, branding, {
        navigationLogoAbsolute,
        loginLogoAbsolute,
      });
    } catch (error) {
      const axiosMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(axiosMessage || (error instanceof Error ? error.message : 'Téléchargement impossible'));
    } finally {
      setPdfBusyId(null);
    }
  };

  const officialCourses = official?.student.allCourses ?? [];
  const officialAverages = official?.student.courseAverages ?? {};

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Chargement des bulletins...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {tuitionBlock?.active && (tuitionBlock.hiddenAcademicYears?.length ?? 0) > 0 && (
        <Card className="border-l-4 border-amber-500 bg-amber-50/90 ring-1 ring-amber-200/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <FiAlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="text-sm text-amber-950">
              <p className="font-semibold text-amber-900 mb-1">Accès aux bulletins limité</p>
              <p className="text-amber-900/90 leading-relaxed">
                Des frais d&apos;inscription ou de scolarité restent impayés pour :{' '}
                <span className="font-medium">{tuitionBlock.hiddenAcademicYears?.join(', ')}</span>.
                Les bulletins de ces années ne sont plus visibles après la clôture de l&apos;année scolaire.
                Régularisez la situation depuis la section <strong>Paiements / Frais</strong>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {reportCards.length > 0 && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <FiFilter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtrer par période:</span>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">Toutes</option>
                {periods.map((period) => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Année scolaire:</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">Toutes</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {filteredReportCards.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiFileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">
              {reportCards.length === 0
                ? tuitionBlock?.active
                  ? 'Bulletins non disponibles'
                  : 'Aucun bulletin disponible'
                : 'Aucun bulletin trouvé avec ces filtres'}
            </p>
            <p className="text-sm">
              {reportCards.length === 0
                ? tuitionBlock?.active
                  ? 'Les bulletins des années pour lesquelles la scolarité ou l\'inscription n\'est pas réglée ne sont pas affichés. Consultez l\'encadré ci-dessus et la section Paiements / Frais.'
                  : 'Les bulletins apparaîtront ici une fois générés par l\'administration'
                : 'Essayez avec d\'autres critères de filtrage'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReportCards.map((reportCard) => (
            <Card key={reportCard.id} hover>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{reportCard.period}</h3>
                    <p className="text-sm text-gray-600">{reportCard.academicYear}</p>
                  </div>
                  <Badge
                    variant={
                      reportCard.average >= 16 ? 'success' :
                      reportCard.average >= 12 ? 'secondary' :
                      reportCard.average >= 10 ? 'warning' : 'danger'
                    }
                    size="sm"
                  >
                    {reportCard.average.toFixed(2)}/20
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Moyenne</span>
                    <span className={`text-lg font-bold ${
                      reportCard.average >= 16 ? 'text-green-600' :
                      reportCard.average >= 12 ? 'text-blue-600' :
                      reportCard.average >= 10 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {reportCard.average.toFixed(2)}/20
                    </span>
                  </div>
                  {reportCard.rank ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Rang</span>
                      <span className="text-lg font-bold text-gray-900">{reportCard.rank}</span>
                    </div>
                  ) : null}
                </div>

                {reportCard.comments ? (
                  <p className="text-sm text-gray-600 line-clamp-2">{reportCard.comments}</p>
                ) : null}

                {reportCard.parentAcknowledgedAt ? (
                  <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1">
                    Reçu le {format(new Date(reportCard.parentAcknowledgedAt), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                    Accusé de réception en attente
                  </p>
                )}

                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedReportCard(reportCard);
                      setShowDetailsModal(true);
                    }}
                    className="flex-1"
                  >
                    Voir détails
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={pdfBusyId === reportCard.id}
                    onClick={() => void exportOfficialPdf(reportCard)}
                  >
                    <FiDownload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showDetailsModal && selectedReportCard ? (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReportCard(null);
          }}
          title={`Bulletin - ${selectedReportCard.period}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Période</p>
                <p className="font-semibold text-gray-900">{selectedReportCard.period}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Année scolaire</p>
                <p className="font-semibold text-gray-900">{selectedReportCard.academicYear}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Moyenne</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedReportCard.average.toFixed(2)}/20
                </p>
              </div>
              {selectedReportCard.rank ? (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Rang</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedReportCard.rank}</p>
                </div>
              ) : null}
            </div>

            {officialLoading ? (
              <p className="text-sm text-gray-500">Chargement des matières…</p>
            ) : officialCourses.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Notes par matière</p>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {officialCourses.map((course) => {
                    const avg = officialAverages[course.id]?.average;
                    return (
                      <div key={course.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{course.name}</p>
                          {course.teacherName ? (
                            <p className="text-xs text-gray-500">{course.teacherName}</p>
                          ) : null}
                        </div>
                        <span className="font-bold text-gray-900">
                          {typeof avg === 'number' ? `${avg.toFixed(2)}/20` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {official?.student.absences ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-gray-600">Absences : <strong>{official.student.absences.total}</strong></p>
                <p className="text-gray-600">Retards : <strong>{official.student.absences.late}</strong></p>
              </div>
            ) : null}

            {selectedReportCard.comments ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Commentaires</p>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selectedReportCard.comments}
                </p>
              </div>
            ) : null}

            {selectedReportCard.publishedAt ? (
              <div className="text-sm text-gray-600">
                Publié le: {format(new Date(selectedReportCard.publishedAt), 'dd MMMM yyyy', { locale: fr })}
              </div>
            ) : null}

            {selectedReportCard.parentAcknowledgedAt ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
                Accusé de réception signé par <strong>{selectedReportCard.parentAckSignature}</strong> le{' '}
                {format(new Date(selectedReportCard.parentAcknowledgedAt), 'dd MMMM yyyy à HH:mm', {
                  locale: fr,
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-2">
                <p className="text-sm font-medium text-amber-900">
                  Confirmer la réception du bulletin (signature électronique)
                </p>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Votre nom complet"
                  value={ackSignature}
                  onChange={(e) => setAckSignature(e.target.value)}
                  aria-label="Signature parent"
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={ackSignature.trim().length < 2 || acknowledgeMut.isPending}
                  onClick={() => acknowledgeMut.mutate(selectedReportCard.id)}
                >
                  Accuser réception
                </Button>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="primary"
                disabled={pdfBusyId === selectedReportCard.id}
                onClick={() => void exportOfficialPdf(selectedReportCard)}
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Télécharger le bulletin officiel
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export default ChildReportCards;
