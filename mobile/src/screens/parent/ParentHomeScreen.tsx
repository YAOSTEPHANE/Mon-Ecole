import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../hooks/useRealtime';
import { childDisplayName, useParentChild } from '../../context/ParentChildContext';
import { parentApi, type PortalFeedItem } from '../../api/parent';
import { colors } from '../../theme';
import {
  PremiumCard,
  PremiumHero,
  PremiumKpi,
  PremiumKpiGrid,
  PremiumRow,
  screenPad,
} from '../../components/premium/PremiumUi';
import ParentChildPicker from '../ParentChildPicker';
import { fmtDate } from '../../lib/format';

export default function ParentHomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { connected } = useRealtime();
  const { selectedChild, selectedId } = useParentChild();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<{
    childrenCount?: number;
    tuitionUnpaidAmount?: number;
    pendingAppointments?: number;
    unreadNotifications?: number;
  } | null>(null);
  const [feed, setFeed] = useState<PortalFeedItem[]>([]);

  const load = useCallback(async () => {
    try {
      const [kpiData, feedData, announcements, events] = await Promise.all([
        parentApi.getDashboardKpis(),
        parentApi.getPortalFeed().catch(() => []),
        parentApi.getAnnouncements().catch(() => []),
        parentApi.getSchoolCalendarEvents().catch(() => []),
      ]);
      setKpis(kpiData.cards ?? null);
      const merged = [...feedData, ...announcements, ...events].slice(0, 6);
      setFeed(merged);
    } catch {
      setKpis(null);
      setFeed([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load, selectedId]);

  const onRefresh = () => {
    void (async () => {
      setRefreshing(true);
      await load();
      setRefreshing(false);
    })();
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[screenPad.home, { paddingTop: Math.max(insets.top, 12) }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
      }
    >
      <PremiumHero
        eyebrow="Espace parent"
        title={`Bonjour${user?.firstName ? `, ${user.firstName}` : ''}`}
        subtitle={
          selectedChild
            ? `Suivi de ${childDisplayName(selectedChild)}`
            : 'Suivi scolaire de vos enfants'
        }
        connected={connected}
      />

      <ParentChildPicker />

      {loading ? <ActivityIndicator color={colors.gold} style={{ marginBottom: 12 }} /> : null}

      <PremiumKpiGrid>
        <PremiumKpi
          icon="people-outline"
          label="Enfants"
          value={String(kpis?.childrenCount ?? 0)}
        />
        <PremiumKpi
          icon="card-outline"
          label="Impayés"
          value={
            (kpis?.tuitionUnpaidAmount ?? 0) > 0
              ? `${Math.round(kpis?.tuitionUnpaidAmount ?? 0).toLocaleString('fr-FR')} F`
              : 'À jour'
          }
        />
        <PremiumKpi
          icon="calendar-outline"
          label="RDV"
          value={String(kpis?.pendingAppointments ?? 0)}
          hint="en attente"
        />
        <PremiumKpi
          icon="notifications-outline"
          label="Alertes"
          value={String(kpis?.unreadNotifications ?? 0)}
          hint="non lues"
        />
      </PremiumKpiGrid>

      <PremiumCard eyebrow="École" title="Actualités">
        {feed.length === 0 ? (
          <PremiumRow title="Aucune actualité pour le moment" value="—" last />
        ) : (
          feed.map((item, i) => (
            <PremiumRow
              key={String(item.id ?? i)}
              title={item.title || item.type || 'Annonce'}
              subtitle={item.content || item.body || undefined}
              value={fmtDate(item.date || item.startAt || item.publishedAt || item.createdAt)}
              last={i === feed.length - 1}
            />
          ))
        )}
      </PremiumCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
