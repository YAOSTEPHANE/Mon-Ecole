import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { adminApi, type AdminClass, type AdminStudent } from '../api/admin';
import { colors } from '../theme';
import {
  PremiumChipRow,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumInput,
  PremiumListItem,
  PremiumPageHeader,
  screenPad,
} from '../components/premium/PremiumUi';

function studentName(s: AdminStudent): string {
  return `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || 'Élève';
}

export default function AdminStudentsScreen() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof adminApi.getStudent>> | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setClasses(await adminApi.getClasses());
      } catch {
        setClasses([]);
      }
    })();
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminApi.getStudents({
        enrollmentStatus: 'ACTIVE',
        ...(classFilter ? { classId: classFilter } : {}),
      });
      setStudents(list);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void (async () => {
      setDetailLoading(true);
      try {
        setDetail(await adminApi.getStudent(selectedId));
      } catch {
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = studentName(s).toLowerCase();
      const cls = (s.class?.name ?? '').toLowerCase();
      const num = (s.studentNumber ?? '').toLowerCase();
      return name.includes(q) || cls.includes(q) || num.includes(q);
    });
  }, [students, search]);

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader
        eyebrow="Administration"
        title="Élèves"
        subtitle={`${filtered.length} fiche(s)`}
      />
      <View style={screenPad.fill}>
        <PremiumInput
          placeholder="Rechercher un élève…"
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 12 }}
        />
        <PremiumChipRow>
          <PremiumFilterChip label="Toutes" active={!classFilter} onPress={() => setClassFilter(null)} />
          {classes.map((c) => {
            const active = classFilter === c.id;
            return (
              <PremiumFilterChip
                key={c.id}
                label={c.name}
                active={active}
                onPress={() => setClassFilter(active ? null : c.id)}
              />
            );
          })}
        </PremiumChipRow>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <PremiumEmpty icon="school-outline" title="Aucun élève" body="Aucun élève trouvé pour ce filtre." />
          }
          renderItem={({ item }) => (
            <PremiumListItem
              title={studentName(item)}
              subtitle={[item.class?.name, item.studentNumber].filter(Boolean).join(' · ') || 'Sans classe'}
              onPress={() => setSelectedId(item.id)}
            />
          )}
        />
      )}
      </View>

      <Modal visible={selectedId != null} animationType="slide" onRequestClose={() => setSelectedId(null)}>
        <View style={styles.modal}>
          <PremiumPageHeader eyebrow="Fiche" title="Élève" />
          <View style={screenPad.body}>
            <Pressable onPress={() => setSelectedId(null)} style={{ marginBottom: 12 }}>
              <Text style={styles.close}>Fermer</Text>
            </Pressable>
          {detailLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
          ) : detail ? (
            <View style={styles.detail}>
              <Text style={styles.detailName}>{studentName(detail)}</Text>
              <DetailLine label="Classe" value={detail.class?.name ?? '—'} />
              <DetailLine label="N° élève" value={detail.studentNumber ?? '—'} />
              <DetailLine label="Statut" value={detail.enrollmentStatus ?? '—'} />
              <DetailLine label="Email" value={detail.user?.email ?? '—'} />
              <DetailLine label="Téléphone" value={detail.user?.phone ?? '—'} />
              {detail.parents && detail.parents.length > 0 ? (
                <View style={styles.parentBlock}>
                  <Text style={styles.parentTitle}>Responsables</Text>
                  {detail.parents.map((link, i) => {
                    const p = link.parent?.user;
                    const name = `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim();
                    return (
                      <Text key={i} style={styles.parentLine}>
                        {name || 'Parent'}
                        {p?.phone ? ` · ${p.phone}` : ''}
                      </Text>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.empty}>Impossible de charger la fiche.</Text>
          )}
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
  list: { paddingBottom: 24 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24, paddingHorizontal: 20 },
  modal: { flex: 1, backgroundColor: colors.bg },
  close: { fontSize: 15, fontWeight: '800', color: colors.navy },
  detail: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailName: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 16 },
  detailLine: { marginBottom: 12 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 2 },
  detailValue: { fontSize: 14, color: colors.ink },
  parentBlock: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  parentTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  parentLine: { fontSize: 13, color: colors.muted, marginBottom: 4 },
});
