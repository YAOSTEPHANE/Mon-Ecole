import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/roles';
import { getApiUrl } from '../config';
import { colors } from '../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const onLogout = () => {
    Alert.alert('Déconnexion', 'Quitter votre session ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.meta}>{user?.email}</Text>
          <Text style={styles.badgeText}>
            {ROLE_LABELS[user?.role?.toUpperCase() || ''] || user?.role}
          </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>API</Text>
        <Text style={styles.meta}>{getApiUrl()}</Text>
      </View>

      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink },
  meta: { marginTop: 4, color: colors.muted, fontSize: 14 },
  badge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.dark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '700',
  },
  label: { fontWeight: '700', color: colors.ink, marginBottom: 4 },
  logout: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
