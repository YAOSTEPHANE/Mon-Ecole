import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import { FiDownload, FiUpload, FiRefreshCw, FiFlag } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MenaDailyPresencePanel = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [csvText, setCsvText] = useState('');

  const { data: status } = useQuery({
    queryKey: ['admin-mena-presence-status'],
    queryFn: () => adminApi.getMenaPresenceStatus(),
    staleTime: 30_000,
  });

  const { data: dayData, isLoading: dayLoading } = useQuery({
    queryKey: ['admin-mena-presence-day', selectedDate],
    queryFn: () => adminApi.getMenaPresenceDay(selectedDate),
  });

  const importMutation = useMutation({
    mutationFn: () =>
      adminApi.importMenaPresenceCsv({
        csv: csvText,
        date: selectedDate,
      }),
    onSuccess: (report) => {
      toast.success(
        `Import : ${report.imported} créé(s), ${report.updated} mis à jour, ${report.unmatched?.length || 0} non apparié(s)`,
      );
      void queryClient.invalidateQueries({ queryKey: ['admin-mena-presence-day'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      toast.error(e.response?.data?.error || 'Échec import CSV');
    },
  });

  const runScheduledMutation = useMutation({
    mutationFn: () => adminApi.runMenaPresenceScheduledImport(),
    onSuccess: () => {
      toast.success('Import dossier/DB lancé');
      void queryClient.invalidateQueries({ queryKey: ['admin-mena-presence-day'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      toast.error(e.response?.data?.error || 'Échec import planifié');
    },
  });

  const downloadTemplate = async () => {
    try {
      const blob = await adminApi.downloadMenaPresenceCsvTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mena-presence-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Impossible de télécharger le modèle');
    }
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    toast.success(`Fichier chargé (${file.name})`);
  };

  const counts = dayData?.counts;
  const rows = useMemo(() => dayData?.rows || [], [dayData]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FiFlag className="text-emerald-600" />
              Présence MENA (journalière)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Les pointeurs restent sur le logiciel MENA. Importez ici le pointage du jour (CSV,
              webhook ou dossier partagé).
            </p>
          </div>
          <input
            type="date"
            aria-label="Date de présence"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-gray-500">Webhook API</p>
            <p className="font-medium">
              {status?.webhookConfigured ? 'Configuré' : 'Non configuré'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Header X-Mena-Presence-Secret</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-gray-500">Dossier partagé</p>
            <p className="font-medium">
              {status?.watchDirConfigured ? status.watchDir || 'Oui' : 'Non configuré'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Cron : {status?.scheduledImportEnabled ? status.cron : 'désactivé'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-gray-500">Base SQL</p>
            <p className="font-medium">{status?.dbConfigured ? 'Configurée' : 'Non configurée'}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2 mb-3">
          <Button variant="secondary" size="sm" onClick={() => void downloadTemplate()}>
            <FiDownload className="mr-1" /> Modèle CSV
          </Button>
          <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <FiUpload />
            Charger un fichier
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] || null)}
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!csvText.trim() || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? 'Import…' : 'Importer le CSV'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={runScheduledMutation.isPending}
            onClick={() => runScheduledMutation.mutate()}
          >
            <FiRefreshCw className="mr-1" /> Lancer dossier/DB
          </Button>
        </div>
        <textarea
          aria-label="Contenu CSV présence MENA"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={6}
          placeholder="matricule,date,statut,heure_arrivee"
          className="w-full font-mono text-xs border border-gray-300 rounded-lg p-3"
        />
        {importMutation.data && (
          <div className="mt-3 text-sm text-gray-700 space-y-1">
            <p>
              Rapport : {importMutation.data.imported} créés, {importMutation.data.updated} mis à
              jour, {(importMutation.data.unmatched || []).length} non appariés,{' '}
              {(importMutation.data.errors || []).length} erreurs.
            </p>
            {(importMutation.data.unmatched || []).slice(0, 8).map(
              (u: { externalId: string; reason: string }) => (
                <p key={u.externalId} className="text-amber-800 text-xs">
                  Non apparié : {u.externalId} — {u.reason}
                </p>
              ),
            )}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold">{counts?.total ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Présents</p>
            <p className="text-xl font-bold text-green-600">{counts?.present ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Absents</p>
            <p className="text-xl font-bold text-red-600">{counts?.absent ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Retards</p>
            <p className="text-xl font-bold text-orange-600">{counts?.late ?? 0}</p>
          </div>
        </div>

        {dayLoading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune présence MENA pour cette date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-2">Élève</th>
                  <th className="py-2 pr-2">Classe</th>
                  <th className="py-2 pr-2">Matricule</th>
                  <th className="py-2 pr-2">Statut</th>
                  <th className="py-2 pr-2">Heure</th>
                  <th className="py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(
                  (row: {
                    id: string;
                    status: string;
                    source: string;
                    checkInAt?: string | null;
                    student?: {
                      studentId?: string;
                      nationalMatricule?: string | null;
                      class?: { name?: string } | null;
                      user?: { firstName?: string; lastName?: string };
                    };
                  }) => (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2">
                        {row.student?.user?.firstName} {row.student?.user?.lastName}
                      </td>
                      <td className="py-2 pr-2">{row.student?.class?.name || '—'}</td>
                      <td className="py-2 pr-2 font-mono text-xs">
                        {row.student?.nationalMatricule || row.student?.studentId || '—'}
                      </td>
                      <td className="py-2 pr-2">
                        <Badge
                          size="sm"
                          variant={
                            row.status === 'PRESENT'
                              ? 'success'
                              : row.status === 'LATE'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {row.status === 'PRESENT'
                            ? 'Présent'
                            : row.status === 'LATE'
                              ? 'Retard'
                              : 'Absent'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2">
                        {row.checkInAt
                          ? format(new Date(row.checkInAt), 'HH:mm', { locale: fr })
                          : '—'}
                      </td>
                      <td className="py-2 text-xs text-gray-500">{row.source}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MenaDailyPresencePanel;
