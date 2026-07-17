import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { 
  FiFileText, 
  FiDownload, 
  FiCalendar,
  FiAward,
  FiTrendingUp,
  FiSearch,
  FiFilter,
  FiAlertCircle,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChildReportCardsProps {
  studentId: string;
}

const ChildReportCards = ({ studentId }: ChildReportCardsProps) => {
  const [selectedReportCard, setSelectedReportCard] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  const { data: reportPayload, isLoading } = useQuery({
    queryKey: ['parent-child-report-cards', studentId],
    queryFn: () => parentApi.getChildReportCards(studentId),
  });

  const legacyList = Array.isArray(reportPayload);
  const reportCards = legacyList
    ? (reportPayload as any[])
    : ((reportPayload as { reportCards?: any[] } | undefined)?.reportCards ?? []);
  const tuitionBlock = legacyList
    ? undefined
    : (reportPayload as { tuitionBlock?: { active?: boolean; hiddenAcademicYears?: string[] } } | undefined)
        ?.tuitionBlock;

  const filteredReportCards = reportCards?.filter((card: any) => {
    if (filterPeriod !== 'all' && card.period !== filterPeriod) return false;
    if (filterYear !== 'all' && card.academicYear !== filterYear) return false;
    return true;
  }) || [];

  const periods: string[] = Array.from(
    new Set((reportCards as any[])?.map((c: any) => c.period) || []),
  ).sort() as string[];
  const academicYears: string[] = Array.from(
    new Set((reportCards as any[])?.map((c: any) => c.academicYear) || []),
  )
    .sort()
    .reverse() as string[];

  const exportToPDF = (reportCard: any) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const currentDate = new Date().toLocaleDateString('fr-FR');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(255, 102, 0);
    doc.text('BULLETIN SCOLAIRE', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Période: ${reportCard.period}`, 20, 35);
    doc.text(`Année scolaire: ${reportCard.academicYear}`, 20, 42);
    doc.text(`Date d'émission: ${currentDate}`, 20, 49);

    // Moyenne générale
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Moyenne Générale: ${reportCard.average.toFixed(2)}/20`, 105, 65, { align: 'center' });

    if (reportCard.rank) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rang: ${reportCard.rank}`, 105, 72, { align: 'center' });
    }

    // Commentaires
    if (reportCard.comments) {
      doc.setFontSize(11);
      doc.text('Commentaires:', 20, 85);
      doc.setFontSize(10);
      const splitComments = doc.splitTextToSize(reportCard.comments, 170);
      doc.text(splitComments, 20, 92);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Généré le ${currentDate}`, 105, 280, { align: 'center' });

    doc.save(`bulletin-${reportCard.period}-${reportCard.academicYear}.pdf`);
  };

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

      {/* Filtres */}
      {reportCards && reportCards.length > 0 && (
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

      {/* Liste des bulletins */}
      {filteredReportCards.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiFileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">
              {reportCards && reportCards.length === 0
                ? tuitionBlock?.active
                  ? 'Bulletins non disponibles'
                  : 'Aucun bulletin disponible'
                : 'Aucun bulletin trouvé avec ces filtres'}
            </p>
            <p className="text-sm">
              {reportCards && reportCards.length === 0
                ? tuitionBlock?.active
                  ? 'Les bulletins des années pour lesquelles la scolarité ou l\'inscription n\'est pas réglée ne sont pas affichés. Consultez l\'encadré ci-dessus et la section Paiements / Frais.'
                  : 'Les bulletins apparaîtront ici une fois générés par l\'administration'
                : 'Essayez avec d\'autres critères de filtrage'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReportCards.map((reportCard: any) => (
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
                  {reportCard.rank && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Rang</span>
                      <span className="text-lg font-bold text-gray-900">{reportCard.rank}</span>
                    </div>
                  )}
                </div>

                {reportCard.comments && (
                  <p className="text-sm text-gray-600 line-clamp-2">{reportCard.comments}</p>
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
                    onClick={() => exportToPDF(reportCard)}
                  >
                    <FiDownload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de détails */}
      {showDetailsModal && selectedReportCard && (
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
              {selectedReportCard.rank && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Rang</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedReportCard.rank}</p>
                </div>
              )}
            </div>

            {selectedReportCard.comments && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Commentaires</p>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selectedReportCard.comments}
                </p>
              </div>
            )}

            {selectedReportCard.publishedAt && (
              <div className="text-sm text-gray-600">
                Publié le: {format(new Date(selectedReportCard.publishedAt), 'dd MMMM yyyy', { locale: fr })}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="primary"
                onClick={() => exportToPDF(selectedReportCard)}
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Télécharger PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ChildReportCards;



