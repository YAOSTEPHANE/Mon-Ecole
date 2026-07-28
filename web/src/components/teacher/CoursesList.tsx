import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teacherApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { FiBook, FiUsers, FiClipboard, FiClock, FiUser, FiSearch, FiEye } from 'react-icons/fi';

interface CoursesListProps {
  searchQuery?: string;
}

const CoursesList = ({ searchQuery = '' }: CoursesListProps) => {
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => teacherApi.getCourses(),
  });

  // Filter courses
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (!searchQuery) return courses;
    
    const query = searchQuery.toLowerCase();
    return courses.filter((course: any) => {
      const courseName = course.name?.toLowerCase() || '';
      const className = course.class?.name?.toLowerCase() || '';
      const code = course.code?.toLowerCase() || '';
      return courseName.includes(query) || className.includes(query) || code.includes(query);
    });
  }, [courses, searchQuery]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement des cours...</p>
        </div>
      </Card>
    );
  }

  const courseIcons = [
    '📐', '📚', '🌍', '🔬', '🎨', '💻', '🏃', '🎵', '🔬', '🌐'
  ];

  const handleViewDetails = (course: any) => {
    setSelectedCourse(course);
    setShowDetailsModal(true);
  };

  if (isLoading) {
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
          <FiBook className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucun cours assigné</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {searchQuery && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center space-x-3">
            <FiSearch className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-gray-900">
                Recherche: <span className="text-green-600">"{searchQuery}"</span>
              </p>
              <p className="text-sm text-gray-600">
                {filteredCourses.length} cours trouvé(s)
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Mes Cours</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course: any, index: number) => {
            const studentCount = course.class?.students?.length || 0;
            return (
              <Card key={course.id} hover className="overflow-hidden transform transition-all hover:scale-105">
                <div className="relative h-32 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 -m-6 mb-4 flex items-center justify-center">
                  <span className="text-6xl opacity-30">{courseIcons[index % courseIcons.length]}</span>
                  <div className="absolute inset-0 bg-black/10"></div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900 mb-1">{course.name}</h3>
                    <p className="text-sm text-gray-500">Code: {course.code}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FiBook className="w-4 h-4" />
                      <span>{course.class.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FiUsers className="w-4 h-4" />
                      <span>{studentCount} élève(s)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1 text-blue-600" title="Notes">
                        <FiClipboard className="w-4 h-4" />
                        <span>{course._count.grades}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-orange-600" title="Absences">
                        <FiUsers className="w-4 h-4" />
                        <span>{course._count.absences}</span>
                      </div>
                    </div>
                    <Badge variant="success" size="sm">
                      Actif
                    </Badge>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleViewDetails(course)}
                    className="w-full"
                  >
                    <FiEye className="w-4 h-4 mr-2" />
                    Voir les détails
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Course Details Modal */}
      {showDetailsModal && selectedCourse && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCourse(null);
          }}
          title={`${selectedCourse.name} - ${selectedCourse.class.name}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Code</p>
                <p className="font-semibold text-gray-900">{selectedCourse.code}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Élèves</p>
                <p className="font-semibold text-gray-900">
                  {selectedCourse.class?.students?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Notes</p>
                <p className="font-semibold text-gray-900">{selectedCourse._count.grades}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Absences</p>
                <p className="font-semibold text-gray-900">{selectedCourse._count.absences}</p>
              </div>
            </div>

            {selectedCourse.class?.students && selectedCourse.class.students.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Liste des élèves</p>
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                  {selectedCourse.class.students.map((student: any) => (
                    <div
                      key={student.id}
                      className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <FiUser className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {student.user.firstName} {student.user.lastName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CoursesList;

