import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../theme';
import {
  PremiumEmpty,
  PremiumPageHeader,
  screenPad,
} from '../../components/premium/PremiumUi';
import { teacherApi, type TeacherPayrollLine } from '../../api/teacher';

const MONTHS = [
  '',
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const STATUS_FR: Record<string, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  PAID: 'Payé',
  CANCELLED: 'Annulé',
};

function formatFcfa(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

export default function TeacherPayslipsScreen() {
  const [rows, setRows] = useState<TeacherPayrollLine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await teacherApi.getMyPayrollLines());
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openPayslip = async (id: string, status: string) => {
    if (status !== 'VALIDATED' && status !== 'PAID') {
      Alert.alert('Indisponible', 'Le bulletin n’est visible qu’après validation.');
      return;
    }
    try {
      const s = await teacherApi.getPayslipSummary(id);
      Alert.alert(
        s.monthLabel,
        `Statut : ${STATUS_FR[s.status] ?? s.status}\nBase : ${formatFcfa(s.baseSalary)}\nPrimes : ${formatFcfa(s.bonuses)}\nRetenues : ${formatFcfa(s.deductions)}\nNet : ${formatFcfa(s.netPay)}`,
      );
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Ouverture impossible');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, screenPad]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.root, screenPad]}>
      <PremiumPageHeader title="Ma paie" subtitle="Bulletins validés / payés" />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<PremiumEmpty icon="wallet-outline" title="Aucun bulletin" />}
        renderItem={({ item }) => {
          const run = item.payrollRun;
          const label = `${MONTHS[run.month] ?? run.month} ${run.year}`;
          return (
            <Pressable style={styles.card} onPress={() => void openPayslip(item.id, run.status)}>
              <Text style={styles.title}>{label}</Text>
              <Text style={styles.meta}>
                {STATUS_FR[run.status] ?? run.status} · Net {formatFcfa(item.netAmount)}
              </Text>
              {(run.status === 'VALIDATED' || run.status === 'PAID') && (
                <Text style={styles.link}>Voir le détail</Text>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4 },
  link: { marginTop: 8, color: colors.accent, fontWeight: '600' },
});
