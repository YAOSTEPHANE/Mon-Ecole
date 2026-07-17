"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiEdit2,
  FiList,
  FiMap,
  FiPlus,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import { adminApi } from "@/services/api";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { ADM } from "./adminModuleLayout";
import {
  EXTRACURRICULAR_CATEGORY_FR as CATEGORY_FR,
  EXTRACURRICULAR_KIND_FR as KIND_FR,
  EXTRACURRICULAR_STATUS_FR as STATUS_FR,
} from "@/lib/extracurricularLabels";

const CATEGORIES = Object.keys(CATEGORY_FR) as (keyof typeof CATEGORY_FR)[];

type OfferingRow = {
  id: string;
  kind: string;
  category: string;
  title: string;
  description: string | null;
  academicYear: string;
  classId: string | null;
  supervisorName: string | null;
  meetSchedule: string | null;
  startAt: string | null;
  endAt: string | null;
  location: string | null;
  registrationDeadline: string | null;
  maxParticipants: number | null;
  isPublished: boolean;
  isActive: boolean;
  class: { id: string; name: string; level: string } | null;
  _count?: { registrations: number };
};

type RegistrationRow = {
  id: string;
  status: string;
  student: {
    id: string;
    user: { firstName: string; lastName: string; email?: string };
    class: { name: string; level: string } | null;
  };
};

const emptyForm = () => ({
  kind: "CLUB" as "CLUB" | "EVENT",
  category: "CLUB_ASSOCIATION" as keyof typeof CATEGORY_FR,
  title: "",
  description: "",
  academicYear: String(new Date().getFullYear()) + "-" + String(new Date().getFullYear() + 1),
  classId: "" as string,
  supervisorName: "",
  meetSchedule: "",
  startAt: "",
  endAt: "",
  location: "",
  registrationDeadline: "",
  maxParticipants: "" as string,
  isPublished: false,
  isActive: true,
});

export default function ExtracurricularAdminModule() {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [academicYear, setAcademicYear] = useState("");
  const [kindFilter, setKindFilter] = useState<"" | "CLUB" | "EVENT">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
  const [regStudentId, setRegStudentId] = useState("");

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-extracurricular-classes"],
    queryFn: adminApi.getClasses,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-extracurricular-students"],
    queryFn: adminApi.getStudents,
  });

  const queryParams = useMemo(
    () => ({
      academicYear: academicYear.trim() || undefined,
      kind: kindFilter || undefined,
      category: categoryFilter || undefined,
      classId: classFilter || undefined,
    }),
    [academicYear, kindFilter, categoryFilter, classFilter]
  );

  const { data: offerings = [], isLoading } = useQuery({
    queryKey: ["admin-extracurricular-offerings", queryParams, view],
    queryFn: () =>
      adminApi.getExtracurricularOfferings({
        ...queryParams,
        ...(view === "calendar" ? { kind: "EVENT" as const } : {}),
      }),
  });

  const rows = offerings as OfferingRow[];

  const calendarRows = useMemo(() => {
    return [...rows]
      .filter((r) => r.kind === "EVENT" && r.startAt)
      .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime());
  }, [rows]);

  const { data: registrations = [] } = useQuery({
    queryKey: ["admin-extracurricular-regs", selectedOfferingId],
    queryFn: () => adminApi.getExtracurricularOfferingRegistrations(selectedOfferingId!),
    enabled: !!selectedOfferingId,
  });

  const regRows = registrations as RegistrationRow[];

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const startEdit = (o: OfferingRow) => {
    setEditingId(o.id);
    setForm({
      kind: o.kind === "EVENT" ? "EVENT" : "CLUB",
      category: (CATEGORIES.includes(o.category as keyof typeof CATEGORY_FR)
        ? o.category
        : "OTHER") as keyof typeof CATEGORY_FR,
      title: o.title,
      description: o.description ?? "",
      academicYear: o.academicYear,
      classId: o.classId ?? "",
      supervisorName: o.supervisorName ?? "",
      meetSchedule: o.meetSchedule ?? "",
      startAt: o.startAt ? format(new Date(o.startAt), "yyyy-MM-dd'T'HH:mm") : "",
      endAt: o.endAt ? format(new Date(o.endAt), "yyyy-MM-dd'T'HH:mm") : "",
      location: o.location ?? "",
      registrationDeadline: o.registrationDeadline
        ? format(new Date(o.registrationDeadline), "yyyy-MM-dd'T'HH:mm")
        : "",
      maxParticipants: o.maxParticipants != null ? String(o.maxParticipants) : "",
      isPublished: o.isPublished,
      isActive: o.isActive,
    });
  };

  const toPayload = () => ({
    kind: form.kind,
    category: form.category,
    title: form.title.trim(),
    description: form.description.trim() || null,
    academicYear: form.academicYear.trim(),
    classId: form.classId.trim() || null,
    supervisorName: form.supervisorName.trim() || null,
    meetSchedule: form.meetSchedule.trim() || null,
    startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
    endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
    location: form.location.trim() || null,
    registrationDeadline: form.registrationDeadline
      ? new Date(form.registrationDeadline).toISOString()
      : null,
    maxParticipants: (() => {
      const t = form.maxParticipants.trim();
      if (!t) return null;
      const n = parseInt(t, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    })(),
    isPublished: form.isPublished,
    isActive: form.isActive,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editingId
        ? adminApi.updateExtracurricularOffering(editingId, toPayload())
        : adminApi.createExtracurricularOffering(toPayload()),
    onSuccess: () => {
      toast.success(editingId ? "Activité mise à jour." : "Activité créée.");
      void qc.invalidateQueries({ queryKey: ["admin-extracurricular-offerings"] });
      resetForm();
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Erreur");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteExtracurricularOffering(id),
    onSuccess: () => {
      toast.success("Supprimé.");
      void qc.invalidateQueries({ queryKey: ["admin-extracurricular-offerings"] });
      if (selectedOfferingId) setSelectedOfferingId(null);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Erreur");
    },
  });

  const addRegMutation = useMutation({
    mutationFn: () =>
      adminApi.createExtracurricularRegistration({
        studentId: regStudentId.trim(),
        offeringId: selectedOfferingId!,
      }),
    onSuccess: (data: { _placement?: string }) => {
      const p = (data as { _placement?: string })._placement;
      toast.success(p === "WAITLIST" ? "Ajouté en liste d’attente." : "Inscription enregistrée.");
      void qc.invalidateQueries({ queryKey: ["admin-extracurricular-regs", selectedOfferingId] });
      void qc.invalidateQueries({ queryKey: ["admin-extracurricular-offerings"] });
      setRegStudentId("");
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Erreur");
    },
  });

  const delRegMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteExtracurricularRegistration(id),
    onSuccess: () => {
      toast.success("Inscription retirée.");
      void qc.invalidateQueries({ queryKey: ["admin-extracurricular-regs", selectedOfferingId] });
      void qc.invalidateQueries({ queryKey: ["admin-extracurricular-offerings"] });
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Erreur");
    },
  });

  return (
    <div className={ADM.pageRoot}>
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 p-[1px] shadow-lg">
        <div className="rounded-[15px] bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className={ADM.heroTitle}>Activités parascolaires</h2>
              <p className={`${ADM.heroSub} text-stone-600 max-w-2xl`}>
                Clubs, sports, arts, sorties, voyages : publiez les offres, gérez les inscriptions et consultez le
                calendrier des événements.
              </p>
            </div>
            <FiMap className="w-10 h-10 text-emerald-600 shrink-0 hidden sm:block" aria-hidden />
          </div>
        </div>
      </div>

      <div className={ADM.bigTabRow}>
        <button
          type="button"
          onClick={() => setView("list")}
          className={ADM.bigTabBtn(view === "list", "bg-gradient-to-r from-teal-600 to-emerald-600")}
        >
          <FiList className={ADM.bigTabIcon} aria-hidden />
          Liste des offres
        </button>
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={ADM.bigTabBtn(view === "calendar", "bg-gradient-to-r from-cyan-600 to-teal-600")}
        >
          <FiCalendar className={ADM.bigTabIcon} aria-hidden />
          Calendrier des événements
        </button>
      </div>

      <Card variant="premium" className="!p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-gray-500 font-medium">Année scolaire</span>
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="ex. 2025-2026"
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
          </label>
          {view === "list" && (
            <label className="space-y-1">
              <span className="text-gray-500 font-medium">Type</span>
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as "" | "CLUB" | "EVENT")}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                <option value="">Tous</option>
                <option value="CLUB">Club</option>
                <option value="EVENT">Événement</option>
              </select>
            </label>
          )}
          <label className="space-y-1">
            <span className="text-gray-500 font-medium">Catégorie</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            >
              <option value="">Toutes</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_FR[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-gray-500 font-medium">Classe cible</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            >
              <option value="">Toutes / ouvert</option>
              {(classes as { id: string; name: string }[]).map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card variant="premium" className="!p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className={ADM.h2}>{view === "calendar" ? "Événements à venir" : "Offres"}</h3>
            {isLoading && <span className="text-xs text-gray-500">Chargement…</span>}
          </div>
          <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
            {view === "calendar"
              ? calendarRows.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOfferingId(o.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                      selectedOfferingId === o.id
                        ? "border-emerald-500 bg-emerald-50/80"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-emerald-700">
                      {o.startAt
                        ? format(new Date(o.startAt), "EEE d MMM yyyy HH:mm", { locale: fr })
                        : "—"}
                    </p>
                    <p className="font-semibold text-gray-900">{o.title}</p>
                    <p className="text-xs text-gray-600">{CATEGORY_FR[o.category] ?? o.category}</p>
                    {o.location ? <p className="text-xs text-gray-500 mt-0.5">{o.location}</p> : null}
                  </button>
                ))
              : rows.map((o) => (
                  <div
                    key={o.id}
                    className={`rounded-xl border px-3 py-2 flex flex-col gap-1 ${
                      selectedOfferingId === o.id ? "border-emerald-500 bg-emerald-50/60" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="text-left min-w-0 flex-1"
                        onClick={() => setSelectedOfferingId(o.id)}
                      >
                        <p className="font-semibold text-gray-900 truncate">{o.title}</p>
                        <p className="text-xs text-gray-600">
                          {KIND_FR[o.kind] ?? o.kind} · {CATEGORY_FR[o.category] ?? o.category}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {o.academicYear}
                          {o.class ? ` · ${o.class.name}` : " · Toutes classes"}
                          {typeof o._count?.registrations === "number"
                            ? ` · ${o._count.registrations} inscription(s)`
                            : ""}
                        </p>
                      </button>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label="Modifier"
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
                          onClick={() => startEdit(o)}
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Supprimer"
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("Supprimer cette offre et toutes les inscriptions ?")) {
                              deleteMutation.mutate(o.id);
                            }
                          }}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {!o.isPublished ? (
                      <span className="text-[10px] font-semibold text-amber-700">Brouillon (non publié)</span>
                    ) : null}
                  </div>
                ))}
            {!isLoading && view === "calendar" && calendarRows.length === 0 && (
              <p className="text-sm text-gray-500">Aucun événement avec date de début dans les filtres actuels.</p>
            )}
            {!isLoading && view === "list" && rows.length === 0 && (
              <p className="text-sm text-gray-500">Aucune offre. Créez-en une avec le formulaire ci-contre.</p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card variant="premium" className="!p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className={ADM.h2}>{editingId ? "Modifier l’offre" : "Nouvelle offre"}</h3>
              {editingId ? (
                <Button type="button" variant="secondary" className="text-xs py-1" onClick={resetForm}>
                  Annuler l’édition
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="space-y-1">
                <span className="text-gray-500">Type</span>
                <select
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as "CLUB" | "EVENT" }))}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                >
                  <option value="CLUB">{KIND_FR.CLUB}</option>
                  <option value="EVENT">{KIND_FR.EVENT}</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-gray-500">Catégorie</span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as keyof typeof CATEGORY_FR }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_FR[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-gray-500">Titre</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-gray-500">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-gray-500">Année scolaire</span>
                <input
                  value={form.academicYear}
                  onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-gray-500">Classe (vide = toutes)</span>
                <select
                  value={form.classId}
                  onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                >
                  <option value="">Toutes les classes</option>
                  {(classes as { id: string; name: string }[]).map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-gray-500">Encadrant / responsable</span>
                <input
                  value={form.supervisorName}
                  onChange={(e) => setForm((f) => ({ ...f, supervisorName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
              </label>
              {form.kind === "CLUB" ? (
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-gray-500">Planning / créneaux</span>
                  <textarea
                    value={form.meetSchedule}
                    onChange={(e) => setForm((f) => ({ ...f, meetSchedule: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    placeholder="ex. Mercredis 16h–18h"
                  />
                </label>
              ) : (
                <>
                  <label className="space-y-1">
                    <span className="text-gray-500">Début</span>
                    <input
                      type="datetime-local"
                      value={form.startAt}
                      onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-gray-500">Fin</span>
                    <input
                      type="datetime-local"
                      value={form.endAt}
                      onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-gray-500">Lieu</span>
                    <input
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-gray-500">Date limite d’inscription</span>
                    <input
                      type="datetime-local"
                      value={form.registrationDeadline}
                      onChange={(e) => setForm((f) => ({ ...f, registrationDeadline: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-gray-500">Places max (vide = illimité)</span>
                    <input
                      value={form.maxParticipants}
                      onChange={(e) => setForm((f) => ({ ...f, maxParticipants: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </label>
                </>
              )}
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                />
                <span>Publié sur les portails parent / élève</span>
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <span>Actif</span>
              </label>
            </div>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!form.title.trim() || !form.academicYear.trim() || saveMutation.isPending}
              className="w-full sm:w-auto"
            >
              <FiPlus className="w-4 h-4 mr-1 inline" aria-hidden />
              {editingId ? "Enregistrer" : "Créer l’offre"}
            </Button>
          </Card>

          <Card variant="premium" className="!p-4 space-y-3">
            <h3 className={ADM.h2}>Inscriptions</h3>
            {!selectedOfferingId ? (
              <p className="text-sm text-gray-500">Sélectionnez une offre dans la liste pour voir ou ajouter des inscriptions.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 items-end">
                  <label className="flex-1 min-w-[200px] space-y-1 text-xs">
                    <span className="text-gray-500">Élève</span>
                    <select
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    >
                      <option value="">Choisir…</option>
                      {(students as { id: string; user?: { firstName: string; lastName: string } }[]).map((s) => (
                        <option key={s.id} value={s.id}>
                          {(s.user?.firstName ?? "") + " " + (s.user?.lastName ?? "")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!regStudentId || addRegMutation.isPending}
                    onClick={() => addRegMutation.mutate()}
                  >
                    <FiUser className="w-4 h-4 mr-1 inline" aria-hidden />
                    Inscrire
                  </Button>
                </div>
                <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {regRows.map((r) => (
                    <div key={r.id} className="px-3 py-2 flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {r.student.user.firstName} {r.student.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {r.student.class ? `${r.student.class.name} (${r.student.class.level})` : "—"} ·{" "}
                          {STATUS_FR[r.status] ?? r.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Retirer"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={() => {
                          if (confirm("Retirer cette inscription ?")) delRegMutation.mutate(r.id);
                        }}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {regRows.length === 0 && (
                    <p className="p-3 text-xs text-gray-500">Aucune inscription pour cette offre.</p>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
