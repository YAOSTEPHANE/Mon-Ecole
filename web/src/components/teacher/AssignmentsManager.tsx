import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import { 
  FiFileText, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch,
  FiFilter,
  FiCalendar,
  FiBook,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiPaperclip,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AssignmentAttachmentsField, {
  type AssignmentAttachmentItem,
} from '../assignments/AssignmentAttachmentsField';

interface AssignmentsManagerProps {
  searchQuery?: string;
}

const AssignmentsManager = ({ searchQuery = '' }: AssignmentsManagerProps) => {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: teacherApi.getCourses,
  });

  // Fetch assignments for selected course
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher-course-assignments', selectedCourse],
    queryFn: () => teacherApi.getCourseAssignments(selectedCourse!),
    enabled: !!selectedCourse,
  });

  // Auto-select first course
  useEffect(() => {
    if (courses && courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0].id);
    }
  }, [courses, selectedCourse]);

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    
    let filtered = assignments;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a: any) => {
        const title = a.title?.toLowerCase() || '';
        const description = a.description?.toLowerCase() || '';
        return title.includes(query) || description.includes(query);
      });
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      const now = new Date();
      filtered = filtered.filter((a: any) => {
        const dueDate = new Date(a.dueDate);
        if (filterStatus === 'upcoming') {
          return dueDate > now;
        } else if (filterStatus === 'overdue') {
          return dueDate < now;
        } else if (filterStatus === 'completed') {
          // Check if all students have submitted
          return a.students?.every((s: any) => s.submitted) || false;
        }
        return true;
      });
    }
    
    return filtered;
  }, [assignments, searchQuery, filterStatus]);

  // Delete mutation (if API supports it)
  const handleDelete = (id: string) => {
    // Note: Delete endpoint may not exist in teacher routes
    toast.error('La suppression des devoirs n\'est pas disponible pour les enseignants');
  };

  const selectedCourseData = courses?.find((c: any) => c.id === selectedCourse);

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
          <FiFileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucun cours assigné</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Selection */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des Devoirs</h2>
            <p className="text-gray-600">Créez et gérez les devoirs pour vos cours</p>
          </div>
          <div className="flex items-center space-x-2">
            <select
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
            {selectedCourse && (
              <Button
                onClick={() => {
                  setEditingAssignment(null);
                  setShowAddModal(true);
                }}
                variant="primary"
                size="md"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Créer un devoir
              </Button>
            )}
          </div>
        </div>
      </Card>

      {selectedCourse && (
        <>
          {/* Filters */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-2">
                <FiFilter className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtrer par statut:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">Tous</option>
                  <option value="upcoming">À venir</option>
                  <option value="overdue">En retard</option>
                  <option value="completed">Terminés</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                {filteredAssignments.length} devoir(s) trouvé(s)
              </div>
            </div>
          </Card>

          {/* Assignments List */}
          {assignmentsLoading ? (
            <Card>
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p className="mt-4 text-gray-600">Chargement des devoirs...</p>
              </div>
            </Card>
          ) : filteredAssignments.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <FiFileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Aucun devoir trouvé</p>
                <Button
                  onClick={() => {
                    setEditingAssignment(null);
                    setShowAddModal(true);
                  }}
                  variant="primary"
                  size="sm"
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  Créer le premier devoir
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map((assignment: any) => {
                const dueDate = new Date(assignment.dueDate);
                const now = new Date();
                const isOverdue = dueDate < now;
                const isUpcoming = dueDate > now;
                const submittedCount = assignment.students?.filter((s: any) => s.submitted).length || 0;
                const totalStudents = assignment.students?.length || 0;
                const isCompleted = submittedCount === totalStudents && totalStudents > 0;

                return (
                  <Card key={assignment.id} hover className="overflow-hidden">
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
                            isCompleted ? 'success' :
                            isOverdue ? 'danger' :
                            isUpcoming ? 'secondary' : 'warning'
                          }
                          size="sm"
                        >
                          {isCompleted ? 'Terminé' :
                           isOverdue ? 'En retard' :
                           isUpcoming ? 'À venir' : 'En cours'}
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
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FiUsers className="w-4 h-4" />
                          <span>
                            {submittedCount}/{totalStudents} élèves ont rendu
                          </span>
                        </div>
                        {assignment.attachments?.length > 0 && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <FiPaperclip className="w-4 h-4" />
                            <span>
                              {assignment.attachments.length} pièce
                              {assignment.attachments.length > 1 ? 's' : ''} jointe
                              {assignment.attachments.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {totalStudents > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Progression</span>
                            <span>{Math.round((submittedCount / totalStudents) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isCompleted ? 'bg-green-500' :
                                submittedCount > 0 ? 'bg-blue-500' : 'bg-gray-300'
                              }`}
                              style={{ width: `${(submittedCount / totalStudents) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 pt-2 border-t">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingAssignment(assignment);
                            setShowAddModal(true);
                          }}
                        >
                          <FiEdit2 className="w-4 h-4 mr-1" />
                          Voir détails
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Assignment Modal */}
      {showAddModal && (
        <AddAssignmentModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingAssignment(null);
          }}
          courseId={selectedCourse!}
          courseData={selectedCourseData}
          assignment={editingAssignment}
        />
      )}
    </div>
  );
};

// Add/Edit Assignment Modal Component
interface AddAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseData: any;
  assignment?: any;
}

const AddAssignmentModal = ({ isOpen, onClose, courseId, courseData, assignment }: AddAssignmentModalProps) => {
  const queryClient = useQueryClient();
  const isEditMode = !!assignment;

  const toAttachmentItems = (urls: string[] | undefined): AssignmentAttachmentItem[] =>
    (urls ?? []).map((url, i) => ({ url, name: `Fichier ${i + 1}` }));

  const [formData, setFormData] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    dueDate: assignment?.dueDate
      ? new Date(assignment.dueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    attachmentItems: toAttachmentItems(assignment?.attachments),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => teacherApi.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course-assignments'] });
      toast.success('Devoir créé avec succès');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la création');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.dueDate) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    const submitData: any = {
      courseId,
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate,
      attachments: formData.attachmentItems.map((a) => a.url),
    };

    createMutation.mutate(submitData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Détails du devoir' : 'Créer un devoir'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titre *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
            placeholder="Ex: Devoir de mathématiques - Chapitre 5"
            disabled={isEditMode}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            rows={4}
            placeholder="Description détaillée du devoir..."
            disabled={isEditMode}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date d'échéance *
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
            disabled={isEditMode}
          />
        </div>

        {!isEditMode ? (
          <AssignmentAttachmentsField
            value={formData.attachmentItems}
            onChange={(attachmentItems) => setFormData((prev) => ({ ...prev, attachmentItems }))}
          />
        ) : (
          <AssignmentAttachmentsField
            value={toAttachmentItems(assignment?.attachments)}
            onChange={() => {}}
            disabled
          />
        )}

        {isEditMode && assignment?.students && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rendu des élèves
            </label>
            <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
              {assignment.students.map((studentAssignment: any) => (
                <div
                  key={studentAssignment.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-900">
                    {studentAssignment.student?.user?.firstName} {studentAssignment.student?.user?.lastName}
                  </span>
                  <Badge
                    variant={studentAssignment.submitted ? 'success' : 'secondary'}
                    size="sm"
                  >
                    {studentAssignment.submitted ? (
                      <>
                        <FiCheckCircle className="w-3 h-3 mr-1" />
                        Rendu
                      </>
                    ) : (
                      <>
                        <FiXCircle className="w-3 h-3 mr-1" />
                        Non rendu
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {isEditMode ? 'Fermer' : 'Annuler'}
          </Button>
          {!isEditMode && (
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Création...' : 'Créer le devoir'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default AssignmentsManager;
