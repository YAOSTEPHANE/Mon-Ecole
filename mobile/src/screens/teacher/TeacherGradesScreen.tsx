import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../../theme';
import {
  PremiumButton,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumPageHeader,
  screenPad,
} from '../../components/premium/PremiumUi';
import { teacherApi, type RollcallCourse, type RollcallStudent } from '../../api/teacher';
import {
  cacheGet,
  enqueueOfflineAction,
  flushOfflineQueue,
  probeOnline,
} from '../../lib/offline-queue';

const EVAL_TYPES = [
  { id: 'EVALUATION', label: 'Évaluation' },
  { id: 'EXAM', label: 'Examen' },
  { id: 'HOME_EXERCISE', label: 'Ex. maison' },
  { id: 'CLASS_HOMEWORK', label: 'Devoir classe' },
  { id: 'ORAL', label: 'Oral' },
];

function studentName(s: RollcallStudent): string {
  return `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || 'Élève';
}

export default function TeacherGradesScreen() {
  const [courses, setCourses] = useState<RollcallCourse[]>([]);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [evalType, setEvalType] = useState('EVALUATION');
  const [title, setTitle] = useState('Contrôle');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('20');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  const selected = useMemo(
    () => courses.find((c) => c.id === courseId) ?? null,
    [courses, courseId],
  );
  const students = useMemo(
    () => (selected?.class?.students ?? []).filter((s) => s.isActive !== false),
    [selected],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const online = await probeOnline();
    setOffline(!online);
    if (online) await flushOfflineQueue();
    try {
      const list = await cacheGet('teacher_courses', () =>
        teacherApi.getCourses({ scope: 'mine' }),
      );
      setCourses(list);
      if (!courseId && list[0]) setCourseId(list[0].id);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!courseId || !studentId) {
      Alert.alert('Manquant', 'Choisissez un cours et un élève');
      return;
    }
    const scoreNum = parseFloat(score.replace(',', '.'));
    const maxNum = parseFloat(maxScore.replace(',', '.')) || 20;
    if (!Number.isFinite(scoreNum)) {
      Alert.alert('Note invalide', 'Saisissez une note numérique');
      return;
    }
    const payload = {
      studentId,
      courseId,
      evaluationType: evalType,
      title: title.trim() || 'Note',
      score: scoreNum,
      maxScore: maxNum,
    };
    setSaving(true);
    try {
      const online = await probeOnline();
      if (!online) {
        await enqueueOfflineAction({
          method: 'post',
          path: '/teacher/grades',
          body: payload,
          label: 'Saisie note',
        });
        setOffline(true);
        Alert.alert('Hors ligne', 'Note mise en file d’attente — sync à la reconnexion');
        setScore('');
        return;
      }
      await teacherApi.createGrade(payload);
      Alert.alert('OK', 'Note enregistrée');
      setScore('');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Échec enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[screenPad, styles.center]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[screenPad, { flex: 1 }]}>
      <PremiumPageHeader title="Saisie des notes" subtitle="Enseignant" />
      {offline ? (
        <Text style={styles.offlineBanner}>Mode hors ligne — file d’attente active</Text>
      ) : null}

      <Text style={styles.label}>Cours</Text>
      <FlatList
        horizontal
        data={courses}
        keyExtractor={(c) => c.id}
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 48, marginBottom: 8 }}
        renderItem={({ item }) => (
          <PremiumFilterChip
            label={item.name}
            selected={item.id === courseId}
            onPress={() => {
              setCourseId(item.id);
              setStudentId(null);
            }}
          />
        )}
      />

      <Text style={styles.label}>Élève</Text>
      {students.length === 0 ? (
        <PremiumEmpty title="Aucun élève" subtitle="Sélectionnez un cours" />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s) => s.id}
          style={{ maxHeight: 160, marginBottom: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setStudentId(item.id)}
              style={[styles.studentRow, studentId === item.id && styles.studentSelected]}
            >
              <Text style={styles.studentName}>{studentName(item)}</Text>
            </Pressable>
          )}
        />
      )}

      <Text style={styles.label}>Type</Text>
      <View style={styles.rowWrap}>
        {EVAL_TYPES.map((t) => (
          <PremiumFilterChip
            key={t.id}
            label={t.label}
            selected={evalType === t.id}
            onPress={() => setEvalType(t.id)}
          />
        ))}
      </View>

      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Titre"
        placeholderTextColor={colors.muted}
      />
      <View style={styles.scoreRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={score}
          onChangeText={setScore}
          keyboardType="decimal-pad"
          placeholder="Note"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.slash}>/</Text>
        <TextInput
          style={[styles.input, { width: 72 }]}
          value={maxScore}
          onChangeText={setMaxScore}
          keyboardType="decimal-pad"
          placeholder="20"
          placeholderTextColor={colors.muted}
        />
      </View>

      <PremiumButton label={saving ? 'Enregistrement…' : 'Enregistrer la note'} onPress={save} disabled={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 4 },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 12,
  },
  studentRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  studentSelected: { backgroundColor: '#FEF9C3' },
  studentName: { color: colors.ink, fontSize: 15 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slash: { fontSize: 18, color: colors.muted, marginBottom: 8 },
});
