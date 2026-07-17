import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import {
  fetchNotifications,
  markNotificationRead,
  type AppNotification,
} from '../api/notifications';
import { colors } from '../theme';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.role) return;
    try {
      const data = await fetchNotifications(user.role);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useRealtime(() => {
    void load();
  });

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onPress = async (n: AppNotification) => {
    if (!user?.role || n.read) return;
    try {
      await markNotificationRead(user.role, n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={items.length === 0 ? styles.center : styles.list}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
      ListEmptyComponent={<Text style={styles.empty}>Aucune notification</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.row, !item.read && styles.unread]}
          onPress={() => void onPress(item)}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.content} numberOfLines={3}>
            {item.content}
          </Text>
          <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString('fr-FR')}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, gap: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { color: colors.muted, fontSize: 15 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  unread: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  title: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  content: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 18 },
  meta: { marginTop: 8, fontSize: 11, color: colors.muted },
});
