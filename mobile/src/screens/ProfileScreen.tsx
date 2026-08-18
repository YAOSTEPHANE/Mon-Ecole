import React from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/roles';
import { getApiUrl } from '../config';
import {
  PremiumButton,
  PremiumCard,
  PremiumPageHeader,
  PremiumRow,
  screenPad,
} from '../components/premium/PremiumUi';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const onLogout = () => {
    Alert.alert('Déconnexion', 'Quitter votre session ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const role = ROLE_LABELS[user?.role?.toUpperCase() || ''] || user?.role || 'Compte';

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader
        eyebrow="Compte"
        title={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Profil'}
        subtitle={role}
      />
      <View style={screenPad.fill}>
        <PremiumCard eyebrow="Identité" title="Informations">
          <PremiumRow title="E-mail" value={user?.email ?? '—'} />
          <PremiumRow title="Rôle" value={role} last />
        </PremiumCard>
        <PremiumCard eyebrow="Technique" title="Connexion API">
          <PremiumRow title="Adresse de l’API" value={getApiUrl()} last />
        </PremiumCard>
        <View style={{ marginTop: 4 }}>
          <PremiumButton label="Se déconnecter" variant="danger" onPress={onLogout} />
        </View>
      </View>
    </View>
  );
}
