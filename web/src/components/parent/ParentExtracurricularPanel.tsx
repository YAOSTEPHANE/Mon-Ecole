"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiCalendar, FiMap } from "react-icons/fi";
import { parentApi } from "@/services/api";
import Card from "../ui/Card";
import Button from "../ui/Button";
import {
  EXTRACURRICULAR_CATEGORY_FR,
  EXTRACURRICULAR_KIND_FR,
  EXTRACURRICULAR_STATUS_FR,
} from "@/lib/extracurricularLabels";

type PortalOffering = {
  id: string;
  kind: string;
  category: string;
  title: string;
  description: string | null;
  academicYear: string;
  supervisorName: string | null;
  meetSchedule: string | null;
  startAt: string | null;
  endAt: string | null;
  location: string | null;
  registrationDeadline: string | null;
  maxParticipants: number | null;
  class: { name: string; level: string } | null;
  _count?: { registrations: number };
};

type RegistrationRow = {
  id: string;
  status: string;
  offering: {
    id: string;
    title: string;
    kind: string;
    category: string;
    startAt: string | null;
    endAt: string | null;
    location: string | null;
    academicYear: string;
  };
};

export default function ParentExtracurricularPanel({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const [academicYear, setAcademicYear] = useState("");

  const params = useMemo(
    () => ({ academicYear: academicYear.trim() || undefined }),
    [academicYear]
  );

  const { data: offerings = [], isLoading: loadOff } = useQuery({
    queryKey: ["parent-extracurricular-offerings", studentId, params],
    queryFn: () => parentApi.getChildExtracurricularOfferings(studentId, params),
  });

  const { data: registrations = [], isLoading: loadReg } = useQuery({
    queryKey: ["parent-extracurricular-regs", studentId, params],
    queryFn: () => parentApi.getChildExtracurricularRegistrations(studentId, params),
  });

  const offRows = offerings as PortalOffering[];
  const regRows = registrations as RegistrationRow[];

  const byOfferingId = useMemo(() => {
    const m = new Map<string, RegistrationRow>();
    for (const r of regRows) m.set(r.offering.id, r);
    return m;
  }, [regRows]);

  const events = useMemo(() => {
    return [...offRows]
      .filter((o) => o.kind === "EVENT" && o.startAt)
      .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime());
  }, [offRows]);

  const enroll = useMutation({
    mutationFn: (offeringId: string) => parentApi.createChildExtracurricularRegistration(studentId, offeringId),
    onSuccess: (data: { _placement?: string }) => {
      const p = (data as { _placement?: string })._placement;
      toast.success(p === "WAITLIST" ? "Inscription en liste d’attente." : "Inscription confirmée.");
      void qc.invalidateQueries({ queryKey: ["parent-extracurricular-regs", studentId] });
      void qc.invalidateQueries({ queryKey: ["parent-extracurricular-offerings", studentId] });
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Impossible de s’inscrire.");
    },
  });

  const unenroll = useMutation({
    mutationFn: (regId: string) => parentApi.deleteChildExtracurricularRegistration(studentId, regId),
    onSuccess: () => {
      toast.success("Inscription annulée.");
      void qc.invalidateQueries({ queryKey: ["parent-extracurricular-regs", studentId] });
      void qc.invalidateQueries({ queryKey: ["parent-extracurricular-offerings", studentId] });
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Erreur");
    },
  });

  return (
    <div className="space-y-4">
      <Card variant="premium" className="!p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0">
              <FiMap className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Activités parascolaires</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Inscriptions aux clubs et événements proposés par l’établissement pour cet enfant.
              </p>
            </div>
          </div>
          <label className="text-xs space-y-1 shrink-0 w-full sm:w-44">
            <span className="text-stone-500 font-medium">Filtrer par année scolaire</span>
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="ex. 2025-2026"
              className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      </Card>

      <Card variant="premium" className="!p-4">
        <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-3">
          <FiCalendar className="w-4 h-4 text-amber-600" aria-hidden />
          Calendrier des événements
        </h4>
        {events.length === 0 ? (
          <p className="text-sm text-stone-500">Aucun événement publié pour la période sélectionnée.</p>
        ) : (
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {events.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-stone-200/90 px-3 py-2 text-sm bg-stone-50/80"
              >
                <p className="text-xs font-semibold text-amber-800">
                  {format(new Date(o.startAt!), "EEE d MMM yyyy · HH:mm", { locale: fr })}
                </p>
                <p className="font-medium text-stone-900">{o.title}</p>
                <p className="text-xs text-stone-600">
                  {EXTRACURRICULAR_CATEGORY_FR[o.category] ?? o.category}
                  {o.location ? ` · ${o.location}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="premium" className="!p-4">
          <h4 className="text-sm font-semibold text-stone-900 mb-3">Offres disponibles</h4>
          {loadOff ? (
            <p className="text-sm text-stone-500">Chargement…</p>
          ) : offRows.length === 0 ? (
            <p className="text-sm text-stone-500">Aucune activité ouverte aux inscriptions.</p>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {offRows.map((o) => {
                const existing = byOfferingId.get(o.id);
                return (
                  <li
                    key={o.id}
                    className="rounded-xl border border-stone-200 px-3 py-2 text-sm space-y-2 bg-white/90"
                  >
                    <div>
                      <p className="font-semibold text-stone-900">{o.title}</p>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {EXTRACURRICULAR_KIND_FR[o.kind] ?? o.kind} ·{" "}
                        {EXTRACURRICULAR_CATEGORY_FR[o.category] ?? o.category}
                      </p>
                      {o.description ? (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-3">{o.description}</p>
                      ) : null}
                      {o.kind === "CLUB" && o.meetSchedule ? (
                        <p className="text-xs text-stone-600 mt-1">{o.meetSchedule}</p>
                      ) : null}
                      {o.kind === "EVENT" && o.startAt ? (
                        <p className="text-xs text-stone-600 mt-1">
                          {format(new Date(o.startAt), "d MMM yyyy HH:mm", { locale: fr })}
                          {o.location ? ` · ${o.location}` : ""}
                        </p>
                      ) : null}
                      {o.registrationDeadline ? (
                        <p className="text-[11px] text-amber-800 mt-1">
                          Inscriptions avant le{" "}
                          {format(new Date(o.registrationDeadline), "d MMM yyyy HH:mm", { locale: fr })}
                        </p>
                      ) : null}
                    </div>
                    {existing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-emerald-800">
                          {EXTRACURRICULAR_STATUS_FR[existing.status] ?? existing.status}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs py-1"
                          disabled={unenroll.isPending}
                          onClick={() => {
                            if (confirm("Retirer l’inscription à cette activité ?")) {
                              unenroll.mutate(existing.id);
                            }
                          }}
                        >
                          Se désinscrire
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        className="text-xs py-1.5 w-full sm:w-auto"
                        disabled={enroll.isPending}
                        onClick={() => enroll.mutate(o.id)}
                      >
                        Inscrire mon enfant
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card variant="premium" className="!p-4">
          <h4 className="text-sm font-semibold text-stone-900 mb-3">Mes inscriptions</h4>
          {loadReg ? (
            <p className="text-sm text-stone-500">Chargement…</p>
          ) : regRows.length === 0 ? (
            <p className="text-sm text-stone-500">Aucune inscription en cours.</p>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto">
              {regRows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-stone-200 px-3 py-2 flex justify-between gap-2 items-start"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900 truncate">{r.offering.title}</p>
                    <p className="text-xs text-stone-600">
                      {EXTRACURRICULAR_STATUS_FR[r.status] ?? r.status} · {r.offering.academicYear}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs py-1 shrink-0"
                    disabled={unenroll.isPending}
                    onClick={() => {
                      if (confirm("Annuler cette inscription ?")) unenroll.mutate(r.id);
                    }}
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
