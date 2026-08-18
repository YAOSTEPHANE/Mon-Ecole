import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { ROLE_LABELS, normalizeRole } from '../lib/roles';
import { colors } from '../theme';
import { adminApi, type AdminDashboard, type AdminDashboardKpis } from '../api/admin';
import {
  PremiumCard,
  PremiumHero,
  PremiumKpi,
  PremiumKpiGrid,
  PremiumRow,
  screenPad,
} from '../components/premium/PremiumUi';

function fmtMoney(value: number | undefined): string {
  if (value == null) return '—';
  return `${Math.round(value).toLocaleString('fr-FR')} F`;
}

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { connected } = useRealtime();
  const role = normalizeRole(user?.role ?? '');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [kpis, setKpis] = useState<AdminDashboardKpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [dash, kpiData] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getDashboardKpis(),
      ]);
      setDashboard(dash);
      setKpis(kpiData);
    } catch {
      setError('Impossible de charger le tableau de bord admin.');
    }
  }, []);

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

  const cards = kpis?.cards;

  if (loading && !dashboard) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[screenPad.home, { paddingTop: Math.max(insets.top, 12) }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <PremiumHero
        eyebrow="Direction"
        title={`Bonjour${user?.firstName ? `, ${user.firstName}` : ''}`}
        subtitle={ROLE_LABELS[role] || 'Administration'}
        connected={connected}
      />

      {error ? (
        <PremiumCard title="Erreur">
          <Text style={styles.errorText}>{error}</Text>
        </PremiumCard>
      ) : null}

      {dashboard ? (
        <PremiumKpiGrid>
          <PremiumKpi icon="people-outline" label="Élèves" value={String(dashboard.activeStudents)} hint="Actifs" />
          <PremiumKpi icon="albums-outline" label="Classes" value={String(dashboard.totalClasses)} />
          <PremiumKpi icon="briefcase-outline" label="Enseignants" value={String(dashboard.totalTeachers)} />
        </PremiumKpiGrid>
      ) : null}

      {cards ? (
        <PremiumCard eyebrow="Pilotage" title="Indicateurs">
          <PremiumKpiGrid>
            <PremiumKpi
              icon="person-add-outline"
              label="Admissions"
              value={String(cards.admissionsPending ?? 0)}
              hint={cards.admissionsUnderReview ? `${cards.admissionsUnderReview} en examen` : 'En attente'}
            />
            <PremiumKpi
              icon="card-outline"
              label="Impayés"
              value={fmtMoney(cards.tuitionUnpaidAmount)}
              hint={cards.tuitionUnpaidCount != null ? `${cards.tuitionUnpaidCount} dossier(s)` : undefined}
            />
            <PremiumKpi
              icon="trending-up-outline"
              label="30 jours"
              value={fmtMoney(cards.paymentsCompleted30dAmount)}
            />
            <PremiumKpi
              icon="checkmark-circle-outline"
              label="Présence"
              value={cards.attendancePresenceRate != null ? `${cards.attendancePresenceRate} %` : '—'}
              hint={`${cards.attendancePresentUnique ?? 0} présents aujourd’hui`}
            />
          </PremiumKpiGrid>
        </PremiumCard>
      ) : null}

      {dashboard?.classDistribution && dashboard.classDistribution.length > 0 ? (
        <PremiumCard eyebrow="Effectifs" title="Répartition par classe">
          {dashboard.classDistribution.slice(0, 8).map((row, i, arr) => (
            <PremiumRow
              key={row.name}
              title={row.name}
              value={String(row.value)}
              last={i === arr.length - 1}
            />
          ))}
        </PremiumCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  errorText: { color: colors.danger, fontSize: 14 },
});
