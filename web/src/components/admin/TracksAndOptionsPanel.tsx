import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import { FiGitBranch, FiLayers, FiPlus, FiTrash2, FiLink } from 'react-icons/fi';
import {
  EDUCATION_SECTOR_LABELS,
  EDUCATION_SECTOR_SHORT_LABELS,
  educationSectorBadgeVariant,
  normalizeEducationSector,
  type EducationSectorValue,
} from '@/lib/educationSector';

type TracksAndOptionsPanelProps = {
  compact?: boolean;
};

const TracksAndOptionsPanel: React.FC<TracksAndOptionsPanelProps> = ({ compact = false }) => {
  const queryClient = useQueryClient();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [newTrack, setNewTrack] = useState({
    name: '',
    code: '',
    academicYear: '',
    sortOrder: '0',
    educationSector: 'GENERAL' as EducationSectorValue,
  });
  const [newOption, setNewOption] = useState({ name: '', code: '' });
  const [linkOptionId, setLinkOptionId] = useState('');

  const { data: tracks, isLoading: loadingTracks } = useQuery({
    queryKey: ['school-tracks'],
    queryFn: () => adminApi.getSchoolTracks(),
  });

  const { data: options, isLoading: loadingOptions } = useQuery({
    queryKey: ['subject-options'],
    queryFn: () => adminApi.getSubjectOptions(),
  });

  const { data: links, isLoading: loadingLinks } = useQuery({
    queryKey: ['track-available-options', selectedTrackId],
    queryFn: () => adminApi.getTrackAvailableOptions(selectedTrackId!),
    enabled: !!selectedTrackId,
  });

  const selectedTrack = useMemo(
    () => (tracks as any[])?.find((t) => t.id === selectedTrackId) ?? null,
    [tracks, selectedTrackId]
  );

  const linkableOptions = useMemo(() => {
    const all = (options as any[]) ?? [];
    const linked = new Set((links as any[])?.map((l) => l.optionId) ?? []);
    return all.filter((o) => !linked.has(o.id));
  }, [options, links]);

  const createTrack = useMutation({
    mutationFn: () =>
      adminApi.createSchoolTrack({
        name: newTrack.name.trim(),
        code: newTrack.code.trim(),
        academicYear: newTrack.academicYear.trim() || null,
        sortOrder: Number(newTrack.sortOrder) || 0,
        educationSector: newTrack.educationSector,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['school-tracks'] });
      setNewTrack({ name: '', code: '', academicYear: '', sortOrder: '0', educationSector: 'GENERAL' });
      setSelectedTrackId(data.id);
      toast.success('Filière créée');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const deleteTrack = useMutation({
    mutationFn: (id: string) => adminApi.deleteSchoolTrack(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['track-available-options'] });
      setSelectedTrackId(null);
      toast.success('Filière supprimée');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const createOption = useMutation({
    mutationFn: () =>
      adminApi.createSubjectOption({
        name: newOption.name.trim(),
        code: newOption.code.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-options'] });
      setNewOption({ name: '', code: '' });
      toast.success('Option ajoutée au catalogue');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const deleteOption = useMutation({
    mutationFn: (id: string) => adminApi.deleteSubjectOption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-options'] });
      queryClient.invalidateQueries({ queryKey: ['track-available-options'] });
      toast.success('Option supprimée');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const addLink = useMutation({
    mutationFn: () =>
      adminApi.addTrackAvailableOption(selectedTrackId!, { optionId: linkOptionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-available-options', selectedTrackId] });
      setLinkOptionId('');
      toast.success('Option rattachée à la filière');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const removeLink = useMutation({
    mutationFn: ({ trackId, linkId }: { trackId: string; linkId: string }) =>
      adminApi.removeTrackAvailableOption(trackId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-available-options', selectedTrackId] });
      toast.success('Option retirée de la filière');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  return (
    <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
      <div>
        <h3
          className={
            compact ? 'text-base font-semibold text-gray-900' : 'text-lg font-semibold text-gray-900'
          }
        >
          Filières et options
        </h3>
        <p className={compact ? 'text-xs text-gray-500 mt-1' : 'text-sm text-gray-500 mt-1'}>
          Définissez les <strong>filières</strong> (voies, spécialités), le <strong>catalogue d’options</strong>{' '}
          enseignées, puis rattachez les options proposées dans chaque filière. Les classes et les programmes
          par niveau peuvent ensuite référencer une filière.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="p-3 border border-gray-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <FiGitBranch className="w-3.5 h-3.5" />
            Filières
          </div>
          {loadingTracks ? (
            <p className="text-xs text-gray-500">Chargement…</p>
          ) : (
            <ul className="max-h-52 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {(tracks as any[])?.length ? (
                (tracks as any[]).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTrackId(t.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-indigo-50/60 ${
                        selectedTrackId === t.id ? 'bg-indigo-50 ring-1 ring-indigo-100' : ''
                      }`}
                    >
                      <span className="font-medium text-gray-900 truncate">{t.name}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant={educationSectorBadgeVariant(normalizeEducationSector(t.educationSector))}
                          size="sm"
                        >
                          {EDUCATION_SECTOR_SHORT_LABELS[normalizeEducationSector(t.educationSector)]}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {t.code}
                        </Badge>
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-4 text-xs text-gray-500">Aucune filière pour l’instant.</li>
              )}
            </ul>
          )}

          <div className="pt-2 border-t border-gray-100 space-y-2">
            <p className="text-[11px] font-medium text-gray-500">Nouvelle filière</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                placeholder="Nom"
                value={newTrack.name}
                onChange={(e) => setNewTrack((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono"
                placeholder="Code (ex. GEN)"
                value={newTrack.code}
                onChange={(e) => setNewTrack((p) => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                value={newTrack.educationSector}
                onChange={(e) =>
                  setNewTrack((p) => ({
                    ...p,
                    educationSector: e.target.value as EducationSectorValue,
                  }))
                }
              >
                {(Object.keys(EDUCATION_SECTOR_LABELS) as EducationSectorValue[]).map((key) => (
                  <option key={key} value={key}>
                    {EDUCATION_SECTOR_LABELS[key]}
                  </option>
                ))}
              </select>
              <input
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                placeholder="Année (optionnel)"
                value={newTrack.academicYear}
                onChange={(e) => setNewTrack((p) => ({ ...p, academicYear: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                placeholder="Ordre"
                value={newTrack.sortOrder}
                onChange={(e) => setNewTrack((p) => ({ ...p, sortOrder: e.target.value }))}
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!newTrack.name.trim() || !newTrack.code.trim() || createTrack.isPending}
              onClick={() => createTrack.mutate()}
            >
              <FiPlus className="w-4 h-4 mr-1 inline" />
              Créer la filière
            </Button>
          </div>

          {selectedTrack && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                value={normalizeEducationSector(selectedTrack.educationSector)}
                onChange={(e) => {
                  const educationSector = e.target.value as EducationSectorValue;
                  adminApi
                    .updateSchoolTrack(selectedTrack.id, { educationSector })
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ['school-tracks'] });
                      toast.success('Voie de la filière mise à jour');
                    })
                    .catch((err: { response?: { data?: { error?: string } } }) =>
                      toast.error(err.response?.data?.error || 'Erreur')
                    );
                }}
              >
                {(Object.keys(EDUCATION_SECTOR_LABELS) as EducationSectorValue[]).map((key) => (
                  <option key={key} value={key}>
                    {EDUCATION_SECTOR_LABELS[key]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-red-700 border-red-200"
                onClick={() => {
                  if (confirm(`Supprimer la filière « ${selectedTrack.name} » ?`)) {
                    deleteTrack.mutate(selectedTrack.id);
                  }
                }}
                disabled={deleteTrack.isPending}
              >
                <FiTrash2 className="w-3.5 h-3.5 mr-1 inline" />
                Supprimer
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-3 border border-gray-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <FiLayers className="w-3.5 h-3.5" />
            Catalogue d’options
          </div>
          {loadingOptions ? (
            <p className="text-xs text-gray-500">Chargement…</p>
          ) : (
            <ul className="max-h-40 overflow-y-auto space-y-1">
              {(options as any[])?.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded border border-gray-100"
                >
                  <span className="truncate">
                    {o.name}{' '}
                    <span className="text-gray-400 font-mono">({o.code})</span>
                  </span>
                  <button
                    type="button"
                    className="text-red-600 hover:underline shrink-0"
                    onClick={() => {
                      if (confirm(`Supprimer l’option « ${o.name} » ?`)) deleteOption.mutate(o.id);
                    }}
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <input
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
              placeholder="Nom de l’option"
              value={newOption.name}
              onChange={(e) => setNewOption((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono"
              placeholder="Code"
              value={newOption.code}
              onChange={(e) => setNewOption((p) => ({ ...p, code: e.target.value }))}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!newOption.name.trim() || !newOption.code.trim() || createOption.isPending}
            onClick={() => createOption.mutate()}
          >
            <FiPlus className="w-4 h-4 mr-1 inline" />
            Ajouter au catalogue
          </Button>
        </Card>
      </div>

      <Card className="p-3 border border-indigo-100 bg-indigo-50/30 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 uppercase tracking-wide">
          <FiLink className="w-3.5 h-3.5" />
          Options proposées dans la filière
        </div>
        {!selectedTrackId ? (
          <p className="text-xs text-gray-600">Sélectionnez une filière à gauche pour gérer ses options.</p>
        ) : loadingLinks ? (
          <p className="text-xs text-gray-500">Chargement…</p>
        ) : (
          <>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {(links as any[])?.length ? (
                (links as any[]).map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 bg-white rounded border border-indigo-100"
                  >
                    <span>
                      {l.option?.name}{' '}
                      <span className="text-gray-400 font-mono">({l.option?.code})</span>
                    </span>
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() =>
                        removeLink.mutate({ trackId: selectedTrackId!, linkId: l.id })
                      }
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-xs text-gray-500">Aucune option liée — ajoutez-en depuis le catalogue.</li>
              )}
            </ul>
            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-indigo-100/80">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Option du catalogue</label>
                <select
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  value={linkOptionId}
                  onChange={(e) => setLinkOptionId(e.target.value)}
                >
                  <option value="">— Choisir —</option>
                  {linkableOptions.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!linkOptionId || addLink.isPending}
                onClick={() => addLink.mutate()}
              >
                Rattacher
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default TracksAndOptionsPanel;
