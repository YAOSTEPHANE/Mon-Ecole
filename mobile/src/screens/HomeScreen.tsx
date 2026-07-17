import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { ROLE_LABELS } from '../lib/roles';
import { colors } from '../theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const { connected } = useRealtime();

  return (
    <View style={styles.root}>
      <Text style={styles.hello}>Bonjour{user?.firstName ? `, ${user.firstName}` : ''}</Text>
      <Text style={styles.role}>
        {ROLE_LABELS[user?.role?.toUpperCase() || ''] || user?.role || 'Compte'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Temps réel</Text>
        <Text style={styles.cardBody}>
          {connected
            ? 'Connecté — les notifications arrivent instantanément.'
            : 'Hors ligne WebSocket — vérifiez que l’API locale tourne (pas sur Vercel serverless).'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Votre espace</Text>
        <Text style={styles.cardBody}>
          Utilisez les onglets pour voir les notifications, l’assistant pédagogique (si votre rôle
          le permet) et votre profil.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  hello: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: 8 },
  role: { fontSize: 14, color: colors.accent, fontWeight: '600', marginTop: 4, marginBottom: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  cardBody: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
