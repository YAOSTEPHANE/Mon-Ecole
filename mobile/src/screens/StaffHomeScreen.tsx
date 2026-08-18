import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { useStaffWorkspace } from '../hooks/useStaffWorkspace';
import { ROLE_LABELS, normalizeRole } from '../lib/roles';
import { colors } from '../theme';
import { staffApi } from '../api/staff';
import {
  PremiumCard,
  PremiumHero,
  PremiumKpi,
  PremiumKpiGrid,
  PremiumRow,
  screenPad,
} from '../components/premium/PremiumUi';

const MODULE_LABELS: Record<string, string> = {
  overview: 'Vue d’ensemble',
  counter: 'Guichet / scolarité',
  admissions: 'Admissions',
  appointments: 'Rendez-vous',
  student_registry: 'Registre élèves',
  treasury: 'Trésorerie',
  validations: 'Validations',
  academic_overview: 'Suivi académique',
  class_councils: 'Conseils de classe',
  attendance_mgmt: 'Assiduité',
  communication_mgmt: 'Communication',
  library_mgmt: 'Bibliothèque',
};

export default function StaffHomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { connected } = useRealtime();
  const role = normalizeRole(user?.role ?? '');
  const { workspace, loading } = useStaffWorkspace(role === 'STAFF');
  const [admissionStats, setAdmissionStats] = useState<{
    pending: number;
    underReview: number;
  } | null>(null);

  useEffect(() => {
    if (!workspace?.visibleModules?.includes('admissions')) return;
    void (async () => {
      try {
        const stats = await staffApi.getAdmissionsStats();
        setAdmissionStats({ pending: stats.pending, underReview: stats.underReview });
      } catch {
        setAdmissionStats(null);
      }
    })();
  }, [workspace]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[screenPad.home, { paddingTop: Math.max(insets.top, 12) }]}
    >
      <PremiumHero
        eyebrow="Personnel"
        title={`Bonjour${user?.firstName ? `, ${user.firstName}` : ''}`}
        subtitle={workspace?.metierLabel || ROLE_LABELS[role] || 'Personnel'}
        connected={connected}
      />

      {loading ? (
        <PremiumCard title="Chargement">
          <ActivityIndicator color={colors.gold} />
        </PremiumCard>
      ) : workspace ? (
        <PremiumCard eyebrow="Espace" title="Modules assignés">
          {workspace.visibleModules.length === 0 ? (
            <PremiumRow title="Aucun module assigné" value="—" last />
          ) : (
            workspace.visibleModules.map((id, i) => (
              <PremiumRow
                key={id}
                title={MODULE_LABELS[id] ?? id}
                value="Actif"
                last={i === workspace.visibleModules.length - 1}
              />
            ))
          )}
        </PremiumCard>
      ) : (
        <PremiumCard title="Accès">
          <Text style={styles.body}>Profil personnel introuvable ou accès refusé.</Text>
        </PremiumCard>
      )}

      {admissionStats ? (
        <PremiumKpiGrid>
          <PremiumKpi icon="time-outline" label="En attente" value={String(admissionStats.pending)} />
          <PremiumKpi icon="search-outline" label="À l’étude" value={String(admissionStats.underReview)} />
        </PremiumKpiGrid>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
