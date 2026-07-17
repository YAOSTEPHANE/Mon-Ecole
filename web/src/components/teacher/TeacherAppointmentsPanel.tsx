"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiCalendar, FiCheck, FiUser, FiX } from "react-icons/fi";
import { teacherApi } from "@/services/api";
import Card from "../ui/Card";

const STATUS_FR: Record<string, string> = {
  PENDING: "En attente de votre réponse",
  CONFIRMED: "Confirmé",
  DECLINED: "Refusé",
  CANCELLED: "Annulé",
  COMPLETED: "Terminé",
};

type AppointmentRow = {
  id: string;
  status: string;
  scheduledStart: string;
  durationMinutes: number;
  topic?: string | null;
  notesParent?: string | null;
  declineReason?: string | null;
  parent: {
    user: { firstName: string; lastName: string; email?: string | null };
  };
  student: {
    user: { firstName: string; lastName: string };
    class?: { name: string } | null;
  };
};

export default function TeacherAppointmentsPanel() {
  const queryClient = useQueryClient();
  const [notesTeacher, setNotesTeacher] = useState<Record<string, string>>({});
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({});

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["teacher-appointments"],
    queryFn: teacherApi.getAppointments,
  });

  const sorted = useMemo(() => {
    const list = [...(appointments as AppointmentRow[])];
    list.sort(
      (a, b) =>
        new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
    );
    return list;
  }, [appointments]);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["teacher-appointments"] });

  const confirmMu = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      teacherApi.confirmAppointment(id, notesTeacher[id]?.trim() || undefined),
    onSuccess: () => {
      toast.success("Rendez-vous confirmé. Le parent a été notifié.");
      invalidate();
      setNotesTeacher({});
    },
    onError: () => toast.error("Action impossible."),
  });

  const declineMu = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      teacherApi.declineAppointment(id, declineReason[id]?.trim() || undefined),
    onSuccess: () => {
      toast.success("Demande déclinée. Le parent a été notifié.");
      invalidate();
      setDeclineReason({});
    },
    onError: () => toast.error("Action impossible."),
  });

  const cancelMu = useMutation({
    mutationFn: (id: string) => teacherApi.cancelTeacherAppointment(id),
    onSuccess: () => {
      toast.success("Rendez-vous annulé.");
      invalidate();
    },
    onError: () => toast.error("Annulation impossible."),
  });

  return (
    <Card>
      <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
        <FiCalendar className="h-5 w-5 text-emerald-600" aria-hidden />
        Rendez-vous avec les familles
      </h3>

      {isLoading ? (
        <p className="text-stone-500 text-sm py-8 text-center">Chargement…</p>
      ) : sorted.length === 0 ? (
        <p className="text-stone-600 text-sm py-8 text-center">
          Aucune demande de rendez-vous pour le moment.
        </p>
      ) : (
        <ul className="space-y-4">
          {sorted.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-stone-200/90 bg-gradient-to-br from-white to-stone-50/80 px-4 py-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">
                    {format(new Date(a.scheduledStart), "EEEE d MMMM yyyy à HH:mm", {
                      locale: fr,
                    })}
                    <span className="text-stone-500 font-normal">
                      {" "}
                      · {a.durationMinutes} min
                    </span>
                  </p>
                  <p className="text-sm text-stone-700 mt-1 flex items-center gap-1.5">
                    <FiUser className="h-3.5 w-3.5 text-stone-400 shrink-0" aria-hidden />
                    Parent : {a.parent.user.firstName} {a.parent.user.lastName}
                  </p>
                  <p className="text-sm text-stone-700">
                    Élève : {a.student.user.firstName} {a.student.user.lastName}
                    {a.student.class?.name ? ` · ${a.student.class.name}` : ""}
                  </p>
                  {a.topic ? (
                    <p className="text-xs text-stone-600 mt-1">
                      <span className="font-medium">Motif :</span> {a.topic}
                    </p>
                  ) : null}
                  {a.notesParent ? (
                    <p className="text-xs text-stone-600 mt-1 border-l-2 border-emerald-200 pl-2 italic">
                      {a.notesParent}
                    </p>
                  ) : null}
                  <p className="text-xs font-semibold text-emerald-900 mt-2">
                    {STATUS_FR[a.status] ?? a.status}
                  </p>
                </div>
              </div>

              {a.status === "PENDING" && (
                <div className="space-y-2 pt-2 border-t border-stone-200/80">
                  <label className="block text-xs font-medium text-stone-600">
                    Note interne (optionnelle, visible après confirmation)
                  </label>
                  <textarea
                    value={notesTeacher[a.id] ?? ""}
                    onChange={(e) =>
                      setNotesTeacher((prev) => ({ ...prev, [a.id]: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                    placeholder="Ex. Documents à prévoir…"
                  />
                  <label className="block text-xs font-medium text-stone-600">
                    Si vous refusez, motif affiché au parent (optionnel)
                  </label>
                  <textarea
                    value={declineReason[a.id] ?? ""}
                    onChange={(e) =>
                      setDeclineReason((prev) => ({ ...prev, [a.id]: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                    placeholder="Proposez un autre créneau par message à l’école si besoin…"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => confirmMu.mutate({ id: a.id })}
                      disabled={confirmMu.isPending || declineMu.isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-sm hover:shadow-md disabled:opacity-50"
                    >
                      <FiCheck className="h-4 w-4" aria-hidden />
                      Confirmer
                    </button>
                    <button
                      type="button"
                      onClick={() => declineMu.mutate({ id: a.id })}
                      disabled={confirmMu.isPending || declineMu.isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-stone-300 text-stone-800 bg-white hover:bg-stone-50 disabled:opacity-50"
                    >
                      <FiX className="h-4 w-4" aria-hidden />
                      Décliner
                    </button>
                  </div>
                </div>
              )}

              {a.status === "CONFIRMED" && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.confirm("Annuler ce rendez-vous ?")) {
                        cancelMu.mutate(a.id);
                      }
                    }}
                    disabled={cancelMu.isPending}
                    className="text-sm font-semibold text-rose-700 hover:text-rose-900 disabled:opacity-50"
                  >
                    Annuler le rendez-vous
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
