import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import {
  EDUCATION_SECTOR_LABELS,
  normalizeEducationSector,
  type EducationSectorValue,
} from '@/lib/educationSector';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { 
  FiBook, 
  FiUsers, 
  FiCalendar, 
  FiMapPin, 
  FiUser,
  FiAlertCircle,
  FiSave,
  FiLoader,
  FiCheck
} from 'react-icons/fi';

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddClassModal: React.FC<AddClassModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    section: '',
    academicYear: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString(),
    room: '',
    capacity: 30,
    teacherId: '',
    educationSector: 'GENERAL' as EducationSectorValue,
    trackId: '',
    materialRoomId: '',
  });

  // Fetch teachers for teacher selection
  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: adminApi.getTeachers,
    enabled: isOpen,
  });

  const { data: schoolTracks } = useQuery({
    queryKey: ['school-tracks'],
    queryFn: () => adminApi.getSchoolTracks(),
    enabled: isOpen,
  });

  const { data: materialRooms } = useQuery({
    queryKey: ['material-rooms', 'add-class-modal'],
    queryFn: () => adminApi.getMaterialRooms({ isActive: 'true' }),
    enabled: isOpen,
  });

  const tracksForSector = useMemo(() => {
    const list = (schoolTracks as { id: string; name: string; code: string; educationSector?: EducationSectorValue }[]) ?? [];
    return list.filter(
      (t) => normalizeEducationSector(t.educationSector) === formData.educationSector
    );
  }, [schoolTracks, formData.educationSector]);

  // Available levels
  const levels = [
    '6ème',
    '5ème',
    '4ème',
    '3ème',
    '2nde',
    '1ère',
    'Terminale',
  ];

  // Level colors for visual feedback
  const levelColors: Record<string, string> = {
    '6ème': 'from-blue-500 to-blue-600',
    '5ème': 'from-green-500 to-green-600',
    '4ème': 'from-yellow-500 to-yellow-600',
    '3ème': 'from-orange-500 to-orange-600',
    '2nde': 'from-purple-500 to-purple-600',
    '1ère': 'from-pink-500 to-pink-600',
    'Terminale': 'from-red-500 to-red-600',
  };

  // Mutation pour créer la classe
  const createClassMutation = useMutation({
    mutationFn: adminApi.createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Classe créée avec succès !');
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la création de la classe';
      toast.error(errorMessage);
      if (error.response?.data?.errors) {
        const validationErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          validationErrors[err.param] = err.msg;
        });
        setErrors(validationErrors);
      }
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'educationSector') {
        const sector = value as EducationSectorValue;
        const currentTrack = ((schoolTracks as { id: string; educationSector?: EducationSectorValue }[]) ?? []).find(
          (t) => t.id === prev.trackId
        );
        const trackStillValid =
          currentTrack && normalizeEducationSector(currentTrack.educationSector) === sector;
        return {
          ...prev,
          educationSector: sector,
          trackId: trackStillValid ? prev.trackId : '',
        };
      }
      if (name === 'trackId') {
        const track = ((schoolTracks as { id: string; educationSector?: EducationSectorValue }[]) ?? []).find(
          (t) => t.id === value
        );
        return {
          ...prev,
          trackId: value,
          ...(track?.educationSector
            ? { educationSector: normalizeEducationSector(track.educationSector) }
            : {}),
        };
      }
      return {
        ...prev,
        [name]: name === 'capacity' ? parseInt(value) || 0 : value,
      };
    });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la classe est requis';
    }
    if (!formData.level) {
      newErrors.level = 'Le niveau est requis';
    }
    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'L\'année académique est requise';
    }
    if (formData.capacity && formData.capacity < 1) {
      newErrors.capacity = 'La capacité doit être supérieure à 0';
    }
    if (formData.capacity && formData.capacity > 50) {
      newErrors.capacity = 'La capacité ne peut pas dépasser 50';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      level: formData.level,
      ...(formData.section.trim() ? { section: formData.section.trim() } : {}),
      academicYear: formData.academicYear,
      room: formData.room.trim() || undefined,
      capacity: formData.capacity || 30,
      teacherId: formData.teacherId || undefined,
      educationSector: formData.educationSector,
      trackId: formData.trackId.trim() || undefined,
      materialRoomId: formData.materialRoomId || undefined,
    };

    createClassMutation.mutate(submitData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      level: '',
      section: '',
      academicYear: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString(),
      room: '',
      capacity: 30,
      teacherId: '',
      educationSector: 'GENERAL',
      trackId: '',
      materialRoomId: '',
    });
    setErrors({});
    onClose();
  };

  const selectedLevelColor = formData.level ? levelColors[formData.level] || 'from-gray-500 to-gray-600' : 'from-gray-500 to-gray-600';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Créer une Classe" size="lg" compact>
      <div className="space-y-2">
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Nom de la classe */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nom de la classe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <FiBook className="h-3.5 w-3.5 text-stone-400" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 transition-all ${
                  errors.name ? 'border-red-500' : 'border-stone-200'
                }`}
                placeholder="Ex: 6ème générale, Terminale sciences…"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 flex items-center">
                <FiAlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Section <span className="text-stone-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              name="section"
              value={formData.section}
              onChange={handleChange}
              className="w-full px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 transition-all"
              placeholder="Lettre (A, B) ou filière (Sciences, Lettres…)"
            />
            <p className="mt-0.5 text-[10px] text-stone-500">
              Permet de distinguer les classes d&apos;un même niveau (ex. 6ème section A).
            </p>
          </div>

          {/* Niveau et Année académique */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Niveau <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${selectedLevelColor}`} />
                </div>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 transition-all appearance-none ${
                    errors.level ? 'border-red-500' : 'border-stone-200'
                  }`}
                >
                  <option value="">Sélectionner un niveau</option>
                  {levels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              {errors.level && (
                <p className="mt-1 text-xs text-red-500 flex items-center">
                  <FiAlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  {errors.level}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Année académique <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <FiCalendar className="h-3.5 w-3.5 text-stone-400" />
                </div>
                <input
                  type="text"
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={handleChange}
                  className={`w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 transition-all ${
                    errors.academicYear ? 'border-red-500' : 'border-stone-200'
                  }`}
                  placeholder="2024-2025"
                />
              </div>
              {errors.academicYear && (
                <p className="mt-1 text-xs text-red-500 flex items-center">
                  <FiAlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  {errors.academicYear}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-stone-500">Format : AAAA-AAAA</p>
            </div>
          </div>

          {/* Salle et Capacité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Salle
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <FiMapPin className="h-3.5 w-3.5 text-stone-400" />
                </div>
                <input
                  type="text"
                  name="room"
                  value={formData.room}
                  onChange={handleChange}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 transition-all"
                  placeholder="Ex: Salle 101, Labo 2, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Capacité
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <FiUsers className="h-3.5 w-3.5 text-stone-400" />
                </div>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  min="1"
                  max="50"
                  className={`w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 transition-all ${
                    errors.capacity ? 'border-red-500' : 'border-stone-200'
                  }`}
                  placeholder="30"
                />
              </div>
              {errors.capacity && (
                <p className="mt-1 text-xs text-red-500 flex items-center">
                  <FiAlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  {errors.capacity}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-stone-500">Nombre maximum d&apos;élèves (défaut : 30)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label htmlFor="add-class-education-sector" className="block text-xs font-semibold text-stone-700 mb-1">
                Voie d&apos;enseignement <span className="text-red-500">*</span>
              </label>
              <select
                id="add-class-education-sector"
                name="educationSector"
                value={formData.educationSector}
                onChange={handleChange}
                className="w-full px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 appearance-none"
              >
                {(Object.keys(EDUCATION_SECTOR_LABELS) as EducationSectorValue[]).map((key) => (
                  <option key={key} value={key}>
                    {EDUCATION_SECTOR_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Filière <span className="text-stone-400 font-normal">(optionnel)</span>
              </label>
              <select
                name="trackId"
                value={formData.trackId}
                onChange={handleChange}
                className="w-full px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/25 appearance-none"
              >
                <option value="">Aucune</option>
                {tracksForSector.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Salle du référentiel <span className="text-stone-400 font-normal">(optionnel)</span>
            </label>
            <select
              name="materialRoomId"
              value={formData.materialRoomId}
              onChange={handleChange}
              className="w-full px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/25 appearance-none"
            >
              <option value="">Aucune (saisie libre)</option>
              {(materialRooms as any[])?.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.building ? ` · ${r.building}` : ''}
                  {r.code ? ` (${r.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Enseignant principal */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Enseignant principal (optionnel)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <FiUser className="h-3.5 w-3.5 text-stone-400" />
              </div>
              <select
                name="teacherId"
                value={formData.teacherId}
                onChange={handleChange}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 transition-all appearance-none"
              >
                <option value="">Aucun enseignant assigné</option>
                {teachers?.map((teacher: any) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user.firstName} {teacher.user.lastName}
                    {teacher.specialization && ` - ${teacher.specialization}`}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-0.5 text-[10px] text-stone-500">Vous pourrez assigner un enseignant plus tard</p>
          </div>

          {/* Preview de la classe */}
          {formData.name && formData.level && (
            <div className={`rounded-lg p-2.5 bg-gradient-to-br ${selectedLevelColor} text-white shadow-md`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide opacity-90">Aperçu</p>
                  <p className="text-lg font-bold leading-tight truncate mt-0.5">{formData.name}</p>
                  <p className="text-xs opacity-90 mt-0.5 truncate">
                    {formData.level}
                    {formData.section.trim() ? ` · section ${formData.section.trim()}` : ''} •{' '}
                    {formData.academicYear}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1">
                    <FiUsers className="w-4 h-4 opacity-90" />
                    <span className="text-base font-bold tabular-nums">{formData.capacity}</span>
                  </div>
                  <p className="text-[10px] opacity-75 mt-0.5">élèves max</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200/80">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClose}
              disabled={createClassMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createClassMutation.isPending}
              className="min-w-[120px]"
            >
              {createClassMutation.isPending ? (
                <>
                  <FiLoader className="w-4 h-4 mr-1.5 animate-spin inline" />
                  Création...
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4 mr-1.5 inline" />
                  Créer la classe
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddClassModal;






