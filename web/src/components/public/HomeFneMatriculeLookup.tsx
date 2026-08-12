'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FiSearch, FiLoader, FiExternalLink, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { publicApi } from '@/services/api';
import { FNE_MATRICULE_SEARCH_URL } from '@/lib/fneMatricule';
import Button from '../ui/Button';

type FneResult = {
  fullName: string;
  matricule: string;
  dateOfBirth: string | null;
  birthPlace: string | null;
  establishment: string | null;
  establishmentCode: string | null;
};

type FneOptionsResponse = {
  years: Array<{ value: string; label: string }>;
  schools: Array<{ id: string; name: string }>;
  defaultEtablissementId: string | null;
  defaultEtablissementName: string | null;
  formUrl?: string;
};

/**
 * Bloc accueil public : l’élève / la famille recherche son matricule FNE
 * sans se connecter (proxy vers le portail SIGFNE).
 */
export default function HomeFneMatriculeLookup() {
  const [cycle, setCycle] = useState<'secondary' | 'primary'>('secondary');
  const [annee, setAnnee] = useState('');
  const [nom, setNom] = useState('');
  const [prenoms, setPrenoms] = useState('');
  const [datenaiss, setDatenaiss] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [results, setResults] = useState<FneResult[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: options, isFetching: loadingOptions } = useQuery({
    queryKey: ['public-fne-options', cycle],
    queryFn: () => publicApi.getFneOptions({ cycle }) as Promise<FneOptionsResponse>,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!options) return;
    if (!annee && options.years.length > 0) {
      // Plus récente année d’abord (liste triée croissant)
      const preferred = options.years[options.years.length - 1];
      if (preferred) setAnnee(preferred.value);
    }
    if (!etablissement && options.defaultEtablissementId) {
      setEtablissement(options.defaultEtablissementId);
    }
  }, [options, annee, etablissement]);

  const lookupMutation = useMutation({
    mutationFn: () =>
      publicApi.lookupFneMatricule({
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
        toast.success(`${data.results.length} résultat(s)`);
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Échec de la recherche');
      toast.error(msg);
      setResults([]);
      setNote(msg);
    },
  });

  const copyMatricule = async (matricule: string) => {
    try {
      await navigator.clipboard.writeText(matricule);
      setCopied(matricule);
      toast.success('Matricule copié');
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Impossible de copier automatiquement — notez le matricule affiché');
    }
  };

  return (
    <section
      id="matricule-fne"
      className="relative scroll-mt-24 overflow-hidden border-y border-stone-200/80 bg-gradient-to-b from-[#f7f6fb] via-white to-tran-mustard-50/40 py-16 sm:py-20"
    >
      <div
        className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-cptb-blue/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-tran-mustard-400/15 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tran-mustard-800">
            Service élèves & familles
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-tran-mauve-950 sm:text-3xl">
            Vérifier mon matricule FNE
          </h2>
          <div className="home-section-accent mx-auto mt-4" aria-hidden />
          <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-base">
            Retrouvez votre numéro matricule national directement ici, via le portail officiel
            SIGFNE / MENA. Aucune connexion à l’espace élève n’est requise.
          </p>
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_28px_64px_-32px_rgba(30,31,56,0.4)] ring-1 ring-tran-mustard-400/15 backdrop-blur-xl sm:p-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-stone-700">
              Cycle
              <select
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm"
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
            <label className="block text-xs font-semibold text-stone-700">
              Fichier année
              <select
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm"
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
            <label className="block text-xs font-semibold text-stone-700">
              Nom
              <input
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm uppercase"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom de famille"
                autoComplete="family-name"
              />
            </label>
            <label className="block text-xs font-semibold text-stone-700">
              Prénoms
              <input
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm uppercase"
                value={prenoms}
                onChange={(e) => setPrenoms(e.target.value)}
                placeholder="Prénoms"
                autoComplete="given-name"
              />
            </label>
            <label className="block text-xs font-semibold text-stone-700">
              Date de naissance
              <input
                type="date"
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm"
                value={datenaiss}
                onChange={(e) => setDatenaiss(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-stone-700">
              Établissement
              <select
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm"
                value={etablissement}
                disabled={loadingOptions}
                onChange={(e) => setEtablissement(e.target.value)}
              >
                <option value="">Tous / non précisé</option>
                {(options?.schools || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {options?.defaultEtablissementName && (
            <p className="mt-3 text-[11px] text-stone-500">
              Établissement proposé : {options.defaultEtablissementName}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={lookupMutation.isPending || !annee || (!nom && !prenoms && !datenaiss)}
              onClick={() => lookupMutation.mutate()}
            >
              {lookupMutation.isPending ? (
                <FiLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FiSearch className="mr-2 h-4 w-4" />
              )}
              Rechercher mon matricule
            </Button>
            <a
              href={options?.formUrl || FNE_MATRICULE_SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-tran-mauve-800 underline-offset-2 hover:underline"
            >
              <FiExternalLink className="h-3.5 w-3.5" aria-hidden />
              Portail officiel FNE
            </a>
          </div>

          {note && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {note}
            </p>
          )}

          {results.length > 0 && (
            <ul className="mt-5 max-h-72 space-y-0 overflow-y-auto divide-y divide-stone-100 rounded-xl border border-stone-200">
              {results.map((r) => (
                <li
                  key={`${r.matricule}-${r.fullName}`}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-tran-mauve-950">{r.fullName}</p>
                    <p className="mt-0.5 font-mono text-base font-bold tracking-wide text-emerald-800">
                      {r.matricule}
                    </p>
                    <p className="mt-1 text-[11px] text-stone-500">
                      {[r.dateOfBirth && `Né(e) le ${r.dateOfBirth}`, r.birthPlace, r.establishment]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyMatricule(r.matricule)}
                  >
                    {copied === r.matricule ? (
                      <FiCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    ) : null}
                    {copied === r.matricule ? 'Copié' : 'Copier'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
