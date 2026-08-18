import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { normalizeRole } from '../lib/roles';
import { studentApi, type StudentAbsence } from '../api/student';
import {
  parentApi,
  type AbsencePermissionRequest,
  type ParentAbsence,
} from '../api/parent';
import ParentChildPicker from './ParentChildPicker';
import { useParentChild } from '../context/ParentChildContext';
import {
  PremiumButton,
  PremiumCard,
  PremiumChipRow,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumInput,
  PremiumListItem,
  PremiumPageHeader,
  PremiumRow,
  screenPad,
} from '../components/premium/PremiumUi';
import { apiError } from '../lib/format';

function statusLabel(a: { excused?: boolean; status?: string | null }) {
  const status = (a.status ?? '').toUpperCase();
  if (status === 'PRESENT') return 'Présent';
  if (status === 'LATE') return 'Retard';
  if (status === 'EXCUSED' || a.excused) return 'Justifiée';
  return 'Non justifiée';
}

const MOTIF: Array<{ id: 'MEDICAL' | 'FAMILIAL' | 'OTHER'; label: string }> = [
  { id: 'MEDICAL', label: 'Médical' },
  { id: 'FAMILIAL', label: 'Familial' },
  { id: 'OTHER', label: 'Autre' },
];

const REQ_STATUS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};

export default function AbsencesScreen() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role ?? '');
  const { selectedId: parentChildId } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<StudentAbsence | ParentAbsence>>([]);
  const [dailyPresence, setDailyPresence] = useState<
    Array<{ id?: string; date: string; status?: string }>
  >([]);
  const [requests, setRequests] = useState<AbsencePermissionRequest[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [motif, setMotif] = useState<'MEDICAL' | 'FAMILIAL' | 'OTHER'>('MEDICAL');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setItems([]);
        setDailyPresence([]);
        setRequests([]);
        if (role === 'STUDENT') {
          setItems(await studentApi.getAbsences());
          setDailyPresence(await studentApi.getDailyPresence({ limit: 7 }));
          return;
        }
        if (role === 'PARENT' && parentChildId) {
          const [abs, daily, reqs] = await Promise.all([
            parentApi.getChildAbsences(parentChildId),
            parentApi.getChildDailyPresence(parentChildId, { limit: 7 }),
            parentApi.getChildAbsencePermissionRequests(parentChildId),
          ]);
          setItems(abs);
          setDailyPresence(daily);
          setRequests(reqs);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [role, parentChildId]);

  const rows = useMemo(
    () =>
      items.map((a) => ({
        id: String(a.id || `${a.course?.name}-${a.date}`),
        title: a.course?.name ?? 'Cours',
        subtitle: a.date ? new Date(a.date).toLocaleDateString('fr-FR') : '',
        value: statusLabel(a),
      })),
    [items],
  );

  const submitRequest = async () => {
    if (!parentChildId || !startDate.trim() || !endDate.trim() || !reason.trim()) {
      Alert.alert('Demande', 'Dates et motif détaillé sont requis.');
      return;
    }
    try {
      setSaving(true);
      await parentApi.createChildAbsencePermissionRequest(parentChildId, {
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        motif,
        reasonDetail: reason.trim(),
      });
      setReason('');
      setRequests(await parentApi.getChildAbsencePermissionRequests(parentChildId));
      Alert.alert('Envoyée', 'Demande d’absence transmise à l’administration.');
    } catch (err) {
      Alert.alert('Erreur', apiError(err, 'Demande impossible.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader eyebrow="Vie scolaire" title="Absences" subtitle={`${rows.length} enregistrement(s)`} />
      <View style={screenPad.fill}>
        {role === 'PARENT' ? <ParentChildPicker /> : null}
        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(r) => r.id}
            ListHeaderComponent={
              <>
                {dailyPresence.length > 0 ? (
                  <PremiumCard eyebrow="Assiduité" title="7 derniers jours">
                    {dailyPresence.map((d, idx) => {
                      const status = (d.status ?? '').toUpperCase();
                      const label =
                        status === 'PRESENT'
                          ? 'Présent'
                          : status === 'ABSENT'
                            ? 'Absent'
                            : status === 'LATE'
                              ? 'Retard'
                              : status === 'EXCUSED'
                                ? 'Excusé'
                                : status || '—';
                      return (
                        <PremiumRow
                          key={d.id ?? String(idx)}
                          title={d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '—'}
                          value={label}
                          last={idx === dailyPresence.length - 1}
                        />
                      );
                    })}
                  </PremiumCard>
                ) : null}
                {role === 'PARENT' ? (
                  <PremiumCard eyebrow="Justificatif" title="Demander une absence">
                    <PremiumInput
                      placeholder="Début (AAAA-MM-JJ)"
                      value={startDate}
                      onChangeText={setStartDate}
                      autoCapitalize="none"
                      style={{ marginBottom: 8 }}
                    />
                    <PremiumInput
                      placeholder="Fin (AAAA-MM-JJ)"
                      value={endDate}
                      onChangeText={setEndDate}
                      autoCapitalize="none"
                      style={{ marginBottom: 8 }}
                    />
                    <PremiumChipRow>
                      {MOTIF.map((m) => (
                        <PremiumFilterChip
                          key={m.id}
                          label={m.label}
                          active={motif === m.id}
                          onPress={() => setMotif(m.id)}
                        />
                      ))}
                    </PremiumChipRow>
                    <PremiumInput
                      placeholder="Détail du motif"
                      value={reason}
                      onChangeText={setReason}
                      style={{ marginBottom: 10 }}
                    />
                    <PremiumButton label="Envoyer la demande" onPress={() => void submitRequest()} loading={saving} />
                    {requests.map((r) => (
                      <PremiumListItem
                        key={r.id}
                        title={`${new Date(r.startDate).toLocaleDateString('fr-FR')} → ${new Date(r.endDate).toLocaleDateString('fr-FR')}`}
                        subtitle={r.reasonDetail || r.motif}
                        value={REQ_STATUS[r.status] ?? r.status}
                      />
                    ))}
                  </PremiumCard>
                ) : null}
              </>
            }
            ListEmptyComponent={
              <PremiumEmpty icon="calendar-outline" title="Aucune absence" body="Rien à signaler pour le moment." />
            }
            renderItem={({ item }) => (
              <PremiumListItem title={item.title} subtitle={item.subtitle} value={item.value} />
            )}
          />
        )}
      </View>
    </View>
  );
}
