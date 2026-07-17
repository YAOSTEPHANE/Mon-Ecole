import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import { 
  FiShield, 
  FiPlus, 
  FiEdit2, 
  FiSearch,
  FiFilter,
  FiUser,
  FiCalendar,
  FiAward
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TeacherConduct = () => {
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Trimestre 1');
  const [academicYear, setAcademicYear] = useState<string>(new Date().getFullYear().toString());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConduct, setEditingConduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conduct evaluations
  const { data: conducts, isLoading: conductsLoading } = useQuery({
    queryKey: ['teacher-conduct', selectedPeriod, academicYear],
    queryFn: () => teacherApi.getConduct({ period: selectedPeriod, academicYear }),
  });

  // Filter conducts
  const filteredConducts = useMemo(() => {
    if (!conducts) return [];
    
    if (!searchQuery) return conducts;
    
    const query = searchQuery.toLowerCase();
    return conducts.filter((c: any) => {
      const studentName = `${c.student?.user?.firstName || ''} ${c.student?.user?.lastName || ''}`.toLowerCase();
      return studentName.includes(query);
    });
  }, [conducts, searchQuery]);

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingConduct) {
        return teacherApi.updateConduct(editingConduct.id, data);
      }
      return teacherApi.createConduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-conduct'] });
      toast.success(editingConduct ? 'Évaluation modifiée avec succès' : 'Évaluation créée avec succès');
      setShowAddModal(false);
      setEditingConduct(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
    },
  });

  const periods = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Semestre 1', 'Semestre 2', 'Année complète'];
  const currentYear = new Date().getFullYear();
  const academicYears = Array.from({ length: 3 }, (_, i) => (currentYear - 1 + i).toString());

  if (conductsLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Chargement des évaluations...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Évaluation de la Conduite</h2>
            <p className="text-gray-600">Évaluez la conduite des élèves de vos classes (Professeur Principal)</p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}-{parseInt(year) + 1}
                </option>
              ))}
            </select>
            <Button
              onClick={() => {
                setEditingConduct(null);
                setShowAddModal(true);
              }}
              variant="primary"
              size="md"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Nouvelle évaluation
            </Button>
          </div>
        </div>
      </Card>

      {/* Search */}
      <Card>
        <div className="flex items-center space-x-2">
          <FiSearch className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un élève..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </Card>

      {/* Conducts List */}
      {filteredConducts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FiShield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Aucune évaluation trouvée</p>
            <Button
              onClick={() => {
                setEditingConduct(null);
                setShowAddModal(true);
              }}
              variant="primary"
              size="sm"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Créer la première évaluation
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConducts.map((conduct: any) => (
            <Card key={conduct.id} hover>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {conduct.student?.user?.firstName} {conduct.student?.user?.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {conduct.student?.class?.name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      conduct.average >= 16 ? 'success' :
                      conduct.average >= 12 ? 'secondary' :
                      conduct.average >= 10 ? 'warning' : 'danger'
                    }
                    size="sm"
                  >
                    {conduct.average.toFixed(1)}/20
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Ponctualité</p>
                    <p className="text-lg font-bold text-blue-600">{conduct.punctuality}/20</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Respect</p>
                    <p className="text-lg font-bold text-green-600">{conduct.respect}/20</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Participation</p>
                    <p className="text-lg font-bold text-purple-600">{conduct.participation}/20</p>
                  </div>
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Comportement</p>
                    <p className="text-lg font-bold text-orange-600">{conduct.behavior}/20</p>
                  </div>
                </div>

                {conduct.comments && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{conduct.comments}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-gray-500">
                    Évalué par: {conduct.evaluatedBy?.firstName} {conduct.evaluatedBy?.lastName}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingConduct(conduct);
                      setShowAddModal(true);
                    }}
                  >
                    <FiEdit2 className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Conduct Modal */}
      {showAddModal && (
        <AddConductModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingConduct(null);
          }}
          period={selectedPeriod}
          academicYear={academicYear}
          conduct={editingConduct}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
};

// Add/Edit Conduct Modal Component
interface AddConductModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: string;
  academicYear: string;
  conduct?: any;
  onSave: (data: any) => void;
  isLoading: boolean;
}

const AddConductModal = ({ isOpen, onClose, period, academicYear, conduct, onSave, isLoading }: AddConductModalProps) => {
  const isEditMode = !!conduct;

  const [formData, setFormData] = useState({
    studentId: conduct?.studentId || '',
    punctuality: conduct?.punctuality?.toString() || '10',
    respect: conduct?.respect?.toString() || '10',
    participation: conduct?.participation?.toString() || '10',
    behavior: conduct?.behavior?.toString() || '10',
    comments: conduct?.comments || '',
  });

  // Fetch courses to get students (only for principal teachers)
  const { data: courses } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: teacherApi.getCourses,
    enabled: isOpen && !isEditMode,
  });

  // Get students from all classes where teacher is principal
  const students = useMemo(() => {
    if (!courses) return [];
    const allStudents: any[] = [];
    courses.forEach((course: any) => {
      if (course.class?.students) {
        course.class.students.forEach((student: any) => {
          if (!allStudents.find(s => s.id === student.id)) {
            allStudents.push(student);
          }
        });
      }
    });
    return allStudents;
  }, [courses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId) {
      toast.error('Veuillez sélectionner un élève');
      return;
    }

    const submitData: any = {
      studentId: formData.studentId,
      period,
      academicYear,
      punctuality: parseFloat(formData.punctuality),
      respect: parseFloat(formData.respect),
      participation: parseFloat(formData.participation),
      behavior: parseFloat(formData.behavior),
      ...(formData.comments && { comments: formData.comments }),
    };

    onSave(submitData);
  };

  const average = (
    parseFloat(formData.punctuality) +
    parseFloat(formData.respect) +
    parseFloat(formData.participation) +
    parseFloat(formData.behavior)
  ) / 4;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Modifier l\'évaluation' : 'Nouvelle évaluation de conduite'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEditMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Élève *
            </label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="">Sélectionner un élève</option>
              {students.map((student: any) => (
                <option key={student.id} value={student.id}>
                  {student.user.firstName} {student.user.lastName} - {student.class?.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ponctualité (0-20)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={formData.punctuality}
              onChange={(e) => setFormData({ ...formData, punctuality: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Respect (0-20)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={formData.respect}
              onChange={(e) => setFormData({ ...formData, respect: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Participation (0-20)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={formData.participation}
              onChange={(e) => setFormData({ ...formData, participation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comportement (0-20)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={formData.behavior}
              onChange={(e) => setFormData({ ...formData, behavior: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        </div>

        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Moyenne:</span>
            <span className="text-lg font-bold text-green-600">{average.toFixed(2)}/20</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commentaires
          </label>
          <textarea
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            rows={3}
            placeholder="Commentaires optionnels..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? 'Enregistrement...' : isEditMode ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TeacherConduct;



