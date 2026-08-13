import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminApi } from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Footer from '../components/Footer';
import {
  FiSearch,
  FiUsers,
  FiBook,
  FiUserCheck,
  FiClipboard,
  FiCalendar,
  FiUpload,
  FiX,
  FiFilter,
  FiClock,
} from 'react-icons/fi';

type SearchCategory = 'all' | 'students' | 'classes' | 'teachers' | 'grades' | 'absences' | 'assignments';

const Search = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const urlQuery = searchParams?.get('q')?.trim() ?? '';
  const effectiveQuery = searchQuery.trim() || urlQuery;

  const [debouncedQuery, setDebouncedQuery] = useState(effectiveQuery);
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(effectiveQuery), 350);
    return () => window.clearTimeout(id);
  }, [effectiveQuery]);

  /** Ne charge les jeux de données lourds que lorsqu’il y a une requête (évite 6 appels au chargement de la page). */
  const queriesEnabled = debouncedQuery.length >= 1;

  // Update search query from URL params
  useEffect(() => {
    const query = searchParams?.get('q');
    if (query) {
      setSearchQuery(query);
      if (query.trim()) {
        const saved = localStorage.getItem('recentSearches');
        const recent = saved ? JSON.parse(saved) : [];
        const updated = [query, ...recent.filter((s: string) => s !== query)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      }
    }
  }, [searchParams]);

  const queryOptions = {
    enabled: queriesEnabled,
    staleTime: 60_000,
  } as const;

  const { data: students } = useQuery({
    queryKey: ['search', 'students'],
    queryFn: () => adminApi.getStudents(),
    ...queryOptions,
  });

  const { data: classes } = useQuery({
    queryKey: ['search', 'classes'],
    queryFn: () => adminApi.getClasses(),
    ...queryOptions,
  });

  const { data: teachers } = useQuery({
    queryKey: ['search', 'teachers'],
    queryFn: () => adminApi.getTeachers(),
    ...queryOptions,
  });

  const { data: grades } = useQuery({
    queryKey: ['search', 'admin-grades'],
    queryFn: () => adminApi.getAllGrades(),
    ...queryOptions,
  });

  const { data: absences } = useQuery({
    queryKey: ['search', 'admin-absences'],
    queryFn: () => adminApi.getAllAbsences(),
    ...queryOptions,
  });

  const { data: assignments } = useQuery({
    queryKey: ['search', 'admin-assignments'],
    queryFn: () => adminApi.getAllAssignments(),
    ...queryOptions,
  });

  // Save search to recent searches
  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Filter results
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return { students: [], classes: [], teachers: [], grades: [], absences: [], assignments: [] };

    const query = searchQuery.toLowerCase();
    const results = {
      students: [] as any[],
      classes: [] as any[],
      teachers: [] as any[],
      grades: [] as any[],
      absences: [] as any[],
      assignments: [] as any[],
    };

    // Search students
    if (activeCategory === 'all' || activeCategory === 'students') {
      results.students = students?.filter((student: any) => {
        return (
          student.user.firstName.toLowerCase().includes(query) ||
          student.user.lastName.toLowerCase().includes(query) ||
          student.user.email.toLowerCase().includes(query) ||
          student.studentId.toLowerCase().includes(query) ||
          student.class?.name.toLowerCase().includes(query)
        );
      }) || [];
    }

    // Search classes
    if (activeCategory === 'all' || activeCategory === 'classes') {
      results.classes = classes?.filter((cls: any) => {
        return (
          cls.name.toLowerCase().includes(query) ||
          cls.level.toLowerCase().includes(query) ||
          cls.academicYear.toLowerCase().includes(query) ||
          cls.room?.toLowerCase().includes(query)
        );
      }) || [];
    }

    // Search teachers
    if (activeCategory === 'all' || activeCategory === 'teachers') {
      results.teachers = teachers?.filter((teacher: any) => {
        return (
          teacher.user.firstName.toLowerCase().includes(query) ||
          teacher.user.lastName.toLowerCase().includes(query) ||
          teacher.user.email.toLowerCase().includes(query) ||
          teacher.employeeId.toLowerCase().includes(query) ||
          teacher.specialization.toLowerCase().includes(query)
        );
      }) || [];
    }

    // Search grades
    if (activeCategory === 'all' || activeCategory === 'grades') {
      results.grades = grades?.filter((grade: any) => {
        return (
          grade.student.user.firstName.toLowerCase().includes(query) ||
          grade.student.user.lastName.toLowerCase().includes(query) ||
          grade.course.name.toLowerCase().includes(query) ||
          grade.title.toLowerCase().includes(query) ||
          grade.type.toLowerCase().includes(query)
        );
      }) || [];
    }

    // Search absences
    if (activeCategory === 'all' || activeCategory === 'absences') {
      results.absences = absences?.filter((absence: any) => {
        return (
          absence.student.user.firstName.toLowerCase().includes(query) ||
          absence.student.user.lastName.toLowerCase().includes(query) ||
          absence.course.name.toLowerCase().includes(query) ||
          absence.status.toLowerCase().includes(query)
        );
      }) || [];
    }

    // Search assignments
    if (activeCategory === 'all' || activeCategory === 'assignments') {
      results.assignments = assignments?.filter((assignment: any) => {
        return (
          assignment.title.toLowerCase().includes(query) ||
          assignment.description?.toLowerCase().includes(query) ||
          assignment.course.name.toLowerCase().includes(query) ||
          assignment.course.class.name.toLowerCase().includes(query)
        );
      }) || [];
    }

    return results;
  }, [searchQuery, activeCategory, students, classes, teachers, grades, absences, assignments]);

  const totalResults = Object.values(filteredResults).reduce((sum, arr) => sum + arr.length, 0);

  const categories = [
    { id: 'all' as SearchCategory, label: 'Tout', icon: FiSearch, count: totalResults },
    { id: 'students' as SearchCategory, label: 'Élèves', icon: FiUsers, count: filteredResults.students.length },
    { id: 'classes' as SearchCategory, label: 'Classes', icon: FiBook, count: filteredResults.classes.length },
    { id: 'teachers' as SearchCategory, label: 'Enseignants', icon: FiUserCheck, count: filteredResults.teachers.length },
    { id: 'grades' as SearchCategory, label: 'Notes', icon: FiClipboard, count: filteredResults.grades.length },
    { id: 'absences' as SearchCategory, label: 'Absences', icon: FiCalendar, count: filteredResults.absences.length },
    { id: 'assignments' as SearchCategory, label: 'Devoirs', icon: FiUpload, count: filteredResults.assignments.length },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      saveSearch(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      saveSearch(searchQuery);
    }
  };

  return (
    <div className="min-h-screen premium-body premium-body-v2 premium-body-v3">
      <div className="relative overflow-hidden bg-[#07081a] text-white py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f2e] via-[#001270] to-[#07081a]" aria-hidden />
        <div className="page-hero-v2__glow absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cptb-gold/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cptb-gold/35 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-cptb-gold/90">
            Espace établissement
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4 text-center tracking-tight">
            Recherche globale
          </h1>
          <p className="text-lg text-stone-300 text-center mb-8">
            Recherchez dans tous les éléments de votre établissement
          </p>

          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none z-10">
              <FiSearch className="w-6 h-6 text-stone-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher des élèves, classes, enseignants, notes..."
              className="w-full pl-16 pr-12 py-4 text-lg rounded-2xl border border-cptb-gold/30 bg-white/95 backdrop-blur-sm focus:ring-4 focus:ring-cptb-gold/25 focus:border-cptb-gold transition-all duration-200 shadow-lux text-stone-800 placeholder-stone-400"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => handleSearch('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-700 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="text-center mt-6">
              <p className="text-stone-300 text-lg">
                <span className="font-bold text-cptb-gold">{totalResults}</span> résultat
                {totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold tracking-tight text-stone-900">Catégories</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-sm text-stone-600 transition-colors hover:text-cptb-blue"
            >
              <FiFilter className="w-4 h-4" />
              <span>Filtres</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`group relative flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-cptb-blue to-cptb-blue-dark text-white shadow-lux-soft border border-cptb-gold/30'
                      : 'bg-stone-100 text-stone-700 hover:bg-amber-50 border border-stone-200/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-600'}`} />
                  <span>{category.label}</span>
                  {category.count > 0 && (
                    <Badge
                      className={`${
                        isActive
                          ? 'bg-white/30 text-white'
                          : 'bg-amber-50 text-amber-950'
                      }`}
                    >
                      {category.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Recent Searches */}
        {!searchQuery && recentSearches.length > 0 && (
          <Card className="mb-6">
            <h3 className="font-display mb-4 flex items-center text-lg font-semibold tracking-tight text-stone-900">
              <FiClock className="mr-2 h-5 w-5 text-cptb-gold" />
              Recherches récentes
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(search)}
                  className="flex items-center space-x-2 rounded-lg border border-stone-200/80 bg-stone-50 px-4 py-2 text-sm text-stone-700 transition-colors hover:border-cptb-gold/40 hover:bg-amber-50"
                >
                  <FiSearch className="w-3 h-3" />
                  <span>{search}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Results */}
        {searchQuery ? (
          <div className="space-y-6">
            {/* Students Results */}
            {(activeCategory === 'all' || activeCategory === 'students') && filteredResults.students.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display flex items-center text-xl font-semibold tracking-tight text-stone-900">
                    <FiUsers className="mr-2 h-6 w-6 text-cptb-blue" />
                    Élèves ({filteredResults.students.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredResults.students.map((student: any) => (
                    <div
                      key={student.id}
                      className="premium-result-tile cursor-pointer p-4"
                      onClick={() => router.push('/admin?tab=students')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cptb-blue to-cptb-blue-dark font-bold text-white ring-1 ring-cptb-gold/30">
                          {student.user.firstName[0]}{student.user.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-900">
                            {student.user.firstName} {student.user.lastName}
                          </p>
                          <p className="text-sm text-stone-600">{student.studentId}</p>
                          {student.class && (
                            <Badge className="mt-1 bg-amber-50 text-amber-950">
                              {student.class.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Classes Results */}
            {(activeCategory === 'all' || activeCategory === 'classes') && filteredResults.classes.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display flex items-center text-xl font-semibold tracking-tight text-stone-900">
                    <FiBook className="mr-2 h-6 w-6 text-cptb-gold-dark" />
                    Classes ({filteredResults.classes.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredResults.classes.map((cls: any) => (
                    <div
                      key={cls.id}
                      className="premium-result-tile cursor-pointer p-4"
                      onClick={() => router.push('/admin?tab=classes')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display text-lg font-semibold text-stone-900">{cls.name}</p>
                          <p className="text-sm text-stone-600">{cls.level} - {cls.academicYear}</p>
                          {cls.room && (
                            <p className="mt-1 text-xs text-stone-500">Salle: {cls.room}</p>
                          )}
                        </div>
                        <Badge className="bg-amber-50 text-amber-950">
                          {cls._count?.students || 0} élèves
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Teachers Results */}
            {(activeCategory === 'all' || activeCategory === 'teachers') && filteredResults.teachers.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display flex items-center text-xl font-semibold tracking-tight text-stone-900">
                    <FiUserCheck className="mr-2 h-6 w-6 text-cptb-blue" />
                    Enseignants ({filteredResults.teachers.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredResults.teachers.map((teacher: any) => (
                    <div
                      key={teacher.id}
                      className="premium-result-tile cursor-pointer p-4"
                      onClick={() => router.push('/admin?tab=teachers')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cptb-blue to-cptb-blue-dark font-bold text-white ring-1 ring-cptb-gold/30">
                          {teacher.user.firstName[0]}{teacher.user.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-900">
                            {teacher.user.firstName} {teacher.user.lastName}
                          </p>
                          <p className="text-sm text-stone-600">{teacher.employeeId}</p>
                          <Badge className="mt-1 bg-amber-50 text-amber-950">
                            {teacher.specialization}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Grades Results */}
            {(activeCategory === 'all' || activeCategory === 'grades') && filteredResults.grades.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display flex items-center text-xl font-semibold tracking-tight text-stone-900">
                    <FiClipboard className="mr-2 h-6 w-6 text-cptb-green" />
                    Notes ({filteredResults.grades.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {filteredResults.grades.slice(0, 10).map((grade: any) => (
                    <div
                      key={grade.id}
                      className="premium-result-tile cursor-pointer p-4"
                      onClick={() => router.push('/admin?tab=management')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-stone-900">
                            {grade.student.user.firstName} {grade.student.user.lastName}
                          </p>
                          <p className="text-sm text-stone-600">{grade.course.name} - {grade.title}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            {new Date(grade.date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-cptb-blue">
                            {((grade.score / grade.maxScore) * 20).toFixed(1)}
                          </p>
                          <p className="text-xs text-stone-500">/ 20</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Absences Results */}
            {(activeCategory === 'all' || activeCategory === 'absences') && filteredResults.absences.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display flex items-center text-xl font-semibold tracking-tight text-stone-900">
                    <FiCalendar className="mr-2 h-6 w-6 text-amber-700" />
                    Absences ({filteredResults.absences.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {filteredResults.absences.slice(0, 10).map((absence: any) => (
                    <div
                      key={absence.id}
                      className="premium-result-tile cursor-pointer p-4"
                      onClick={() => router.push('/admin?tab=management')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-stone-900">
                            {absence.student.user.firstName} {absence.student.user.lastName}
                          </p>
                          <p className="text-sm text-stone-600">{absence.course.name}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            {new Date(absence.date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Badge
                          className={
                            absence.excused
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }
                        >
                          {absence.excused ? 'Excusée' : 'Non excusée'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Assignments Results */}
            {(activeCategory === 'all' || activeCategory === 'assignments') && filteredResults.assignments.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display flex items-center text-xl font-semibold tracking-tight text-stone-900">
                    <FiUpload className="mr-2 h-6 w-6 text-cptb-blue" />
                    Devoirs ({filteredResults.assignments.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {filteredResults.assignments.slice(0, 10).map((assignment: any) => (
                    <div
                      key={assignment.id}
                      className="premium-result-tile cursor-pointer p-4"
                      onClick={() => router.push('/admin?tab=management')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-stone-900">{assignment.title}</p>
                          <p className="text-sm text-stone-600">{assignment.course.name}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            Échéance: {new Date(assignment.dueDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Badge className="bg-amber-50 text-amber-950">
                          {assignment._count?.students || 0} élèves
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* No Results */}
            {totalResults === 0 && (
              <Card>
                <div className="py-12 text-center">
                  <FiSearch className="mx-auto mb-4 h-16 w-16 text-stone-300" />
                  <h3 className="font-display mb-2 text-xl font-semibold text-stone-900">Aucun résultat trouvé</h3>
                  <p className="mb-6 text-stone-600">
                    Essayez avec d'autres mots-clés ou vérifiez l'orthographe
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <span className="text-sm text-stone-500">Suggestions :</span>
                    <button
                      onClick={() => handleSearch('élève')}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700 hover:border-cptb-gold/40 hover:bg-amber-50"
                    >
                      élève
                    </button>
                    <button
                      onClick={() => handleSearch('classe')}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700 hover:border-cptb-gold/40 hover:bg-amber-50"
                    >
                      classe
                    </button>
                    <button
                      onClick={() => handleSearch('enseignant')}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700 hover:border-cptb-gold/40 hover:bg-amber-50"
                    >
                      enseignant
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <div className="py-12 text-center">
              <FiSearch className="mx-auto mb-4 h-20 w-20 text-stone-300" />
              <h3 className="font-display mb-2 text-2xl font-semibold text-stone-900">Commencez votre recherche</h3>
              <p className="mb-6 text-stone-600">
                Recherchez des élèves, classes, enseignants, notes, absences ou devoirs
              </p>
              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-3">
                <div className="premium-result-tile p-4">
                  <FiUsers className="mx-auto mb-2 h-8 w-8 text-cptb-blue" />
                  <p className="text-sm font-semibold text-stone-900">Élèves</p>
                </div>
                <div className="premium-result-tile p-4">
                  <FiBook className="mx-auto mb-2 h-8 w-8 text-cptb-gold-dark" />
                  <p className="text-sm font-semibold text-stone-900">Classes</p>
                </div>
                <div className="premium-result-tile p-4">
                  <FiUserCheck className="mx-auto mb-2 h-8 w-8 text-cptb-blue" />
                  <p className="text-sm font-semibold text-stone-900">Enseignants</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Search;

