"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useMemo, useState } from "react";
import { FiBookOpen, FiBriefcase, FiClipboard, FiNavigation } from "react-icons/fi";
import { studentApi } from "@/services/api";
import Card from "../ui/Card";
import {
  ORIENTATION_ADVICE_AUDIENCE_FR,
  ORIENTATION_FOLLOW_UP_STATUS_FR,
  ORIENTATION_PARTNERSHIP_KIND_FR,
  ORIENTATION_PLACEMENT_KIND_FR,
  ORIENTATION_PLACEMENT_STATUS_FR,
} from "@/lib/orientationLabels";

type Catalog = {
  filieres: Record<string, unknown>[];
  partnerships: Record<string, unknown>[];
  aptitudeTests: Record<string, unknown>[];
  advice: Record<string, unknown>[];
};

export default function StudentOrientationPanel() {
  const [academicYear, setAcademicYear] = useState("");
  const params = useMemo(() => ({ academicYear: academicYear.trim() || undefined }), [academicYear]);

  const { data: catalog, isLoading: lc } = useQuery({
    queryKey: ["student-orientation-catalog", params],
    queryFn: () => studentApi.getOrientationCatalog(params),
  });

  const { data: followUps = [], isLoading: lf } = useQuery({
    queryKey: ["student-orientation-followups", params],
    queryFn: () => studentApi.getOrientationFollowUps(params),
  });

  const { data: placements = [], isLoading: lp } = useQuery({
    queryKey: ["student-orientation-placements"],
    queryFn: () => studentApi.getOrientationPlacements(),
  });

  const c = (catalog ?? { filieres: [], partnerships: [], aptitudeTests: [], advice: [] }) as Catalog;

  return (
    <div className="space-y-4">
      <Card variant="premium" className="!p-4 flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
            <FiNavigation className="w-5 h-5" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">Orientation</h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Informations sur les filières, tests d’aptitude, conseils et partenariats. Votre suivi et vos stages
              figurent ci-dessous.
            </p>
          </div>
        </div>
        <label className="text-xs space-y-1 w-full sm:w-44">
          <span className="text-stone-500 font-medium">Filtrer tests (année)</span>
          <input
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="ex. 2025-2026"
            className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
          />
        </label>
      </Card>

      {lc ? (
        <p className="text-sm text-stone-500">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card variant="premium" className="!p-4">
            <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-3">
              <FiBookOpen className="w-4 h-4 text-violet-600" aria-hidden />
              Filières
            </h4>
            <ul className="space-y-3 max-h-64 overflow-y-auto text-sm">
              {c.filieres.map((f) => (
                <li key={String(f.id)} className="rounded-lg border border-stone-200/90 p-3">
                  <p className="font-semibold text-stone-900">{String(f.title)}</p>
                  {f.summary ? <p className="text-xs text-stone-600 mt-1">{String(f.summary)}</p> : null}
                  {f.body ? <p className="text-xs text-stone-700 mt-2 whitespace-pre-wrap line-clamp-6">{String(f.body)}</p> : null}
                </li>
              ))}
              {c.filieres.length === 0 ? <li className="text-stone-500">Aucune fiche.</li> : null}
            </ul>
          </Card>
          <Card variant="premium" className="!p-4">
            <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-3">
              <FiBriefcase className="w-4 h-4 text-violet-600" aria-hidden />
              Partenariats
            </h4>
            <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
              {c.partnerships.map((p) => (
                <li key={String(p.id)} className="rounded-lg border border-stone-200/90 p-2.5">
                  <p className="font-medium">{String(p.organizationName)}</p>
                  <p className="text-xs text-stone-600">{ORIENTATION_PARTNERSHIP_KIND_FR[String(p.kind)]}</p>
                </li>
              ))}
              {c.partnerships.length === 0 ? <li className="text-stone-500">Aucun partenaire.</li> : null}
            </ul>
          </Card>
          <Card variant="premium" className="!p-4">
            <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-3">
              <FiClipboard className="w-4 h-4 text-violet-600" aria-hidden />
              Tests d’aptitude
            </h4>
            <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
              {c.aptitudeTests.map((t) => (
                <li key={String(t.id)} className="rounded-lg border border-stone-200/90 p-2.5">
                  <p className="font-medium">{String(t.title)}</p>
                  {t.testUrl ? (
                    <a href={String(t.testUrl)} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">
                      Lien utile
                    </a>
                  ) : null}
                </li>
              ))}
              {c.aptitudeTests.length === 0 ? <li className="text-stone-500">Aucun test.</li> : null}
            </ul>
          </Card>
          <Card variant="premium" className="!p-4">
            <h4 className="text-sm font-semibold text-stone-900 mb-3">Conseils</h4>
            <ul className="space-y-3 max-h-64 overflow-y-auto text-sm">
              {c.advice
                .filter((a) => a.audience === "ALL" || a.audience === "STUDENT")
                .map((a) => (
                  <li key={String(a.id)} className="rounded-lg border border-stone-200/90 p-3 bg-violet-50/30">
                    <p className="font-semibold">{String(a.title)}</p>
                    <p className="text-[10px] text-stone-500">{ORIENTATION_ADVICE_AUDIENCE_FR[String(a.audience)]}</p>
                    <p className="text-xs text-stone-700 mt-1 whitespace-pre-wrap">{String(a.body)}</p>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="premium" className="!p-4">
          <h4 className="text-sm font-semibold text-stone-900 mb-3">Mon suivi</h4>
          {lf ? (
            <p className="text-sm text-stone-500">Chargement…</p>
          ) : followUps.length === 0 ? (
            <p className="text-sm text-stone-500">Pas encore de suivi enregistré.</p>
          ) : (
            <ul className="space-y-2 text-sm max-h-72 overflow-y-auto">
              {(followUps as Record<string, unknown>[]).map((r) => (
                <li key={String(r.id)} className="rounded-lg border border-stone-200 p-2.5">
                  <p className="font-medium">{String(r.title)}</p>
                  <p className="text-xs text-stone-600">
                    {ORIENTATION_FOLLOW_UP_STATUS_FR[String(r.status)]} · {String(r.academicYear)}
                  </p>
                  {r.notes ? <p className="text-xs mt-1 whitespace-pre-wrap">{String(r.notes)}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card variant="premium" className="!p-4">
          <h4 className="text-sm font-semibold text-stone-900 mb-3">Stages & apprentissages</h4>
          {lp ? (
            <p className="text-sm text-stone-500">Chargement…</p>
          ) : placements.length === 0 ? (
            <p className="text-sm text-stone-500">Aucun stage déclaré.</p>
          ) : (
            <ul className="space-y-2 text-sm max-h-72 overflow-y-auto">
              {(placements as Record<string, unknown>[]).map((r) => (
                <li key={String(r.id)} className="rounded-lg border border-stone-200 p-2.5">
                  <p className="font-medium">{String(r.organizationName)}</p>
                  <p className="text-xs text-stone-600">
                    {ORIENTATION_PLACEMENT_KIND_FR[String(r.kind)]} · {ORIENTATION_PLACEMENT_STATUS_FR[String(r.status)]}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    {format(new Date(String(r.startDate)), "d MMM yyyy", { locale: fr })}
                    {r.endDate ? ` – ${format(new Date(String(r.endDate)), "d MMM yyyy", { locale: fr })}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
