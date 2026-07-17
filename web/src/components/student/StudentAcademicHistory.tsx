'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FiArchive,
  FiCalendar,
  FiAward,
  FiStar,
  FiBook,
  FiAlertCircle,
  FiChevronDown,
  FiChevronRight,
  FiSearch,
  FiTrendingUp,
} from 'react-icons/fi';

export interface AcademicHistoryProps {
  searchQuery?: string;
}

const StudentAcademicHistory = ({ searchQuery = '' }: AcademicHistoryProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-academic-history'],
    queryFn: studentApi.getAcademicHistory,
  });

  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  const filteredByYear = useMemo(() => {
    const rows = data?.byYear ?? [];
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((block: any) => {
      if (String(block.academicYear).toLowerCase().includes(q)) return true;
      const rc = (block.reportCards || []).some(
        (r: any) =>
          String(r.period || '').toLowerCase().includes(q) ||
          String(r.comments || '').toLowerCase().includes(q)
      );
      const cd = (block.conducts || []).some(
        (c: any) =>
          String(c.period || '').toLowerCase().includes(q) ||
          String(c.comments || '').toLowerCase().includes(q)
      );
      return rc || cd;
    });
  }, [data?.byYear, searchQuery]);

  useEffect(() => {
    const first = data?.byYear?.[0]?.academicYear;
    if (!first) return;
    setExpandedYears((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return { [first]: true };
    });
  }, [data?.byYear]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          <p className="mt-4 text-gray-600">Chargement de l&apos;historique…</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <p className="text-red-800 text-center py-8">Impossible de charger l&apos;historique scolaire.</p>
      </Card>
    );
  }

  const enrollment = data?.enrollmentDate
    ? format(new Date(data.enrollmentDate), 'd MMMM yyyy', { locale: fr })
    : null;
  const currentClass = data?.currentClass;
  const tuitionBlock = data?.tuitionBlock as
    | { active?: boolean; hiddenAcademicYears?: string[] }
    | undefined;

  const hasAnyActivity =
    (data?.totals?.reportCards ?? 0) > 0 ||
    (data?.totals?.conducts ?? 0) > 0 ||
    (data?.totals?.grades ?? 0) > 0 ||
    (data?.totals?.absences ?? 0) > 0;

  return (
    <div className="space-y-6">
      {tuitionBlock?.active && (tuitionBlock.hiddenAcademicYears?.length ?? 0) > 0 && (
        <Card className="border-l-4 border-amber-500 bg-amber-50/90 ring-1 ring-amber-200/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <FiAlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="text-sm text-amber-950">
              <p className="font-semibold text-amber-900 mb-1">Historique partiellement masqué</p>
              <p className="text-amber-900/90 leading-relaxed">
                Notes et bulletins des années{' '}
                <span className="font-medium">{tuitionBlock.hiddenAcademicYears?.join(', ')}</span> ne sont pas
                affichés tant que la scolarité ou l&apos;inscription n&apos;est pas réglée.
              </p>
            </div>
          </div>
        </Card>
      )}

      {searchQuery && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
          <div className="flex items-center gap-3">
            <FiSearch className="w-5 h-5 text-indigo-600" />
            <p className="text-sm font-medium text-gray-800">
              Filtre : <span className="text-indigo-700">&quot;{searchQuery}&quot;</span>
            </p>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-purple-100 bg-gradient-to-br from-white to-purple-50/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-2">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25">
              <FiArchive className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Historique scolaire</h2>
              <p className="text-gray-600 mt-1 max-w-xl">
                Vue chronologique par année scolaire : bulletins, appréciations de conduite et synthèse des
                évaluations.
              </p>
              {enrollment && (
                <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                  <FiCalendar className="w-4 h-4 shrink-0" />
                  Inscription : <span className="font-medium text-gray-700">{enrollment}</span>
                </p>
              )}
              {currentClass && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <FiBook className="w-4 h-4 shrink-0 text-purple-500" />
                  Classe actuelle :{' '}
                  <span className="font-semibold text-gray-800">
                    {currentClass.name} <span className="text-gray-500 font-normal">({currentClass.level})</span>
                  </span>
                  <span className="text-gray-400">· {currentClass.academicYear}</span>
                </p>
              )}
            </div>
          </div>

          {data?.totals && (
            <div className="flex flex-wrap gap-3 justify-start md:justify-end">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-purple-100 text-sm shadow-sm">
                <FiAward className="text-purple-600" />
                <span className="font-semibold text-gray-900">{data.totals.reportCards}</span>
                <span className="text-gray-500">bulletins</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-pink-100 text-sm shadow-sm">
                <FiStar className="text-pink-600" />
                <span className="font-semibold text-gray-900">{data.totals.conducts}</span>
                <span className="text-gray-500">conduites</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-indigo-100 text-sm shadow-sm">
                <FiTrendingUp className="text-indigo-600" />
                <span className="font-semibold text-gray-900">{data.totals.grades}</span>
                <span className="text-gray-500">notes</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-amber-100 text-sm shadow-sm">
                <FiAlertCircle className="text-amber-600" />
                <span className="font-semibold text-gray-900">{data.totals.absences}</span>
                <span className="text-gray-500">absences</span>
              </span>
            </div>
          )}
        </div>
      </Card>

      {!hasAnyActivity && (
        <Card className="text-center py-14 border-dashed border-2 border-gray-200 bg-gray-50/80">
          <FiArchive className="w-14 h-14 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-semibold text-gray-700">Aucune donnée pour l&apos;instant</p>
          <p className="text-gray-500 max-w-md mx-auto mt-2">
            Les bulletins, notes et bilans de conduite apparaîtront ici au fil des trimestres.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {filteredByYear.map((block: any) => {
          const year = block.academicYear as string;
          const open = expandedYears[year] ?? false;
          const rc = block.reportCards || [];
          const cd = block.conducts || [];
          const gs = block.gradesSummary || { evaluationCount: 0, weightedAverage20: null };
          const absences = block.absenceCount ?? 0;

          const hasContent = rc.length > 0 || cd.length > 0 || gs.evaluationCount > 0 || absences > 0;

          return (
            <Card key={year} className="overflow-hidden border border-gray-100 shadow-md">
              <button
                type="button"
                onClick={() => toggleYear(year)}
                className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-purple-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {open ? (
                    <FiChevronDown className="w-5 h-5 text-purple-600 shrink-0" />
                  ) : (
                    <FiChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">Année {year}</h3>
                    <p className="text-xs text-gray-500 truncate">
                      {[rc.length && `${rc.length} bulletin(s)`, cd.length && `${cd.length} conduite(s)`]
                        .filter(Boolean)
                        .join(' · ') || (hasContent ? 'Détails ci-dessous' : 'Aucun élément pour cette année')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
                  {gs.weightedAverage20 != null && (
                    <Badge variant="info" size="sm">
                      Moy. notes ~{gs.weightedAverage20.toFixed(2)}/20
                    </Badge>
                  )}
                  {absences > 0 && (
                    <Badge variant="warning" size="sm">
                      {absences} absence(s)
                    </Badge>
                  )}
                </div>
              </button>

              {open && (
                <div className="px-5 pb-5 pt-0 border-t border-gray-100 space-y-6">
                  {/* Synthèse */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                    <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
                      <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Bulletins</p>
                      <p className="text-2xl font-black text-purple-900 mt-1">{rc.length}</p>
                    </div>
                    <div className="rounded-xl bg-pink-50 border border-pink-100 p-4">
                      <p className="text-xs font-medium text-pink-700 uppercase tracking-wide">Conduite</p>
                      <p className="text-2xl font-black text-pink-900 mt-1">{cd.length}</p>
                    </div>
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                      <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Évaluations</p>
                      <p className="text-2xl font-black text-indigo-900 mt-1">{gs.evaluationCount}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                      <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Absences</p>
                      <p className="text-2xl font-black text-amber-900 mt-1">{absences}</p>
                    </div>
                  </div>

                  {/* Bulletins */}
                  {rc.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <FiAward className="w-4 h-4 text-purple-600" />
                        Bulletins & moyennes générales
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {rc.map((r: any) => (
                          <div
                            key={r.id}
                            className="rounded-xl border border-gray-200 bg-white p-4 hover:border-purple-200 transition-colors"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <p className="font-semibold text-gray-900">{r.period}</p>
                                <p className="text-xs text-gray-500">{r.academicYear}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-black text-purple-700">{r.average?.toFixed(2) ?? '—'}</span>
                                <span className="text-sm text-gray-500">/20</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {r.rank != null && (
                                <Badge variant="secondary" size="sm">
                                  Rang {r.rank}
                                </Badge>
                              )}
                              {!r.published && (
                                <Badge variant="warning" size="sm">
                                  Non publié
                                </Badge>
                              )}
                            </div>
                            {r.comments && (
                              <p className="text-sm text-gray-600 mt-3 line-clamp-3 italic">{r.comments}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conduite */}
                  {cd.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <FiStar className="w-4 h-4 text-pink-600" />
                        Conduite & vie scolaire
                      </h4>
                      <div className="space-y-3">
                        {cd.map((c: any) => (
                          <div
                            key={c.id}
                            className="rounded-xl border border-pink-100 bg-gradient-to-r from-pink-50/80 to-white p-4"
                          >
                            <div className="flex flex-wrap justify-between gap-2">
                              <div>
                                <span className="font-semibold text-gray-900">{c.period}</span>
                                <span className="text-gray-400 mx-2">·</span>
                                <span className="text-sm text-gray-600">{c.academicYear}</span>
                              </div>
                              <Badge variant="success" size="sm">
                                Moy. {c.average?.toFixed(2) ?? '—'}/20
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-gray-600">
                              <span>Ponctualité : {c.punctuality?.toFixed(1) ?? '—'}</span>
                              <span>Respect : {c.respect?.toFixed(1) ?? '—'}</span>
                              <span>Participation : {c.participation?.toFixed(1) ?? '—'}</span>
                              <span>Comportement : {c.behavior?.toFixed(1) ?? '—'}</span>
                            </div>
                            {c.comments && (
                              <p className="text-sm text-gray-700 mt-3 border-l-2 border-pink-300 pl-3">{c.comments}</p>
                            )}
                            {c.evaluatedBy && (
                              <p className="text-xs text-gray-400 mt-2">
                                Évalué par {c.evaluatedBy.firstName} {c.evaluatedBy.lastName} ({c.evaluatedBy.role})
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasContent && (
                    <p className="text-sm text-gray-500 py-6 text-center">
                      Aucune donnée enregistrée pour cette année.
                    </p>
                  )}

                  <p className="text-xs text-gray-500 text-right pt-2">
                    Le détail par matière et par évaluation est disponible dans l&apos;onglet « Notes ».
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {searchQuery && filteredByYear.length === 0 && (
        <Card className="text-center py-10 text-gray-500">
          <FiSearch className="w-12 h-12 mx-auto mb-3 opacity-40" />
          Aucune correspondance dans l&apos;historique pour cette recherche.
        </Card>
      )}
    </div>
  );
};

export default StudentAcademicHistory;
