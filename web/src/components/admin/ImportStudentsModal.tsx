"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FiDownload, FiUpload } from "react-icons/fi";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { adminApi } from "@/services/api";
import { downloadStudentImportTemplate, readCsvFile } from "@/lib/studentImport";
import { PASSWORD_POLICY_HINT } from "@/lib/passwordPolicy";

type ImportReport = Awaited<ReturnType<typeof adminApi.importStudentsCsv>>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ImportStudentsModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  const reset = () => {
    setFileName(null);
    setCsvText("");
    setDefaultPassword("");
    setReport(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const importMutation = useMutation({
    mutationFn: () =>
      adminApi.importStudentsCsv({
        csv: csvText,
        ...(defaultPassword.trim() ? { defaultPassword: defaultPassword.trim() } : {}),
      }),
    onSuccess: (data) => {
      setReport(data);
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      if (data.created > 0) {
        toast.success(`${data.created} élève(s) inscrit(s) sur ${data.total}`);
      } else {
        toast.error("Aucun élève inscrit — vérifiez le rapport d’erreurs");
      }
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      toast.error(e.response?.data?.error || "Échec de l’import CSV");
    },
  });

  const onFileChange = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await readCsvFile(file);
      setCsvText(text);
      setFileName(file.name);
      setReport(null);
    } catch {
      toast.error("Impossible de lire le fichier");
    }
  };

  const downloadTemplate = async () => {
    try {
      const blob = await adminApi.downloadStudentImportCsvTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modele-import-eleves.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      downloadStudentImportTemplate();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Inscription en masse (CSV)" size="lg">
      <div className="space-y-4 text-sm">
        <p className="text-xs text-stone-600 leading-relaxed">
          Téléchargez le modèle, remplissez une ligne par élève (séparateur{" "}
          <code className="rounded bg-stone-100 px-1">;</code>), puis importez le fichier. Colonnes
          obligatoires : N° élève, Nom, Prénom, Date naissance (JJ/MM/AAAA), Genre (M/F). La classe
          doit correspondre au nom exact d’une classe existante.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void downloadTemplate()}>
            <FiDownload className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden />
            Télécharger le modèle
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <FiUpload className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden />
            Choisir un fichier
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
          />
        </div>

        {fileName && (
          <p className="text-xs text-stone-700">
            Fichier : <strong>{fileName}</strong>
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Mot de passe par défaut (optionnel)
          </label>
          <input
            type="text"
            value={defaultPassword}
            onChange={(e) => setDefaultPassword(e.target.value)}
            placeholder="Utilisé si la colonne Mot de passe est vide"
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          <p className="mt-1 text-[11px] text-stone-500">{PASSWORD_POLICY_HINT}</p>
          <p className="mt-1 text-[11px] text-stone-500">
            Sans e-mail, un mot de passe est obligatoire (colonne ou valeur par défaut). Avec e-mail
            et sans mot de passe, une invitation de création de mot de passe est envoyée.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
            Fermer
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!csvText.trim() || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? "Import…" : "Importer et inscrire"}
          </Button>
        </div>

        {report && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 space-y-2">
            <p className="text-xs font-semibold text-stone-800">
              Résultat : {report.created} créé(s), {report.failed} échec(s) sur {report.total}
            </p>
            {report.results.some((r) => !r.ok) && (
              <ul className="max-h-40 overflow-y-auto text-[11px] text-rose-800 space-y-1">
                {report.results
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <li key={`${r.line}-${r.studentId}`}>
                      Ligne {r.line} ({r.studentId}) : {r.error}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
