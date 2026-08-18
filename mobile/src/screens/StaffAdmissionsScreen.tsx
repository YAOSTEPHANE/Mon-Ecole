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
import { staffApi, type StaffAdmission } from '../api/staff';
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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  UNDER_REVIEW: 'À l’étude',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  WAITLIST: 'Liste d’attente',
  ENROLLED: 'Inscrit',
};

const STATUS_OPTIONS = ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLIST'] as const;

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

export default function StaffAdmissionsScreen() {
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<StaffAdmission[]>([]);
  const [selected, setSelected] = useState<StaffAdmission | null>(null);
  const [newStatus, setNewStatus] = useState<string>('UNDER_REVIEW');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const list = await staffApi.listAdmissions(filter ? { status: filter } : undefined);
    setRows(list);
  }, [filter]);

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

  const openDetail = (item: StaffAdmission) => {
    setSelected(item);
    setNewStatus(
      STATUS_OPTIONS.includes(item.status as (typeof STATUS_OPTIONS)[number])
        ? item.status
        : 'UNDER_REVIEW',
    );
    setAdminNotes(item.adminNotes ?? '');
  };

  const onSave = () => {
    if (!selected) return;
    void (async () => {
      try {
        setSaving(true);
        await staffApi.updateAdmission(selected.id, {
          status: newStatus,
          adminNotes: adminNotes.trim() || undefined,
        });
        setSelected(null);
        await load();
        Alert.alert('Succès', 'Dossier mis à jour.');
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Échec de la mise à jour.';
        Alert.alert('Erreur', msg);
      } finally {
        setSaving(false);
      }
    })();
  };

  const renderHeader = () => (
    <PremiumChipRow>
      {['', 'PENDING', 'UNDER_REVIEW', 'ACCEPTED'].map((s) => {
        const label = s ? (STATUS_LABELS[s] ?? s) : 'Toutes';
        return (
          <PremiumFilterChip
            key={s || 'all'}
            label={label}
            active={filter === s}
            onPress={() => setFilter(s)}
          />
        );
      })}
    </PremiumChipRow>
  );

  if (loading && rows.length === 0) {
    return (
      <View style={screenPad.root}>
        <PremiumPageHeader eyebrow="Secrétariat" title="Admissions" subtitle="Chargement…" />
        <ActivityIndicator color={colors.gold} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader
        eyebrow="Secrétariat"
        title="Admissions"
        subtitle={`${rows.length} dossier(s)`}
      />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={<PremiumEmpty icon="folder-open-outline" title="Aucun dossier d’admission." />}
        renderItem={({ item }) => (
          <PremiumListItem
            title={`${item.firstName} ${item.lastName}`}
            subtitle={`${item.reference} · ${item.desiredLevel} · ${item.academicYear}`}
            value={STATUS_LABELS[item.status] ?? item.status}
            onPress={() => openDetail(item)}
            accent={item.status === 'PENDING'}
          />
        )}
      />

      <Modal visible={selected != null} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modal}>
          <PremiumPageHeader eyebrow="Dossier" title="Admission" />
          <View style={screenPad.body}>
            <Pressable onPress={() => setSelected(null)} style={{ marginBottom: 12 }}>
              <Text style={styles.close}>Fermer</Text>
            </Pressable>
          {selected ? (
            <View style={styles.detail}>
              <Text style={styles.detailName}>
                {selected.firstName} {selected.lastName}
              </Text>
              <DetailLine label="Référence" value={selected.reference} />
              <DetailLine label="E-mail" value={selected.email} />
              <DetailLine label="Téléphone" value={selected.phone ?? '—'} />
              <DetailLine label="Niveau souhaité" value={selected.desiredLevel} />
              <DetailLine label="Année" value={selected.academicYear} />
              <DetailLine label="Créé le" value={fmtDate(selected.createdAt)} />

              <Text style={styles.fieldLabel}>Statut</Text>
              <PremiumChipRow>
                {STATUS_OPTIONS.map((s) => (
                  <PremiumFilterChip
                    key={s}
                    label={STATUS_LABELS[s] ?? s}
                    active={newStatus === s}
                    onPress={() => setNewStatus(s)}
                  />
                ))}
              </PremiumChipRow>

              <Text style={styles.fieldLabel}>Notes admin</Text>
              <PremiumInput
                value={adminNotes}
                onChangeText={setAdminNotes}
                multiline
                numberOfLines={3}
                style={styles.notesInput}
              />

              {selected.status !== 'ENROLLED' ? (
                <View style={{ marginTop: 16 }}>
                  <PremiumButton label="Enregistrer" onPress={onSave} loading={saving} />
                </View>
              ) : (
                <Text style={styles.enrolledNote}>Dossier déjà inscrit — modification limitée.</Text>
              )}
            </View>
          ) : null}
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
  detailLine: { marginBottom: 8 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: colors.muted },
  detailValue: { fontSize: 14, color: colors.ink, marginTop: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, marginTop: 12, marginBottom: 6 },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  enrolledNote: { marginTop: 16, fontSize: 13, color: colors.muted },
});
