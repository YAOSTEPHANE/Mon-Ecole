import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { 
  FiFileText, 
  FiCalendar, 
  FiBook,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSearch,
  FiFilter,
  FiDownload
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChildAssignmentsProps {
  studentId: string;
  searchQuery?: string;
}

const ChildAssignments = ({ studentId, searchQuery = '' }: ChildAssignmentsProps) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['parent-child-assignments', studentId],
    queryFn: () => parentApi.getChildAssignments(studentId),
  });

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    
    let filtered = assignments;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a: any) => {
        const title = a.assignment?.title?.toLowerCase() || '';
        const description = a.assignment?.description?.toLowerCase() || '';
        const courseName = a.assignment?.course?.name?.toLowerCase() || '';
        return title.includes(query) || description.includes(query) || courseName.includes(query);
      });
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      const now = new Date();
      filtered = filtered.filter((a: any) => {
        const dueDate = new Date(a.assignment.dueDate);
        if (filterStatus === 'submitted') {
          return a.submitted;
        } else if (filterStatus === 'pending') {
          return !a.submitted && dueDate >= now;
        } else if (filterStatus === 'overdue') {
          return !a.submitted && dueDate < now;
        }
        return true;
      });
    }
    
    return filtered;
  }, [assignments, searchQuery, filterStatus]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Chargement des devoirs...</p>
        </div>
      </Card>
    );
  }

  const totalAssignments = assignments?.length || 0;
  const submittedCount = assignments?.filter((a: any) => a.submitted).length || 0;
  const pendingCount = assignments?.filter((a: any) => {
    if (a.submitted) return false;
    return new Date(a.assignment.dueDate) >= new Date();
  }).length || 0;
  const overdueCount = assignments?.filter((a: any) => {
    if (a.submitted) return false;
    return new Date(a.assignment.dueDate) < new Date();
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Indicateur de recherche */}
      {searchQuery && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200">
          <div className="flex items-center space-x-3">
            <FiSearch className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-semibold text-gray-900">
                Recherche: <span className="text-orange-600">"{searchQuery}"</span>
              </p>
              <p className="text-sm text-gray-600">
                {filteredAssignments.length} devoir(s) trouvé(s)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total devoirs</p>
              <p className="text-2xl font-bold text-gray-900">{totalAssignments}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FiFileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rendus</p>
              <p className="text-2xl font-bold text-green-600">{submittedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">À faire</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <FiClock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En retard</p>
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <FiXCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <FiFilter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtrer par statut:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Tous</option>
              <option value="submitted">Rendus</option>
              <option value="pending">À faire</option>
              <option value="overdue">En retard</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Liste des devoirs */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiFileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">Aucun devoir trouvé</p>
            <p className="text-sm">
              {searchQuery || filterStatus !== 'all' 
                ? 'Essayez avec d\'autres critères de recherche'
                : 'Aucun devoir assigné pour le moment'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((studentAssignment: any) => {
            const assignment = studentAssignment.assignment;
            const dueDate = new Date(assignment.dueDate);
            const now = new Date();
            const isOverdue = !studentAssignment.submitted && dueDate < now;
            const isUpcoming = !studentAssignment.submitted && dueDate >= now;

            return (
              <Card key={studentAssignment.id} hover>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {assignment.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FiBook className="w-4 h-4" />
                        <span>{assignment.course?.name}</span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        studentAssignment.submitted ? 'success' :
                        isOverdue ? 'danger' :
                        isUpcoming ? 'secondary' : 'warning'
                      }
                      size="sm"
                    >
                      {studentAssignment.submitted ? 'Rendu' :
                       isOverdue ? 'En retard' :
                       isUpcoming ? 'À faire' : 'En cours'}
                    </Badge>
                  </div>

                  {assignment.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FiCalendar className="w-4 h-4" />
                      <span>
                        Échéance: {format(dueDate, 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    {isOverdue && (
                      <div className="flex items-center space-x-2 text-sm text-red-600">
                        <FiClock className="w-4 h-4" />
                        <span>En retard</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedAssignment(studentAssignment);
                      setShowDetailsModal(true);
                    }}
                    className="w-full"
                  >
                    Voir les détails
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de détails */}
      {showDetailsModal && selectedAssignment && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAssignment(null);
          }}
          title={selectedAssignment.assignment.title}
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Cours</p>
              <p className="text-gray-900">{selectedAssignment.assignment.course?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Date d'échéance</p>
              <p className="text-gray-900">
                {format(new Date(selectedAssignment.assignment.dueDate), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
            {selectedAssignment.assignment.description && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {selectedAssignment.assignment.description}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Statut</p>
              <Badge
                variant={selectedAssignment.submitted ? 'success' : 'secondary'}
                size="sm"
              >
                {selectedAssignment.submitted ? 'Rendu' : 'Non rendu'}
              </Badge>
            </div>
            {selectedAssignment.assignment.attachments && selectedAssignment.assignment.attachments.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Pièces jointes</p>
                <div className="space-y-2">
                  {selectedAssignment.assignment.attachments.map((attachment: string, index: number) => (
                    <a
                      key={index}
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                    >
                      <FiDownload className="w-4 h-4" />
                      <span className="text-sm">Fichier {index + 1}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Alerte pour devoirs en retard */}
      {overdueCount > 0 && (
        <Card className="border-l-4 border-red-500">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <FiXCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Devoirs en retard</h3>
              <p className="text-sm text-gray-700">
                Votre enfant a {overdueCount} devoir(s) en retard. 
                Veuillez l'encourager à les terminer rapidement.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ChildAssignments;



