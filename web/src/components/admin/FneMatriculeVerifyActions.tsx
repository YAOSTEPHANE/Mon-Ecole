'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FiExternalLink, FiSearch, FiCheck, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminApi } from '@/services/api';
import { FNE_MATRICULE_SEARCH_URL, openFneMatriculeSearch } from '@/lib/fneMatricule';
import Button from '../ui/Button';

export type FneLookupPrefill = {
  lastName?: string;
  firstName?: string;
  dateOfBirth?: string;
};

type FneResult = {
  fullName: string;
  matricule: string;
  dateOfBirth: string | null;
  birthPlace: string | null;
  father: string | null;
  mother: string | null;
  establishment: string | null;
  establishmentCode: string | null;
  fileYear: string;
};

type FneMatriculeVerifyActionsProps = {
  prefill?: FneLookupPrefill;
  onSelectMatricule?: (matricule: string, result: FneResult) => void;
  className?: string;
};

type FneOptionsResponse = {
  years: Array<{ value: string; label: string }>;
  schools: Array<{ id: string; name: string }>;
  defaultEtablissementId: string | null;
  defaultEtablissementName: string | null;
  formUrl?: string;
};

export default function FneMatriculeVerifyActions({
  prefill,
  onSelectMatricule,
  className = '',
}: FneMatriculeVerifyActionsProps) {
  const [open, setOpen] = useState(false);
  const [cycle, setCycle] = useState<'secondary' | 'primary'>('secondary');
  const [annee, setAnnee] = useState('');
  const [nom, setNom] = useState('');
  const [prenoms, setPrenoms] = useState('');
  const [datenaiss, setDatenaiss] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [results, setResults] = useState<FneResult[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const { data: options, isFetching: loadingOptions } = useQuery({
    queryKey: ['admin-mena-fne-options', cycle],
    queryFn: () => adminApi.getFneOptions({ cycle }) as Promise<FneOptionsResponse>,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open) return;
    setNom((prefill?.lastName || '').trim());
    setPrenoms((prefill?.firstName || '').trim());
    setDatenaiss((prefill?.dateOfBirth || '').trim());
  }, [open, prefill?.lastName, prefill?.firstName, prefill?.dateOfBirth]);

  useEffect(() => {
    if (!options) return;
    if (!annee && options.years.length > 0) {
      const preferred = options.years[options.years.length - 1];
      if (preferred) setAnnee(preferred.value);
    }
    if (!etablissement && options.defaultEtablissementId) {
      setEtablissement(options.defaultEtablissementId);
    }
  }, [options, annee, etablissement]);

  const lookupMutation = useMutation({
    mutationFn: () =>
      adminApi.lookupFneMatricule({
        cycle,
        annee,
        nom,
        prenoms,
        datenaiss,
        etablissement,
      }) as Promise<{ results: FneResult[]; note?: string | null }>,
    onSuccess: (data) => {
      setResults(data.results || []);
      setNote(data.note || null);
      if (!(data.results || []).length) {
        toast.error(data.note || 'Aucun matricule trouvé');
      } else {
        toast.success(`${data.results.length} résultat(s) FNE`);
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Échec de la recherche FNE');
      toast.error(msg);
      setResults([]);
      setNote(msg);
    },
  });

  return (
    <div className={`mt-1.5 space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 underline-offset-2 hover:underline"
        >
          <FiSearch className="w-3 h-3 shrink-0" aria-hidden />
          {open ? 'Masquer la recherche FNE' : 'Rechercher le matricule ici'}
        </button>
        <button
          type="button"
          onClick={openFneMatriculeSearch}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 underline-offset-2 hover:underline"
        >
          <FiExternalLink className="w-3 h-3 shrink-0" aria-hidden />
          Ouvrir le site FNE
        </button>
      </div>

      {open && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
          <p className="text-[10px] text-stone-600">
            Recherche via le portail officiel SIGFNE (secondaire par défaut pour le collège). Les
            résultats viennent du MENA — cliquez pour remplir le matricule.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block text-[11px] font-medium text-stone-700">
              Cycle
              <select
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
                value={cycle}
                onChange={(e) => {
                  setCycle(e.target.value === 'primary' ? 'primary' : 'secondary');
                  setAnnee('');
                  setResults([]);
                }}
              >
                <option value="secondary">Secondaire (collège / lycée)</option>
                <option value="primary">Primaire</option>
              </select>
            </label>
            <label className="block text-[11px] font-medium text-stone-700">
              Fichier année
              <select
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
                value={annee}
                disabled={loadingOptions}
                onChange={(e) => setAnnee(e.target.value)}
              >
                <option value="">Choisir…</option>
                {(options?.years || []).map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-medium text-stone-700">
              Nom
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm uppercase"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom de famille"
              />
            </label>
            <label className="block text-[11px] font-medium text-stone-700">
              Prénoms
              <input
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm uppercase"
                value={prenoms}
                onChange={(e) => setPrenoms(e.target.value)}
                placeholder="Prénoms"
              />
            </label>
            <label className="block text-[11px] font-medium text-stone-700">
              Date de naissance
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
                value={datenaiss}
                onChange={(e) => setDatenaiss(e.target.value)}
              />
            </label>
            <label className="block text-[11px] font-medium text-stone-700">
              Établissement FNE
              <select
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
                value={etablissement}
                disabled={loadingOptions}
                onChange={(e) => setEtablissement(e.target.value)}
              >
                <option value="">Tous / non précisé</option>
                {(options?.schools || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {options?.defaultEtablissementName && (
            <p className="text-[10px] text-emerald-900/80">
              Établissement détecté : {options.defaultEtablissementName}
              {options.defaultEtablissementId ? ` (${options.defaultEtablissementId})` : ''}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={lookupMutation.isPending || !annee || (!nom && !prenoms && !datenaiss)}
              onClick={() => lookupMutation.mutate()}
            >
              {lookupMutation.isPending ? (
                <FiLoader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <FiSearch className="w-3.5 h-3.5 mr-1.5" />
              )}
              Lancer la recherche
            </Button>
            <a
              href={options?.formUrl || FNE_MATRICULE_SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[11px] text-stone-600 hover:underline"
            >
              Portail source
            </a>
          </div>

          {note && <p className="text-[10px] text-amber-900 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">{note}</p>}

          {results.length > 0 && (
            <ul className="max-h-56 overflow-y-auto divide-y divide-emerald-100 rounded-lg border border-emerald-200 bg-white">
              {results.map((r) => (
                <li key={`${r.matricule}-${r.fullName}`} className="p-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{r.fullName}</p>
                    <p className="text-xs font-mono text-emerald-800">{r.matricule}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      {[r.dateOfBirth && `Né(e) le ${r.dateOfBirth}`, r.birthPlace, r.establishment]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {onSelectMatricule && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelectMatricule(r.matricule, r);
                        toast.success(`Matricule ${r.matricule} appliqué`);
                      }}
                    >
                      <FiCheck className="w-3.5 h-3.5 mr-1" />
                      Utiliser
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
