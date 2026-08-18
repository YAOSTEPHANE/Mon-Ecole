import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../api/notifications';
import { colors } from '../theme';
import {
  PremiumButton,
  PremiumEmpty,
  PremiumListItem,
  PremiumPageHeader,
  screenPad,
} from '../components/premium/PremiumUi';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.role) return;
    try {
      setItems(await fetchNotifications(user.role));
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

  const unread = items.filter((n) => !n.read).length;

  const onPress = async (n: AppNotification) => {
    if (!user?.role || n.read) return;
    try {
      await markNotificationRead(user.role, n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader
        eyebrow="Centre"
        title="Alertes"
        subtitle={unread > 0 ? `${unread} non lue(s)` : 'Tout est à jour'}
      />
      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={screenPad.body}
          refreshControl={
            <RefreshControl
              tintColor={colors.gold}
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          ListHeaderComponent={
            unread > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <PremiumButton
                  label="Tout marquer comme lu"
                  variant="ghost"
                  onPress={() => {
                    void (async () => {
                      if (!user?.role) return;
                      try {
                        await markAllNotificationsRead(user.role);
                        await load();
                      } catch {
                        /* ignore */
                      }
                    })();
                  }}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <PremiumEmpty icon="notifications-outline" title="Aucune alerte" body="Les notifications apparaîtront ici." />
          }
          renderItem={({ item }) => (
            <PremiumListItem
              title={item.title}
              subtitle={item.content}
              value={new Date(item.createdAt).toLocaleDateString('fr-FR')}
              accent={!item.read}
              onPress={() => void onPress(item)}
            />
          )}
        />
      )}
    </View>
  );
}
