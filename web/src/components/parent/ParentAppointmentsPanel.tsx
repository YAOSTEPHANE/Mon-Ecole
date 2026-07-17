"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiCalendar, FiClock, FiUser } from "react-icons/fi";
import { parentApi } from "@/services/api";
import Card from "../ui/Card";

const STATUS_FR: Record<string, string> = {
  PENDING: "En attente de réponse",
  CONFIRMED: "Confirmé",
  DECLINED: "Refusé",
  CANCELLED: "Annulé",
  COMPLETED: "Terminé",
};

const DOW_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

type AvailabilitySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label?: string | null;
};

type TeacherOption = {
  teacherId: string;
  label: string;
  firstName: string;
  lastName: string;
  email: string | null;
  availabilitySlots?: AvailabilitySlot[];
};

function localInputToIso(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Date invalide");
  return d.toISOString();
}

type AppointmentRow = {
  id: string;
  status: string;
  scheduledStart: string;
  durationMinutes: number;
  topic?: string | null;
  declineReason?: string | null;
  teacher: {
    user: { firstName: string; lastName: string };
  };
  student: {
    user: { firstName: string; lastName: string };
    class?: { name: string } | null;
  };
};

export default function ParentAppointmentsPanel() {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [topic, setTopic] = useState("");
  const [notesParent, setNotesParent] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleLocal, setRescheduleLocal] = useState("");
  const [rescheduleDuration, setRescheduleDuration] = useState(30);

  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ["parent-children"],
    queryFn: parentApi.getChildren,
  });

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["parent-appointments"],
    queryFn: parentApi.getAppointments,
  });

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ["parent-appointment-teachers", studentId],
    queryFn: () => parentApi.getAppointmentTeachers(studentId),
    enabled: Boolean(studentId),
  });

  const selectedTeacher = useMemo(() => {
    const list = teachers as TeacherOption[];
    return list.find((t) => t.teacherId === teacherId);
  }, [teachers, teacherId]);

  const sortedAppointments = useMemo(() => {
    const list = [...(appointments as AppointmentRow[])];
    list.sort(
      (a, b) =>
        new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()
    );
    return list;
  }, [appointments]);

  const createMu = useMutation({
    mutationFn: () =>
      parentApi.createAppointment({
        studentId,
        teacherId,
        scheduledStart: localInputToIso(scheduledLocal),
        durationMinutes,
        topic: topic.trim() || undefined,
        notesParent: notesParent.trim() || undefined,
      }),
    onSuccess: (data: { status?: string }) => {
      if (data?.status === "CONFIRMED") {
        toast.success("Rendez-vous confirmé.");
      } else {
        toast.success("Demande de rendez-vous envoyée.");
      }
      void queryClient.invalidateQueries({ queryKey: ["parent-appointments"] });
      setTeacherId("");
      setScheduledLocal("");
      setTopic("");
      setNotesParent("");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Impossible d’envoyer la demande.");
    },
  });

  const cancelMu = useMutation({
    mutationFn: (id: string) => parentApi.cancelParentAppointment(id),
    onSuccess: () => {
      toast.success("Rendez-vous annulé.");
      void queryClient.invalidateQueries({ queryKey: ["parent-appointments"] });
    },
    onError: () => toast.error("Annulation impossible."),
  });

  const rescheduleMu = useMutation({
    mutationFn: () =>
      parentApi.rescheduleParentAppointment(rescheduleId!, {
        scheduledStart: localInputToIso(rescheduleLocal),
        durationMinutes: rescheduleDuration,
      }),
    onSuccess: () => {
      toast.success("Nouvelle date proposée. L’enseignant doit confirmer.");
      void queryClient.invalidateQueries({ queryKey: ["parent-appointments"] });
      setRescheduleId(null);
      setRescheduleLocal("");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Reprogrammation impossible.");
    },
  });

  const startOrToggleReschedule = (a: AppointmentRow) => {
    if (rescheduleId === a.id) {
      setRescheduleId(null);
      return;
    }
    setRescheduleId(a.id);
    setRescheduleLocal(format(new Date(a.scheduledStart), "yyyy-MM-dd'T'HH:mm"));
    setRescheduleDuration(a.durationMinutes);
  };

  const childOptions = useMemo(
    () =>
      (children as { id: string; user?: { firstName?: string; lastName?: string } }[]).map(
        (c) => ({
          id: c.id,
          label: [c.user?.firstName, c.user?.lastName].filter(Boolean).join(" ").trim() || "Élève",
        })
      ),
    [children]
  );

  return (
    <div className="space-y-6">
      <Card className="border border-orange-200/80 bg-gradient-to-br from-orange-50/90 to-amber-50/50">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md">
            <FiClock className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">Proposer un rendez-vous</h3>
            <p className="text-sm text-stone-600 mt-0.5 leading-relaxed">
              Choisissez un enfant, un enseignant (professeur principal ou matière), puis une date et une heure.
              L’enseignant recevra une notification et pourra confirmer ou proposer un autre créneau en vous répondant via l’école.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pa-child" className="block text-sm font-medium text-stone-800 mb-1.5">
              Enfant concerné
            </label>
            <select
              id="pa-child"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                setTeacherId("");
              }}
              className="w-full px-4 py-3 border-2 border-stone-200/90 rounded-xl bg-white/95 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              disabled={loadingChildren}
              aria-label="Enfant concerné par le rendez-vous"
            >
              <option value="">— Sélectionner —</option>
              {childOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pa-teacher" className="block text-sm font-medium text-stone-800 mb-1.5">
              Enseignant
            </label>
            <select
              id="pa-teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-stone-200/90 rounded-xl bg-white/95 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              disabled={!studentId || loadingTeachers}
              aria-label="Enseignant pour le rendez-vous"
            >
              <option value="">
                {!studentId ? "— Choisir un enfant d’abord —" : loadingTeachers ? "Chargement…" : "— Sélectionner —"}
              </option>
              {(teachers as TeacherOption[]).map((t) => (
                <option key={t.teacherId} value={t.teacherId}>
                  {t.label} · {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
            {selectedTeacher ? (
              (selectedTeacher.availabilitySlots?.length ?? 0) > 0 ? (
                <ul className="mt-2 text-xs text-stone-600 space-y-0.5 list-disc list-inside">
                  {selectedTeacher.availabilitySlots!.map((s) => (
                    <li key={`${s.dayOfWeek}-${s.startTime}-${s.endTime}-${s.label ?? ""}`}>
                      {DOW_LABELS[s.dayOfWeek] ?? `Jour ${s.dayOfWeek}`} · {s.startTime}–{s.endTime}
                      {s.label ? ` (${s.label})` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-stone-500 mt-2">
                  Aucun créneau de disponibilité renseigné : vous pouvez proposer une date librement.
                </p>
              )
            ) : null}
            {studentId && !loadingTeachers && teachers.length === 0 ? (
              <p className="text-xs text-amber-800 mt-1.5">
                Aucun enseignant disponible : vérifiez que l’enfant est affecté à une classe.
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="pa-datetime" className="block text-sm font-medium text-stone-800 mb-1.5">
              Date et heure souhaitées
            </label>
            <input
              id="pa-datetime"
              type="datetime-local"
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
              className="w-full px-4 py-3 border-2 border-stone-200/90 rounded-xl bg-white/95 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              aria-label="Date et heure souhaitées pour le rendez-vous"
            />
            <p className="text-[11px] text-stone-500 mt-1">Au moins 30 minutes à l’avance.</p>
          </div>

          <div>
            <label htmlFor="pa-duration" className="block text-sm font-medium text-stone-800 mb-1.5">
              Durée
            </label>
            <select
              id="pa-duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-stone-200/90 rounded-xl bg-white/95 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              aria-label="Durée du rendez-vous en minutes"
            >
              {[15, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-800 mb-1.5">Motif (optionnel)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex. Suivi scolarité, projet orientation…"
              className="w-full px-4 py-3 border-2 border-stone-200/90 rounded-xl bg-white/95 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-800 mb-1.5">Message pour l’enseignant (optionnel)</label>
            <textarea
              value={notesParent}
              onChange={(e) => setNotesParent(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-stone-200/90 rounded-xl bg-white/95 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-y min-h-[88px]"
              placeholder="Précisions utiles avant l’entretien…"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => createMu.mutate()}
          disabled={
            createMu.isPending ||
            !studentId ||
            !teacherId ||
            !scheduledLocal
          }
          className="mt-4 w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {createMu.isPending ? "Envoi…" : "Envoyer la demande"}
        </button>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
          <FiCalendar className="h-5 w-5 text-orange-600" aria-hidden />
          Mes rendez-vous
        </h3>

        {loadingAppts ? (
          <p className="text-stone-500 text-sm py-8 text-center">Chargement…</p>
        ) : sortedAppointments.length === 0 ? (
          <p className="text-stone-600 text-sm py-8 text-center">
            Aucun rendez-vous pour le moment.
          </p>
        ) : (
          <ul className="space-y-3">
            {sortedAppointments.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-stone-200/90 bg-white/90 px-4 py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-stone-900">
                    {format(new Date(a.scheduledStart), "EEEE d MMMM yyyy à HH:mm", {
                      locale: fr,
                    })}
                    <span className="text-stone-500 font-normal">
                      {" "}
                      · {a.durationMinutes} min
                    </span>
                  </p>
                  <p className="text-sm text-stone-700 flex items-center gap-1.5 flex-wrap">
                    <FiUser className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
                    <span>
                      {a.student.user.firstName} {a.student.user.lastName}
                      {a.student.class?.name ? ` · ${a.student.class.name}` : ""}
                    </span>
                  </p>
                  <p className="text-sm text-stone-700">
                    Avec {a.teacher.user.firstName} {a.teacher.user.lastName}
                  </p>
                  {a.topic ? (
                    <p className="text-xs text-stone-600">
                      <span className="font-medium text-stone-700">Motif :</span> {a.topic}
                    </p>
                  ) : null}
                  <p className="text-xs font-semibold text-amber-900">
                    {STATUS_FR[a.status] ?? a.status}
                  </p>
                  {a.status === "DECLINED" && a.declineReason ? (
                    <p className="text-xs text-stone-600 italic border-l-2 border-amber-300 pl-2">
                      {a.declineReason}
                    </p>
                  ) : null}
                </div>
                {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                  <div className="shrink-0 flex flex-col gap-3 w-full sm:w-auto sm:min-w-[220px]">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => startOrToggleReschedule(a)}
                        disabled={cancelMu.isPending || rescheduleMu.isPending}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100 transition disabled:opacity-50"
                      >
                        {rescheduleId === a.id ? "Fermer" : "Reprogrammer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.confirm("Annuler ce rendez-vous ?")) {
                            cancelMu.mutate(a.id);
                          }
                        }}
                        disabled={cancelMu.isPending || rescheduleMu.isPending}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100 transition disabled:opacity-50"
                      >
                        Annuler
                      </button>
                    </div>
                    {rescheduleId === a.id ? (
                      <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 p-3 space-y-2">
                        <p className="text-xs font-medium text-stone-700">Nouvelle date proposée</p>
                        <input
                          type="datetime-local"
                          value={rescheduleLocal}
                          onChange={(e) => setRescheduleLocal(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white"
                          aria-label="Nouvelle date et heure"
                        />
                        <select
                          value={rescheduleDuration}
                          onChange={(e) => setRescheduleDuration(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white"
                          aria-label="Durée du rendez-vous reprogrammé"
                        >
                          {[15, 30, 45, 60].map((m) => (
                            <option key={m} value={m}>
                              {m} min
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => rescheduleMu.mutate()}
                          disabled={rescheduleMu.isPending || !rescheduleLocal}
                          className="w-full px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 disabled:opacity-50"
                        >
                          {rescheduleMu.isPending ? "Envoi…" : "Envoyer la proposition"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
