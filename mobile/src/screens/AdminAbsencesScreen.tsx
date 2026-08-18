import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  adminApi,
  type AdminAbsence,
  type AdminAttendanceStats,
  type AbsencePermissionStats,
} from '../api/admin';
import { colors } from '../theme';
import {
  PremiumEmpty,
  PremiumInput,
  PremiumKpi,
  PremiumKpiGrid,
  PremiumListItem,
  PremiumPageHeader,
  screenPad,
} from '../components/premium/PremiumUi';

function todayIso(): string {
  return new Date().toISOString().split('T')[0]!;
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0]!;
}

function statusLabel(status: string, excused?: boolean): string {
  if (status === 'PRESENT') return 'Présent';
  if (status === 'LATE') return 'Retard';
  if (status === 'EXCUSED' || excused) return 'Absent justifié';
  return 'Absent';
}

export default function AdminAbsencesScreen() {
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [absences, setAbsences] = useState<AdminAbsence[]>([]);
  const [stats, setStats] = useState<AdminAttendanceStats | null>(null);
  const [permStats, setPermStats] = useState<AbsencePermissionStats | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, statData, perm] = await Promise.all([
        adminApi.getAbsences({ date }),
        adminApi.getAbsenceStats({ from: daysAgoIso(7), to: date }),
        adminApi.getAbsencePermissionStats(),
      ]);
      setAbsences(list);
      setStats(statData);
      setPermStats(perm);
    } catch {
      setAbsences([]);
      setStats(null);
    }
  }, [date]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = () => {
    void (async () => {
      setRefreshing(true);
      await load();
      setRefreshing(false);
    })();
  };

  const summary = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const a of absences) {
      if (a.status === 'PRESENT') present += 1;
      else if (a.status === 'LATE') late += 1;
      else absent += 1;
    }
    return { present, late, absent, total: absences.length };
  }, [absences]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
      <PremiumInput
        value={date}
        onChangeText={setDate}
        placeholder="2026-03-17"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={{ marginTop: 12 }}>
        <PremiumKpiGrid>
          <PremiumKpi icon="list-outline" label="Enregistrements" value={String(summary.total)} />
          <PremiumKpi icon="checkmark-circle-outline" label="Présents" value={String(summary.present)} />
          <PremiumKpi icon="time-outline" label="Retards" value={String(summary.late)} />
          <PremiumKpi icon="alert-circle-outline" label="Absents" value={String(summary.absent)} />
        </PremiumKpiGrid>
      </View>

      {stats ? (
        <View style={styles.periodCard}>
          <Text style={styles.periodTitle}>7 derniers jours</Text>
          <Text style={styles.periodBody}>
            Ponctualité : {stats.punctualityRate} % · {stats.present} présents · {stats.late}{' '}
            retards · {stats.absentUnexcused + stats.excusedAbsent} absences
          </Text>
        </View>
      ) : null}

      {permStats ? (
        <View style={styles.periodCard}>
          <Text style={styles.periodTitle}>Demandes d’absence</Text>
          <Text style={styles.periodBody}>
            {permStats.pending} en attente · {permStats.approved} approuvées ·{' '}
            {permStats.rejected} refusées
          </Text>
        </View>
      ) : null}

      <Text style={styles.listTitle}>Absences du {date}</Text>
    </View>
  );

  if (loading && absences.length === 0) {
    return (
      <View style={screenPad.root}>
        <PremiumPageHeader eyebrow="Administration" title="Assiduité" subtitle="Chargement…" />
        <ActivityIndicator color={colors.gold} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader
        eyebrow="Administration"
        title="Assiduité"
        subtitle={`${summary.total} enregistrement(s) le ${date}`}
      />
      <FlatList
        data={absences}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          <PremiumEmpty icon="calendar-outline" title="Aucune absence" body="Aucun enregistrement pour cette date." />
        }
        renderItem={({ item }) => {
          const name = `${item.student?.user?.firstName ?? ''} ${item.student?.user?.lastName ?? ''}`.trim();
          const cls = item.student?.class?.name;
          const course = item.course?.name;
          return (
            <PremiumListItem
              title={name || 'Élève'}
              subtitle={[cls, course].filter(Boolean).join(' · ') || '—'}
              value={statusLabel(item.status, item.excused)}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { paddingTop: 14, paddingBottom: 8 },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 6 },
  periodCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  periodTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  periodBody: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  listTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginTop: 8, marginBottom: 8 },
});
