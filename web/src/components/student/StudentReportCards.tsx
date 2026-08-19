'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiAlertCircle, FiDownload, FiFileText, FiFilter } from 'react-icons/fi';
import { studentApi } from '../../services/api';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import {
  downloadOfficialReportCardPdf,
  type OfficialReportCardResponse,
} from '@/lib/officialReportCardClient';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

type ReportCardRow = {
  id: string;
  period: string;
  academicYear: string;
  average: number;
  rank?: number | null;
  comments?: string | null;
  publishedAt?: string | null;
};

const StudentReportCards = () => {
  const { branding, navigationLogoAbsolute, loginLogoAbsolute } = useAppBranding();
  const [selectedReportCard, setSelectedReportCard] = useState<ReportCardRow | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  const { data: reportPayload, isLoading } = useQuery({
    queryKey: ['student-report-cards-list'],
    queryFn: () => studentApi.getReportCards(),
  });

  const { data: official, isLoading: officialLoading } = useQuery({
    queryKey: ['student-official-report-card', selectedReportCard?.id],
    queryFn: () =>
      studentApi.getOfficialReportCard(selectedReportCard!.id) as Promise<OfficialReportCardResponse>,
    enabled: showDetailsModal && Boolean(selectedReportCard?.id),
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
      const payload = (await studentApi.getOfficialReportCard(
        reportCard.id,
      )) as OfficialReportCardResponse;
      await downloadOfficialReportCardPdf(payload, branding, {
        navigationLogoAbsolute,
        loginLogoAbsolute,
      });
    } catch (error) {
      const axiosMessage =
        typeof error === 'object' && error !== null && 'response' in error
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
        <div className="py-12 text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-violet-600" />
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <FiAlertCircle className="h-5 w-5 text-amber-700" />
            </div>
            <div className="text-sm text-amber-950">
              <p className="mb-1 font-semibold text-amber-900">Accès aux bulletins limité</p>
              <p className="leading-relaxed text-amber-900/90">
                Des frais d&apos;inscription ou de scolarité restent impayés pour :{' '}
                <span className="font-medium">{tuitionBlock.hiddenAcademicYears?.join(', ')}</span>.
                Les bulletins de ces années ne sont plus visibles. Régularisez la situation depuis{' '}
                <strong>Paiements</strong>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {reportCards.length > 0 && (
        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-2">
              <FiFilter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtrer par période :</span>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">Toutes</option>
                {periods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Année scolaire :</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">Toutes</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {filteredReportCards.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-gray-500">
            <FiFileText className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="mb-2 text-lg">
              {reportCards.length === 0
                ? tuitionBlock?.active
                  ? 'Bulletins non disponibles'
                  : 'Aucun bulletin disponible'
                : 'Aucun bulletin trouvé avec ces filtres'}
            </p>
            <p className="text-sm">
              {reportCards.length === 0
                ? tuitionBlock?.active
                  ? 'Les bulletins des années pour lesquelles la scolarité n’est pas réglée ne sont pas affichés.'
                  : 'Les bulletins publiés par l’administration apparaîtront ici.'
                : 'Essayez avec d’autres critères de filtrage'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                      reportCard.average >= 16
                        ? 'success'
                        : reportCard.average >= 12
                          ? 'secondary'
                          : reportCard.average >= 10
                            ? 'warning'
                            : 'danger'
                    }
                    size="sm"
                  >
                    {reportCard.average.toFixed(2)}/20
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-gray-600">Moyenne</span>
                  <span className="text-lg font-bold text-gray-900">{reportCard.average.toFixed(2)}/20</span>
                </div>
                {reportCard.rank ? (
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <span className="text-sm text-gray-600">Rang</span>
                    <span className="text-lg font-bold text-gray-900">{reportCard.rank}</span>
                  </div>
                ) : null}

                {reportCard.comments ? (
                  <p className="line-clamp-2 text-sm text-gray-600">{reportCard.comments}</p>
                ) : null}

                <div className="flex items-center space-x-2 border-t pt-2">
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
                    <FiDownload className="h-4 w-4" />
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
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="mb-1 text-sm text-gray-600">Période</p>
                <p className="font-semibold text-gray-900">{selectedReportCard.period}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="mb-1 text-sm text-gray-600">Année scolaire</p>
                <p className="font-semibold text-gray-900">{selectedReportCard.academicYear}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3">
                <p className="mb-1 text-sm text-gray-600">Moyenne</p>
                <p className="text-2xl font-bold text-gray-900">{selectedReportCard.average.toFixed(2)}/20</p>
              </div>
              {selectedReportCard.rank ? (
                <div className="rounded-lg bg-orange-50 p-3">
                  <p className="mb-1 text-sm text-gray-600">Rang</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedReportCard.rank}</p>
                </div>
              ) : null}
            </div>

            {officialLoading ? (
              <p className="text-sm text-gray-500">Chargement des matières…</p>
            ) : officialCourses.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Notes par matière</p>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {officialCourses.map((course) => {
                    const avg = officialAverages[course.id]?.average;
                    return (
                      <div key={course.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
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
                <p className="text-gray-600">
                  Absences : <strong>{official.student.absences.total}</strong>
                </p>
                <p className="text-gray-600">
                  Retards : <strong>{official.student.absences.late}</strong>
                </p>
              </div>
            ) : null}

            {selectedReportCard.comments ? (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Commentaires</p>
                <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-gray-900">
                  {selectedReportCard.comments}
                </p>
              </div>
            ) : null}

            {selectedReportCard.publishedAt ? (
              <div className="text-sm text-gray-600">
                Publié le : {format(new Date(selectedReportCard.publishedAt), 'dd MMMM yyyy', { locale: fr })}
              </div>
            ) : null}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="primary"
                disabled={pdfBusyId === selectedReportCard.id}
                onClick={() => void exportOfficialPdf(selectedReportCard)}
              >
                <FiDownload className="mr-2 h-4 w-4" />
                Télécharger le bulletin officiel
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export default StudentReportCards;
