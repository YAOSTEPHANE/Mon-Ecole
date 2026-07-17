"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useMemo, useState } from "react";
import { FiBookOpen, FiBriefcase, FiClipboard, FiNavigation } from "react-icons/fi";
import { parentApi } from "@/services/api";
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

export default function ParentOrientationPanel({ studentId }: { studentId: string | null }) {
  const [academicYear, setAcademicYear] = useState("");
  const params = useMemo(() => ({ academicYear: academicYear.trim() || undefined }), [academicYear]);

  const { data: catalog, isLoading: lc } = useQuery({
    queryKey: ["parent-orientation-catalog", params],
    queryFn: () => parentApi.getOrientationCatalog(params),
  });

  const { data: followUps = [], isLoading: lf } = useQuery({
    queryKey: ["parent-orientation-followups", studentId, params],
    queryFn: () => parentApi.getChildOrientationFollowUps(studentId!, params),
    enabled: !!studentId,
  });

  const { data: placements = [], isLoading: lp } = useQuery({
    queryKey: ["parent-orientation-placements", studentId],
    queryFn: () => parentApi.getChildOrientationPlacements(studentId!),
    enabled: !!studentId,
  });

  const c = (catalog ?? { filieres: [], partnerships: [], aptitudeTests: [], advice: [] }) as Catalog;

  return (
    <div className="space-y-4">
      <Card variant="premium" className="!p-4 flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0">
            <FiNavigation className="w-5 h-5" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">Orientation</h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Filières, tests, conseils et partenariats publiés par l’établissement. Le suivi personnalisé et les stages
              apparaissent lorsqu’un enfant est sélectionné.
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
        <p className="text-sm text-stone-500">Chargement du catalogue…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card variant="premium" className="!p-4">
            <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-3">
              <FiBookOpen className="w-4 h-4 text-violet-600" aria-hidden />
              Filières & voies d’études
            </h4>
            <ul className="space-y-3 max-h-72 overflow-y-auto text-sm">
              {c.filieres.map((f) => (
                <li key={String(f.id)} className="rounded-lg border border-stone-200/90 p-3 bg-white/90">
                  <p className="font-semibold text-stone-900">{String(f.title)}</p>
                  {f.summary ? <p className="text-xs text-stone-600 mt-1">{String(f.summary)}</p> : null}
                  {f.externalUrl ? (
                    <a
                      href={String(f.externalUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline mt-2 inline-block"
                    >
                      Ressource en ligne
                    </a>
                  ) : null}
                </li>
              ))}
              {c.filieres.length === 0 ? <li className="text-stone-500 text-sm">Aucune fiche publiée.</li> : null}
            </ul>
          </Card>
          <Card variant="premium" className="!p-4">
            <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-3">
              <FiBriefcase className="w-4 h-4 text-violet-600" aria-hidden />
              Partenariats
            </h4>
            <ul className="space-y-2 max-h-72 overflow-y-auto text-sm">
              {c.partnerships.map((p) => (
                <li key={String(p.id)} className="rounded-lg border border-stone-200/90 p-2.5">
                  <p className="font-medium text-stone-900">{String(p.organizationName)}</p>
                  <p className="text-xs text-stone-600">{ORIENTATION_PARTNERSHIP_KIND_FR[String(p.kind)] ?? String(p.kind)}</p>
                  {p.website ? (
                    <a href={String(p.website)} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">
                      Site web
                    </a>
                  ) : null}
                </li>
              ))}
              {c.partnerships.length === 0 ? <li className="text-stone-500 text-sm">Aucun partenaire publié.</li> : null}
            </ul>
          </Card>
          <Card variant="premium" className="!p-4">
            <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-3">
              <FiClipboard className="w-4 h-4 text-violet-600" aria-hidden />
              Tests d’aptitude
            </h4>
            <ul className="space-y-2 max-h-72 overflow-y-auto text-sm">
              {c.aptitudeTests.map((t) => (
                <li key={String(t.id)} className="rounded-lg border border-stone-200/90 p-2.5">
                  <p className="font-medium text-stone-900">{String(t.title)}</p>
                  {t.registrationDeadline ? (
                    <p className="text-[11px] text-amber-800 mt-1">
                      Date limite : {format(new Date(String(t.registrationDeadline)), "d MMM yyyy HH:mm", { locale: fr })}
                    </p>
                  ) : null}
                  {t.testUrl ? (
                    <a href={String(t.testUrl)} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                      Infos / inscription
                    </a>
                  ) : null}
                </li>
              ))}
              {c.aptitudeTests.length === 0 ? <li className="text-stone-500 text-sm">Aucun test référencé.</li> : null}
            </ul>
          </Card>
          <Card variant="premium" className="!p-4">
            <h4 className="text-sm font-semibold text-stone-900 mb-3">Conseils d’orientation</h4>
            <ul className="space-y-3 max-h-72 overflow-y-auto text-sm">
              {c.advice
                .filter((a) => a.audience === "ALL" || a.audience === "PARENT")
                .map((a) => (
                  <li key={String(a.id)} className="rounded-lg border border-stone-200/90 p-3 bg-violet-50/40">
                    <p className="font-semibold text-stone-900">{String(a.title)}</p>
                    <p className="text-[10px] text-stone-500 mb-1">{ORIENTATION_ADVICE_AUDIENCE_FR[String(a.audience)]}</p>
                    <p className="text-xs text-stone-700 whitespace-pre-wrap">{String(a.body)}</p>
                  </li>
                ))}
              {c.advice.filter((a) => a.audience === "ALL" || a.audience === "PARENT").length === 0 ? (
                <li className="text-stone-500 text-sm">Aucun conseil publié pour les familles.</li>
              ) : null}
            </ul>
          </Card>
        </div>
      )}

      {studentId ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card variant="premium" className="!p-4">
            <h4 className="text-sm font-semibold text-stone-900 mb-3">Suivi de l’orientation</h4>
            {lf ? (
              <p className="text-sm text-stone-500">Chargement…</p>
            ) : followUps.length === 0 ? (
              <p className="text-sm text-stone-500">Aucune entrée de suivi pour le moment.</p>
            ) : (
              <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
                {(followUps as Record<string, unknown>[]).map((r) => (
                  <li key={String(r.id)} className="rounded-lg border border-stone-200 p-2.5">
                    <p className="font-medium text-stone-900">{String(r.title)}</p>
                    <p className="text-xs text-stone-600">
                      {ORIENTATION_FOLLOW_UP_STATUS_FR[String(r.status)] ?? String(r.status)} · {String(r.academicYear)}
                    </p>
                    {r.notes ? <p className="text-xs text-stone-700 mt-1 whitespace-pre-wrap">{String(r.notes)}</p> : null}
                    {r.nextAppointmentAt ? (
                      <p className="text-[11px] text-indigo-800 mt-1">
                        Prochain rendez-vous : {format(new Date(String(r.nextAppointmentAt)), "d MMM yyyy HH:mm", { locale: fr })}
                      </p>
                    ) : null}
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
              <p className="text-sm text-stone-500">Aucun stage enregistré.</p>
            ) : (
              <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
                {(placements as Record<string, unknown>[]).map((r) => (
                  <li key={String(r.id)} className="rounded-lg border border-stone-200 p-2.5">
                    <p className="font-medium text-stone-900">{String(r.organizationName)}</p>
                    <p className="text-xs text-stone-600">
                      {ORIENTATION_PLACEMENT_KIND_FR[String(r.kind)] ?? String(r.kind)} ·{" "}
                      {ORIENTATION_PLACEMENT_STATUS_FR[String(r.status)] ?? String(r.status)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Du {format(new Date(String(r.startDate)), "d MMM yyyy", { locale: fr })}
                      {r.endDate ? ` au ${format(new Date(String(r.endDate)), "d MMM yyyy", { locale: fr })}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <Card variant="premium" className="!p-4 border-dashed">
          <p className="text-sm text-stone-600">
            Sélectionnez un enfant dans « Mes enfants » pour afficher son suivi d’orientation et ses stages déclarés par
            l’établissement.
          </p>
        </Card>
      )}
    </div>
  );
}
