import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { normalizeRole } from '../lib/roles';
import { colors } from '../theme';
import {
  PremiumButton,
  PremiumChipRow,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumInput,
  PremiumPageHeader,
  screenPad,
} from '../components/premium/PremiumUi';
import {
  teacherApi,
  type AttendanceStatus,
  type RollcallCourse,
  type RollcallStudent,
} from '../api/teacher';
import { educatorApi } from '../api/educator';

function todayIso(): string {
  return new Date().toISOString().split('T')[0]!;
}

function studentName(s: RollcallStudent): string {
  return `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || 'Élève';
}

function statusLabel(status: AttendanceStatus): string {
  if (status === 'PRESENT') return 'Présent';
  if (status === 'LATE') return 'Retard';
  return 'Absent';
}

function statusStyle(status: AttendanceStatus) {
  if (status === 'PRESENT') return styles.badgePresent;
  if (status === 'LATE') return styles.badgeLate;
  return styles.badgeAbsent;
}

function nextStatus(current: AttendanceStatus): AttendanceStatus {
  if (current === 'PRESENT') return 'ABSENT';
  if (current === 'ABSENT') return 'LATE';
  return 'PRESENT';
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role ?? '');
  const isEducator = role === 'EDUCATOR';

  const [courses, setCourses] = useState<RollcallCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const students = useMemo(
    () => (selectedCourse?.class?.students ?? []).filter((s) => s.isActive !== false),
    [selectedCourse],
  );

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const data = isEducator
        ? await educatorApi.getAttendanceCourses()
        : await teacherApi.getCourses({ scope: 'mine' });
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId((prev) =>
          prev && data.some((c) => c.id === prev) ? prev : data[0]!.id,
        );
      } else {
        setSelectedCourseId(null);
      }
    } catch {
      setCourses([]);
      setSelectedCourseId(null);
      Alert.alert('Erreur', 'Impossible de charger vos cours.');
    } finally {
      setLoadingCourses(false);
    }
  }, [isEducator]);

  const loadAbsences = useCallback(async () => {
    if (!selectedCourseId) return;
    setLoadingAbsences(true);
    try {
      const absences = isEducator
        ? await educatorApi.getCourseAbsences(selectedCourseId, selectedDate)
        : await teacherApi.getCourseAbsences(selectedCourseId, selectedDate);

      const next: Record<string, AttendanceStatus> = {};
      for (const s of students) {
        const record = absences.find((a) => a.studentId === s.id);
        if (record) {
          next[s.id] =
            record.status === 'PRESENT'
              ? 'PRESENT'
              : record.status === 'LATE'
                ? 'LATE'
                : 'ABSENT';
        } else {
          next[s.id] = 'ABSENT';
        }
      }
      setAttendance(next);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger l’appel pour ce cours.');
    } finally {
      setLoadingAbsences(false);
    }
  }, [isEducator, selectedCourseId, selectedDate, students]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (!selectedCourseId || students.length === 0) {
      setAttendance({});
      return;
    }
    void loadAbsences();
  }, [selectedCourseId, selectedDate, students, loadAbsences]);

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    for (const s of students) {
      const st = attendance[s.id] ?? 'ABSENT';
      if (st === 'PRESENT') present += 1;
      else if (st === 'LATE') late += 1;
      else absent += 1;
    }
    return { present, absent, late, total: students.length };
  }, [students, attendance]);

  const onInit = () => {
    if (!selectedCourseId) return;
    Alert.alert(
      'Réinitialiser l’appel',
      'Tous les élèves seront marqués absents pour ce cours et cette date.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setSaving(true);
                const api = isEducator ? educatorApi : teacherApi;
                const res = await api.initAttendance({
                  courseId: selectedCourseId,
                  date: selectedDate,
                });
                const next: Record<string, AttendanceStatus> = {};
                for (const s of students) next[s.id] = 'ABSENT';
                setAttendance(next);
                Alert.alert(
                  'Appel réinitialisé',
                  `${res.total ?? students.length} élève(s) marqué(s) absent(s).`,
                );
              } catch (err: unknown) {
                const msg =
                  (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Échec de la réinitialisation.';
                Alert.alert('Erreur', msg);
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ],
    );
  };

  const onSave = () => {
    if (!selectedCourseId || students.length === 0) return;
    void (async () => {
      try {
        setSaving(true);
        const payload = {
          courseId: selectedCourseId,
          date: selectedDate,
          attendance: students.map((s) => ({
            studentId: s.id,
            status: attendance[s.id] ?? 'ABSENT',
            excused: false,
          })),
        };
        if (isEducator) await educatorApi.takeAttendance(payload);
        else await teacherApi.takeAttendance(payload);
        Alert.alert('Succès', 'Appel enregistré.');
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Échec de l’enregistrement.';
        Alert.alert('Erreur', msg);
      } finally {
        setSaving(false);
      }
    })();
  };

  if (loadingCourses) {
    return (
      <View style={screenPad.root}>
        <PremiumPageHeader eyebrow="Classe" title="Appel" subtitle="Chargement des cours…" />
        <ActivityIndicator color={colors.gold} style={{ marginTop: 32 }} />
      </View>
    );
  }

  if (courses.length === 0) {
    return (
      <View style={screenPad.root}>
        <PremiumPageHeader eyebrow="Classe" title="Appel" />
        <View style={screenPad.body}>
          <PremiumEmpty
            icon="people-outline"
            title="Aucun cours disponible"
            body={
              isEducator
                ? 'Aucune classe ne vous est assignée pour la prise d’appel.'
                : 'Aucun cours n’est rattaché à votre compte enseignant.'
            }
          />
        </View>
      </View>
    );
  }

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader
        eyebrow="Classe"
        title="Appel"
        subtitle={`${stats.present} présents · ${stats.absent} absents · ${stats.late} retards`}
      />
      <View style={[screenPad.fill, { paddingBottom: 96 }]}>
        <Text style={styles.label}>Cours</Text>
        <PremiumChipRow>
          {courses.map((c) => {
            const label = `${c.name}${c.class?.name ? ` · ${c.class.name}` : ''}`;
            return (
              <PremiumFilterChip
                key={c.id}
                label={label}
                active={c.id === selectedCourseId}
                onPress={() => setSelectedCourseId(c.id)}
              />
            );
          })}
        </PremiumChipRow>

        <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
        <PremiumInput
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="2026-03-17"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {loadingAbsences ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={students}
            keyExtractor={(s) => s.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <PremiumEmpty icon="school-outline" title="Aucun élève actif dans cette classe." />
            }
            renderItem={({ item }) => {
              const status = attendance[item.id] ?? 'ABSENT';
              return (
                <Pressable
                  style={styles.studentRow}
                  onPress={() =>
                    setAttendance((prev) => ({
                      ...prev,
                      [item.id]: nextStatus(prev[item.id] ?? 'ABSENT'),
                    }))
                  }
                >
                  <Text style={styles.studentName}>{studentName(item)}</Text>
                  <View style={[styles.badge, statusStyle(status)]}>
                    <Text style={styles.badgeText}>{statusLabel(status)}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <PremiumButton
            label="Réinitialiser"
            variant="ghost"
            onPress={onInit}
            disabled={saving || !selectedCourseId}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PremiumButton
            label="Enregistrer l’appel"
            onPress={onSave}
            loading={saving}
            disabled={!selectedCourseId || students.length === 0}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 8, marginTop: 4 },
  list: { paddingTop: 14, paddingBottom: 110 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  studentName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink, marginRight: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgePresent: { backgroundColor: '#d1fae5' },
  badgeLate: { backgroundColor: 'rgba(235,176,45,0.22)' },
  badgeAbsent: { backgroundColor: '#ffe4e6' },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.ink },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
