import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { adminApi, type LoginLog, type SecurityEvent } from '../api/admin';
import { colors } from '../theme';
import {
  PremiumEmpty,
  PremiumChipRow,
  PremiumFilterChip,
  PremiumListItem,
  PremiumPageHeader,
  screenPad,
} from '../components/premium/PremiumUi';

type ActivityRow = {
  id: string;
  kind: 'login' | 'security';
  title: string;
  description: string;
  when: string;
  ts: number;
  meta?: string;
  success?: boolean;
};

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function mapLoginLogs(logs: LoginLog[]): ActivityRow[] {
  return logs.map((log) => {
    const name = log.user
      ? `${log.user.firstName ?? ''} ${log.user.lastName ?? ''}`.trim()
      : log.email ?? 'Utilisateur';
    return {
      id: `login-${log.id}`,
      kind: 'login',
      title: log.success ? 'Connexion réussie' : 'Connexion échouée',
      description: log.success
        ? `${name} s'est connecté`
        : `Échec pour ${log.email ?? name}${log.reason ? ` — ${log.reason}` : ''}`,
      when: fmtWhen(log.createdAt),
      ts: new Date(log.createdAt).getTime(),
      meta: [log.ipAddress, log.user?.role].filter(Boolean).join(' · ') || undefined,
      success: log.success,
    };
  });
}

function mapSecurityEvents(events: SecurityEvent[]): ActivityRow[] {
  return events.map((event) => ({
    id: `sec-${event.id}`,
    kind: 'security',
    title: event.type,
    description: event.description ?? 'Événement de sécurité',
    when: fmtWhen(event.createdAt),
    ts: new Date(event.createdAt).getTime(),
    meta: [event.severity, event.user?.email, event.ipAddress].filter(Boolean).join(' · ') || undefined,
  }));
}

export default function AdminActivitiesScreen() {
  const [filter, setFilter] = useState<'all' | 'login' | 'security'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<ActivityRow[]>([]);

  const load = useCallback(async () => {
    const [logs, events] = await Promise.all([
      adminApi.getLoginLogs(80),
      adminApi.getSecurityEvents(80),
    ]);
    const merged = [...mapLoginLogs(logs), ...mapSecurityEvents(events)].sort(
      (a, b) => b.ts - a.ts,
    );
    setRows(merged);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = () => {
    void (async () => {
      setRefreshing(true);
      try {
        await load();
      } catch {
        setRows([]);
      } finally {
        setRefreshing(false);
      }
    })();
  };

  const data = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.kind === filter);
  }, [rows, filter]);

  if (loading && rows.length === 0) {
    return (
      <View style={screenPad.root}>
        <PremiumPageHeader eyebrow="Administration" title="Activités" subtitle="Chargement…" />
        <ActivityIndicator color={colors.gold} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader
        eyebrow="Administration"
        title="Activités"
        subtitle={`${data.length} événement(s)`}
      />
      <PremiumChipRow style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        {(['all', 'login', 'security'] as const).map((key) => {
          const label = key === 'all' ? 'Tout' : key === 'login' ? 'Connexions' : 'Sécurité';
          return (
            <PremiumFilterChip
              key={key}
              label={label}
              active={filter === key}
              onPress={() => setFilter(key)}
            />
          );
        })}
      </PremiumChipRow>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={<PremiumEmpty icon="pulse-outline" title="Aucune activité récente." />}
        renderItem={({ item }) => (
          <PremiumListItem
            title={item.title}
            subtitle={[item.description, item.meta, item.when].filter(Boolean).join(' · ')}
            value={item.kind === 'login' ? (item.success ? 'Succès' : 'Échec') : undefined}
            accent={item.kind === 'login' && item.success === false}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24 },
});
