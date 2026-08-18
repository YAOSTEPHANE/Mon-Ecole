import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  adminApi,
  type AbsencePermissionRequest,
  type AbsencePermissionStats,
} from '../api/admin';
import { colors } from '../theme';
import {
  PremiumButton,
  PremiumChipRow,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumInput,
  PremiumListItem,
  PremiumPageHeader,
  screenPad,
} from '../components/premium/PremiumUi';

const MOTIF_LABELS: Record<string, string> = {
  MEDICAL: 'Médical',
  FAMILIAL: 'Familial',
  OTHER: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};

function studentName(r: AbsencePermissionRequest): string {
  return `${r.student?.user?.firstName ?? ''} ${r.student?.user?.lastName ?? ''}`.trim() || 'Élève';
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

export default function AdminPermissionRequestsScreen() {
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<AbsencePermissionRequest[]>([]);
  const [stats, setStats] = useState<AbsencePermissionStats | null>(null);
  const [selected, setSelected] = useState<AbsencePermissionRequest | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [list, statData] = await Promise.all([
      adminApi.getAbsencePermissionRequests(
        filter === 'PENDING' ? { status: 'PENDING' } : undefined,
      ),
      adminApi.getAbsencePermissionStats(),
    ]);
    setRequests(list);
    setStats(statData);
  }, [filter]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch {
        setRequests([]);
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
        setRequests([]);
      } finally {
        setRefreshing(false);
      }
    })();
  };

  const onApprove = (item: AbsencePermissionRequest) => {
    Alert.alert('Approuver la demande', `Confirmer l’approbation pour ${studentName(item)} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Approuver',
        onPress: () => {
          void (async () => {
            try {
              setSaving(true);
              await adminApi.reviewAbsencePermissionRequest(item.id, { status: 'APPROVED' });
              setSelected(null);
              await load();
              Alert.alert('Succès', 'Demande approuvée.');
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                'Échec de l’approbation.';
              Alert.alert('Erreur', msg);
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  };

  const onReject = () => {
    if (!selected) return;
    if (!rejectComment.trim()) {
      Alert.alert('Motif requis', 'Indiquez un motif de refus.');
      return;
    }
    void (async () => {
      try {
        setSaving(true);
        await adminApi.reviewAbsencePermissionRequest(selected.id, {
          status: 'REJECTED',
          adminComment: rejectComment.trim(),
        });
        setShowRejectModal(false);
        setRejectComment('');
        setSelected(null);
        await load();
        Alert.alert('Succès', 'Demande refusée.');
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Échec du refus.';
        Alert.alert('Erreur', msg);
      } finally {
        setSaving(false);
      }
    })();
  };

  const renderHeader = () => (
    <PremiumChipRow>
      <PremiumFilterChip
        label={stats ? `En attente (${stats.pending})` : 'En attente'}
        active={filter === 'PENDING'}
        onPress={() => setFilter('PENDING')}
      />
      <PremiumFilterChip
        label="Toutes"
        active={filter === 'ALL'}
        onPress={() => setFilter('ALL')}
      />
    </PremiumChipRow>
  );

  if (loading && requests.length === 0) {
    return (
      <View style={screenPad.root}>
        <PremiumPageHeader eyebrow="Administration" title="Demandes d’absence" subtitle="Chargement…" />
        <ActivityIndicator color={colors.gold} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader
        eyebrow="Administration"
        title="Demandes d’absence"
        subtitle={stats ? `${stats.pending} en attente` : undefined}
      />
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          <PremiumEmpty
            icon="document-text-outline"
            title={filter === 'PENDING' ? 'Aucune demande en attente.' : 'Aucune demande.'}
          />
        }
        renderItem={({ item }) => (
          <PremiumListItem
            title={studentName(item)}
            subtitle={`${fmtDate(item.startDate)} → ${fmtDate(item.endDate)} · ${MOTIF_LABELS[item.motif] ?? item.motif}`}
            value={STATUS_LABELS[item.status] ?? item.status}
            onPress={() => setSelected(item)}
            accent={item.status === 'PENDING'}
          />
        )}
      />

      <Modal visible={selected != null && !showRejectModal} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modal}>
          <PremiumPageHeader eyebrow="Validation" title="Demande d’absence" />
          <View style={screenPad.body}>
            <Pressable onPress={() => setSelected(null)} style={{ marginBottom: 12 }}>
              <Text style={styles.close}>Fermer</Text>
            </Pressable>
          {selected ? (
            <View style={styles.detail}>
              <Text style={styles.detailName}>{studentName(selected)}</Text>
              <DetailLine label="Classe" value={selected.student?.class?.name ?? '—'} />
              <DetailLine
                label="Période"
                value={`${fmtDate(selected.startDate)} → ${fmtDate(selected.endDate)}`}
              />
              <DetailLine label="Motif" value={MOTIF_LABELS[selected.motif] ?? selected.motif} />
              <DetailLine label="Détail" value={selected.reasonDetail?.trim() || '—'} />
              <DetailLine label="Statut" value={STATUS_LABELS[selected.status] ?? selected.status} />
              {selected.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <PremiumButton
                      label="Approuver"
                      onPress={() => onApprove(selected)}
                      loading={saving}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PremiumButton
                      label="Refuser"
                      variant="danger"
                      disabled={saving}
                      onPress={() => {
                        setRejectComment('');
                        setShowRejectModal(true);
                      }}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.rejectBox}>
            <Text style={styles.rejectTitle}>Motif du refus</Text>
            <PremiumInput
              value={rejectComment}
              onChangeText={setRejectComment}
              placeholder="Obligatoire…"
              multiline
              numberOfLines={4}
              style={styles.rejectInput}
            />
            <View style={styles.rejectActions}>
              <View style={{ flex: 1 }}>
                <PremiumButton label="Annuler" variant="ghost" onPress={() => setShowRejectModal(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PremiumButton label="Confirmer le refus" variant="danger" onPress={onReject} loading={saving} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  modal: { flex: 1, backgroundColor: colors.bg },
  close: { fontSize: 15, fontWeight: '800', color: colors.navy },
  detail: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailName: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  detailLine: { marginBottom: 10 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: colors.muted },
  detailValue: { fontSize: 14, color: colors.ink, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12,10,9,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  rejectBox: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  rejectTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  rejectInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  rejectActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
});
