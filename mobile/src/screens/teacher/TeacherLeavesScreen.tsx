import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../../theme';
import {
  PremiumButton,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumPageHeader,
  screenPad,
} from '../../components/premium/PremiumUi';
import { teacherApi, type TeacherLeaveRow } from '../../api/teacher';

const LEAVE_TYPES = [
  { id: 'ANNUAL', label: 'Congés' },
  { id: 'SICK', label: 'Maladie' },
  { id: 'PERSONAL', label: 'Personnel' },
  { id: 'TRAINING', label: 'Formation' },
  { id: 'OTHER', label: 'Autre' },
] as const;

const STATUS_FR: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
};

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

export default function TeacherLeavesScreen() {
  const [rows, setRows] = useState<TeacherLeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<(typeof LEAVE_TYPES)[number]['id']>('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await teacherApi.getLeaves());
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!startDate.trim() || !endDate.trim()) {
      Alert.alert('Dates requises', 'Indiquez début et fin (AAAA-MM-JJ)');
      return;
    }
    setSaving(true);
    try {
      await teacherApi.createLeave({
        type,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        reason: reason.trim() || undefined,
      });
      setReason('');
      Alert.alert('OK', 'Demande envoyée');
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, screenPad]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.root, screenPad]}>
      <PremiumPageHeader title="Congés" subtitle="Déposez une demande de permission" />
      <View style={styles.form}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {LEAVE_TYPES.map((t) => (
            <PremiumFilterChip
              key={t.id}
              label={t.label}
              active={type === t.id}
              onPress={() => setType(t.id)}
            />
          ))}
        </View>
        <Text style={styles.label}>Début (AAAA-MM-JJ)</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-08-01"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.label}>Fin (AAAA-MM-JJ)</Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2026-08-15"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.label}>Motif (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.area]}
          value={reason}
          onChangeText={setReason}
          multiline
          placeholderTextColor={colors.muted}
        />
        <PremiumButton label={saving ? 'Envoi…' : 'Envoyer la demande'} onPress={() => void submit()} disabled={saving} />
      </View>
      <Text style={styles.section}>Mes demandes</Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<PremiumEmpty icon="calendar-outline" title="Aucune demande" />}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Text style={styles.cardTitle}>
              {LEAVE_TYPES.find((t) => t.id === item.type)?.label ?? item.type}
            </Text>
            <Text style={styles.meta}>
              {formatDay(item.startDate)} → {formatDay(item.endDate)}
            </Text>
            <Text style={styles.status}>{STATUS_FR[item.status] ?? item.status}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { gap: 8, marginBottom: 16 },
  label: { color: colors.ink, fontWeight: '600', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  area: { minHeight: 64, textAlignVertical: 'top' },
  section: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontWeight: '700', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
  status: { marginTop: 6, color: colors.accent, fontWeight: '600' },
});
