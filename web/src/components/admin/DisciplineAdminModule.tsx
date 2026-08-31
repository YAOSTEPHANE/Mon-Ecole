"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiAlertTriangle,
  FiBook,
  FiEdit2,
  FiList,
  FiPlus,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import { adminApi } from "@/services/api";
import { defaultRulebookJson } from "@/lib/rulebookContent";
import Card from "../ui/Card";
import Button from "../ui/Button";

const CATEGORY_FR: Record<string, string> = {
  VERBAL_WARNING: "Avertissement verbal",
  WRITTEN_WARNING: "Avertissement écrit",
  REPRIMAND: "Blâme",
  TEMPORARY_EXCLUSION: "Exclusion temporaire",
  DISCIPLINE_COUNCIL_HEARING: "Conseil de discipline (audition)",
  DISCIPLINE_COUNCIL_DECISION: "Conseil de discipline (décision)",
  BEHAVIOR_CONTRACT: "Contrat de comportement",
  OTHER: "Autre",
};

const CATEGORIES = Object.keys(CATEGORY_FR) as (keyof typeof CATEGORY_FR)[];

type RulebookRow = {
  id: string;
  title: string;
  content: string;
  academicYear: string | null;
  effectiveFrom: string;
  isPublished: boolean;
  sortOrder: number;
  createdBy?: { firstName: string; lastName: string } | null;
};

type DisciplinaryRecordRow = {
  id: string;
  studentId: string;
  academicYear: string;
  category: string;
  title: string;
  description: string | null;
  incidentDate: string;
  exclusionStartDate: string | null;
  exclusionEndDate: string | null;
  councilSessionDate: string | null;
  councilDecisionSummary: string | null;
  behaviorContractGoals: string | null;
  behaviorContractReviewAt: string | null;
  behaviorContractStatus: string | null;
  student: {
    user: { firstName: string; lastName: string };
    class: { name: string; level: string } | null;
  };
  recordedBy: { firstName: string; lastName: string; role: string };
};

export default function DisciplineAdminModule() {
  const qc = useQueryClient();
  const [section, setSection] = useState<"rulebook" | "records">("rulebook");

  const { data: rulebooks = [], isLoading: loadingRb } = useQuery({
    queryKey: ["admin-discipline-rulebooks"],
    queryFn: adminApi.getDisciplineRulebooks,
  });

  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: recordsPayload, isLoading: loadingRec } = useQuery({
    queryKey: [
      "admin-discipline-records",
      academicYearFilter,
      classFilter,
      studentFilter,
      categoryFilter,
    ],
    queryFn: () =>
      adminApi.getDisciplineRecords({
        academicYear: academicYearFilter || undefined,
        classId: classFilter || undefined,
        studentId: studentFilter || undefined,
        category: categoryFilter || undefined,
        limit: 100,
      }),
    enabled: section === "records",
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-discipline-students"],
    queryFn: adminApi.getStudents,
    enabled: section === "records",
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-discipline-classes"],
    queryFn: adminApi.getClasses,
    enabled: section === "records",
  });

  const records = (recordsPayload?.records ?? []) as DisciplinaryRecordRow[];

  const [rbForm, setRbForm] = useState({
    title: "Règlement intérieur",
    content: "",
    academicYear: "",
    effectiveFrom: format(new Date(), "yyyy-MM-dd"),
    isPublished: false,
    sortOrder: 0,
  });
  const [editingRbId, setEditingRbId] = useState<string | null>(null);

  const resetRbForm = () => {
    setEditingRbId(null);
    setRbForm({
      title: "Règlement intérieur",
      content: "",
      academicYear: "",
      effectiveFrom: format(new Date(), "yyyy-MM-dd"),
      isPublished: false,
      sortOrder: 0,
    });
  };

  const createRb = useMutation({
    mutationFn: () => adminApi.createDisciplineRulebook(rbForm),
    onSuccess: () => {
      toast.success("Document enregistré.");
      void qc.invalidateQueries({ queryKey: ["admin-discipline-rulebooks"] });
      resetRbForm();
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Erreur");
    },
  });

  const updateRb = useMutation({
    mutationFn: () => adminApi.updateDisciplineRulebook(editingRbId!, rbForm),
    onSuccess: () => {
      toast.success("Document mis à jour.");
      void qc.invalidateQueries({ queryKey: ["admin-discipline-rulebooks"] });
      resetRbForm();
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Erreur");
    },
  });

  const deleteRb = useMutation({
    mutationFn: (id: string) => adminApi.deleteDisciplineRulebook(id),
    onSuccess: (_data, deletedId) => {
      toast.success("Document supprimé.");
      if (editingRbId === deletedId) resetRbForm();
      void qc.invalidateQueries({ queryKey: ["admin-discipline-rulebooks"] });
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string }; status?: number } };
      toast.error(ax.response?.data?.error || "Suppression impossible.");
    },
  });

  const [recForm, setRecForm] = useState({
    studentId: "",
    academicYear: format(new Date(), "yyyy"),
    category: "VERBAL_WARNING" as string,
    title: "",
    description: "",
    incidentDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    exclusionStartDate: "",
    exclusionEndDate: "",
    councilSessionDate: "",
    councilDecisionSummary: "",
    behaviorContractGoals: "",
    behaviorContractReviewAt: "",
    behaviorContractStatus: "ACTIVE",
    notifyParents: false,
  });
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [recModalOpen, setRecModalOpen] = useState(false);

  const openNewRecord = () => {
    setEditingRecId(null);
    setRecForm({
      studentId: studentFilter || "",
      academicYear: academicYearFilter || format(new Date(), "yyyy"),
      category: "VERBAL_WARNING",
      title: "",
      description: "",
      incidentDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      exclusionStartDate: "",
      exclusionEndDate: "",
      councilSessionDate: "",
      councilDecisionSummary: "",
      behaviorContractGoals: "",
      behaviorContractReviewAt: "",
      behaviorContractStatus: "ACTIVE",
      notifyParents: false,
    });
    setRecModalOpen(true);
  };

  const openEditRecord = (r: DisciplinaryRecordRow) => {
    setEditingRecId(r.id);
    setRecForm({
      studentId: r.studentId,
      academicYear: r.academicYear,
      category: r.category,
      title: r.title,
      description: r.description ?? "",
      incidentDate: format(new Date(r.incidentDate), "yyyy-MM-dd'T'HH:mm"),
      exclusionStartDate: r.exclusionStartDate
        ? format(new Date(r.exclusionStartDate), "yyyy-MM-dd'T'HH:mm")
        : "",
      exclusionEndDate: r.exclusionEndDate
        ? format(new Date(r.exclusionEndDate), "yyyy-MM-dd'T'HH:mm")
        : "",
      councilSessionDate: r.councilSessionDate
        ? format(new Date(r.councilSessionDate), "yyyy-MM-dd'T'HH:mm")
        : "",
      councilDecisionSummary: r.councilDecisionSummary ?? "",
      behaviorContractGoals: r.behaviorContractGoals ?? "",
      behaviorContractReviewAt: r.behaviorContractReviewAt
        ? format(new Date(r.behaviorContractReviewAt), "yyyy-MM-dd'T'HH:mm")
        : "",
      behaviorContractStatus: r.behaviorContractStatus ?? "ACTIVE",
      notifyParents: false,
    });
    setRecModalOpen(true);
  };

  const saveRec = useMutation({
    mutationFn: () => {
      const common = {
        academicYear: recForm.academicYear.trim(),
        category: recForm.category,
        title: recForm.title.trim(),
        description: recForm.description.trim() || undefined,
        incidentDate: new Date(recForm.incidentDate).toISOString(),
        exclusionStartDate: recForm.exclusionStartDate
          ? new Date(recForm.exclusionStartDate).toISOString()
          : undefined,
        exclusionEndDate: recForm.exclusionEndDate
          ? new Date(recForm.exclusionEndDate).toISOString()
          : undefined,
        councilSessionDate: recForm.councilSessionDate
          ? new Date(recForm.councilSessionDate).toISOString()
          : undefined,
        councilDecisionSummary: recForm.councilDecisionSummary.trim() || undefined,
        behaviorContractGoals: recForm.behaviorContractGoals.trim() || undefined,
        behaviorContractReviewAt: recForm.behaviorContractReviewAt
          ? new Date(recForm.behaviorContractReviewAt).toISOString()
          : undefined,
        behaviorContractStatus:
          recForm.category === "BEHAVIOR_CONTRACT" ? recForm.behaviorContractStatus : undefined,
      };
      if (editingRecId) {
        return adminApi.updateDisciplineRecord(editingRecId, common);
      }
      return adminApi.createDisciplineRecord({
        ...common,
        studentId: recForm.studentId,
        notifyParents: recForm.notifyParents,
      });
    },
    onSuccess: () => {
      toast.success(editingRecId ? "Acte mis à jour." : "Acte enregistré.");
      void qc.invalidateQueries({ queryKey: ["admin-discipline-records"] });
      setRecModalOpen(false);
      setEditingRecId(null);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error?: string } } };
      toast.error(ax.response?.data?.error || "Erreur");
    },
  });

  const deleteRec = useMutation({
    mutationFn: (id: string) => adminApi.deleteDisciplineRecord(id),
    onSuccess: () => {
      toast.success("Acte supprimé.");
      void qc.invalidateQueries({ queryKey: ["admin-discipline-records"] });
    },
    onError: () => toast.error("Suppression impossible."),
  });

  const studentOptions = useMemo(() => {
    return (students as { id: string; user?: { firstName?: string; lastName?: string } }[]).map(
      (s) => ({
        id: s.id,
        label: [s.user?.firstName, s.user?.lastName].filter(Boolean).join(" ").trim() || s.id,
      })
    );
  }, [students]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSection("rulebook")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            section === "rulebook"
              ? "bg-amber-600 text-white shadow"
              : "bg-stone-100 text-stone-800 hover:bg-stone-200"
          }`}
        >
          <FiBook className="h-4 w-4" aria-hidden />
          Règlement intérieur
        </button>
        <button
          type="button"
          onClick={() => setSection("records")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            section === "records"
              ? "bg-amber-600 text-white shadow"
              : "bg-stone-100 text-stone-800 hover:bg-stone-200"
          }`}
        >
          <FiList className="h-4 w-4" aria-hidden />
          Sanctions & historique
        </button>
      </div>

      {section === "rulebook" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-orange-50/40">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
                <FiAlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  {editingRbId ? "Modifier le document" : "Publier une version du règlement"}
                </h3>
                <p className="text-sm text-stone-600 mt-0.5">
                  Une seule version publiée est visible aux familles, aux élèves et sur la page{' '}
                  <span className="font-medium">À propos → Règlement intérieur</span> (la plus
                  récente par date d’effet).
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                value={rbForm.title}
                onChange={(e) => setRbForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Titre"
              />
              <textarea
                className="w-full min-h-[200px] rounded-xl border border-stone-200 px-3 py-2 text-sm font-mono"
                value={rbForm.content}
                onChange={(e) => setRbForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Texte libre ou JSON { meta, chapters } — voir « Charger le modèle »"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-amber-900 hover:underline"
                  onClick={() =>
                    setRbForm((f) => ({
                      ...f,
                      content: f.content.trim() ? f.content : defaultRulebookJson(),
                    }))
                  }
                >
                  {rbForm.content.trim() ? "Remplacer par le modèle par défaut" : "Charger le modèle par défaut"}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  value={rbForm.academicYear}
                  onChange={(e) => setRbForm((f) => ({ ...f, academicYear: e.target.value }))}
                  placeholder="Année scolaire (optionnel)"
                />
                <input
                  type="date"
                  className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  value={rbForm.effectiveFrom}
                  onChange={(e) => setRbForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={rbForm.isPublished}
                  onChange={(e) => setRbForm((f) => ({ ...f, isPublished: e.target.checked }))}
                />
                Publié (visible portail)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => (editingRbId ? updateRb.mutate() : createRb.mutate())}
                  disabled={createRb.isPending || updateRb.isPending || !rbForm.content.trim()}
                >
                  {editingRbId ? "Mettre à jour" : "Créer"}
                </Button>
                {editingRbId ? (
                  <Button type="button" variant="secondary" onClick={resetRbForm}>
                    Annuler l’édition
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <h4 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
              <FiBook className="h-4 w-4 text-amber-600" aria-hidden />
              Versions enregistrées
            </h4>
            {loadingRb ? (
              <p className="text-sm text-stone-500">Chargement…</p>
            ) : (rulebooks as RulebookRow[]).length === 0 ? (
              <p className="text-sm text-stone-600">Aucun document.</p>
            ) : (
              <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {(rulebooks as RulebookRow[]).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-stone-200/90 bg-white/90 p-3 flex flex-col gap-2"
                  >
                    <div className="flex justify-between gap-2">
                      <p className="font-semibold text-stone-900 text-sm">{r.title}</p>
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          r.isPublished ? "text-emerald-700" : "text-stone-500"
                        }`}
                      >
                        {r.isPublished ? "Publié" : "Brouillon"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      Effet : {format(new Date(r.effectiveFrom), "d MMM yyyy", { locale: fr })}
                      {r.academicYear ? ` · ${r.academicYear}` : ""}
                    </p>
                    <p className="text-xs text-stone-600 line-clamp-3 whitespace-pre-wrap">
                      {r.content}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1"
                        onClick={() => {
                          setEditingRbId(r.id);
                          setRbForm({
                            title: r.title,
                            content: r.content,
                            academicYear: r.academicYear ?? "",
                            effectiveFrom: format(new Date(r.effectiveFrom), "yyyy-MM-dd"),
                            isPublished: r.isPublished,
                            sortOrder: r.sortOrder ?? 0,
                          });
                        }}
                      >
                        <FiEdit2 className="h-3 w-3" aria-hidden />
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-700 hover:underline inline-flex items-center gap-1"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.confirm("Supprimer ce document ?"))
                            deleteRb.mutate(r.id);
                        }}
                      >
                        <FiTrash2 className="h-3 w-3" aria-hidden />
                        Supprimer
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {section === "records" && (
        <>
          <Card>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <FiUser className="h-5 w-5 text-amber-600" aria-hidden />
                  Historique disciplinaire
                </h3>
                <p className="text-sm text-stone-600 mt-1">
                  Avertissements, blâmes, exclusions, conseils de discipline et contrats de comportement.
                </p>
              </div>
              <Button type="button" onClick={openNewRecord} className="inline-flex items-center gap-2">
                <FiPlus className="h-4 w-4" aria-hidden />
                Nouvel acte
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              <select
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">Toutes les classes</option>
                {(classes as { id: string; name: string }[]).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
              >
                <option value="">Tous les élèves</option>
                {studentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                placeholder="Année scolaire"
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
              />
              <select
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Toutes catégories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_FR[c] ?? c}
                  </option>
                ))}
              </select>
            </div>

            {loadingRec ? (
              <p className="text-sm text-stone-500 py-8 text-center">Chargement…</p>
            ) : records.length === 0 ? (
              <p className="text-sm text-stone-600 py-8 text-center">Aucun acte pour ces filtres.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-stone-200/90">
                <table className="min-w-full text-sm">
                  <thead className="bg-stone-100/80 text-left text-xs uppercase text-stone-600">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Élève</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Titre</th>
                      <th className="px-3 py-2 w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-t border-stone-100 hover:bg-amber-50/30">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {format(new Date(r.incidentDate), "dd/MM/yyyy", { locale: fr })}
                        </td>
                        <td className="px-3 py-2">
                          {r.student.user.firstName} {r.student.user.lastName}
                          <span className="block text-xs text-stone-500">
                            {r.student.class?.name ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {CATEGORY_FR[r.category] ?? r.category}
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate" title={r.title}>
                          {r.title}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100"
                              title="Modifier"
                              onClick={() => openEditRecord(r)}
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                              title="Supprimer"
                              onClick={() => {
                                if (
                                  typeof window !== "undefined" &&
                                  window.confirm("Supprimer cet acte ?")
                                )
                                  deleteRec.mutate(r.id);
                              }}
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {recModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <h4 className="font-bold text-lg text-stone-900 mb-4">
                  {editingRecId ? "Modifier l’acte" : "Nouvel acte disciplinaire"}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600">Élève</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                      value={recForm.studentId}
                      onChange={(e) => setRecForm((f) => ({ ...f, studentId: e.target.value }))}
                      disabled={Boolean(editingRecId)}
                    >
                      <option value="">—</option>
                      {studentOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600">Année scolaire</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                      value={recForm.academicYear}
                      onChange={(e) => setRecForm((f) => ({ ...f, academicYear: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600">Catégorie</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                      value={recForm.category}
                      onChange={(e) => setRecForm((f) => ({ ...f, category: e.target.value }))}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_FR[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600">Titre</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                      value={recForm.title}
                      onChange={(e) => setRecForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600">Détail / motivation</label>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm min-h-[80px]"
                      value={recForm.description}
                      onChange={(e) => setRecForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600">Date de l’incident</label>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                      value={recForm.incidentDate}
                      onChange={(e) => setRecForm((f) => ({ ...f, incidentDate: e.target.value }))}
                    />
                  </div>
                  {recForm.category === "TEMPORARY_EXCLUSION" && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-stone-600">Début exclusion</label>
                        <input
                          type="datetime-local"
                          className="mt-1 w-full rounded-xl border border-stone-200 px-2 py-2 text-xs"
                          value={recForm.exclusionStartDate}
                          onChange={(e) =>
                            setRecForm((f) => ({ ...f, exclusionStartDate: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-600">Fin exclusion</label>
                        <input
                          type="datetime-local"
                          className="mt-1 w-full rounded-xl border border-stone-200 px-2 py-2 text-xs"
                          value={recForm.exclusionEndDate}
                          onChange={(e) =>
                            setRecForm((f) => ({ ...f, exclusionEndDate: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}
                  {(recForm.category === "DISCIPLINE_COUNCIL_HEARING" ||
                    recForm.category === "DISCIPLINE_COUNCIL_DECISION") && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-stone-600">Date du conseil</label>
                        <input
                          type="datetime-local"
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                          value={recForm.councilSessionDate}
                          onChange={(e) =>
                            setRecForm((f) => ({ ...f, councilSessionDate: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-600">Synthèse décision</label>
                        <textarea
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm min-h-[72px]"
                          value={recForm.councilDecisionSummary}
                          onChange={(e) =>
                            setRecForm((f) => ({ ...f, councilDecisionSummary: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}
                  {recForm.category === "BEHAVIOR_CONTRACT" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-stone-600">Objectifs du contrat</label>
                        <textarea
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm min-h-[72px]"
                          value={recForm.behaviorContractGoals}
                          onChange={(e) =>
                            setRecForm((f) => ({ ...f, behaviorContractGoals: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-600">Prochain point</label>
                        <input
                          type="datetime-local"
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                          value={recForm.behaviorContractReviewAt}
                          onChange={(e) =>
                            setRecForm((f) => ({ ...f, behaviorContractReviewAt: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-600">Statut du contrat</label>
                        <select
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                          value={recForm.behaviorContractStatus}
                          onChange={(e) =>
                            setRecForm((f) => ({ ...f, behaviorContractStatus: e.target.value }))
                          }
                        >
                          <option value="ACTIVE">Actif</option>
                          <option value="COMPLETED">Terminé</option>
                          <option value="CANCELLED">Annulé</option>
                        </select>
                      </div>
                    </>
                  )}
                  {!editingRecId && (
                    <label className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={recForm.notifyParents}
                        onChange={(e) =>
                          setRecForm((f) => ({ ...f, notifyParents: e.target.checked }))
                        }
                      />
                      Notifier les parents (message + notification)
                    </label>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={() => saveRec.mutate()}
                      disabled={
                        saveRec.isPending ||
                        !recForm.studentId ||
                        !recForm.academicYear.trim() ||
                        !recForm.title.trim()
                      }
                    >
                      Enregistrer
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setRecModalOpen(false)}>
                      Fermer
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
