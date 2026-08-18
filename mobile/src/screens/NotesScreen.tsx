import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { normalizeRole } from '../lib/roles';
import { studentApi, type StudentGrade } from '../api/student';
import { parentApi, type ParentGradesResponse } from '../api/parent';
import ParentChildPicker from './ParentChildPicker';
import { useParentChild } from '../context/ParentChildContext';
import {
  PremiumEmpty,
  PremiumListItem,
  PremiumPageHeader,
  screenPad,
} from '../components/premium/PremiumUi';

function to20(score: number, maxScore: number): number | null {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return null;
  return (score / maxScore) * 20;
}

export default function NotesScreen() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role ?? '');
  const { selectedId: parentChildId } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [tuitionHidden, setTuitionHidden] = useState<string[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setGrades([]);
        setTuitionHidden(null);
        if (role === 'STUDENT') {
          const res = await studentApi.getGrades();
          setGrades(res.grades);
          setTuitionHidden(res.tuitionBlock?.hiddenAcademicYears ?? null);
          return;
        }
        if (role === 'PARENT' && parentChildId) {
          const res = (await parentApi.getChildGrades(parentChildId)) as unknown as ParentGradesResponse & {
            tuitionBlock?: { hiddenAcademicYears?: string[] };
          };
          setGrades(Array.isArray(res?.grades) ? (res.grades as StudentGrade[]) : []);
          setTuitionHidden(res?.tuitionBlock?.hiddenAcademicYears ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [role, parentChildId]);

  const data = useMemo(
    () =>
      grades.map((g) => {
        const v = to20(Number(g.score), Number(g.maxScore));
        const teacherName = `${g.teacher?.user?.firstName ?? ''} ${g.teacher?.user?.lastName ?? ''}`.trim();
        const date = g.date ? new Date(g.date).toLocaleDateString('fr-FR') : '';
        return {
          key: g.id ?? `${g.course?.name}-${date}`,
          title: g.course?.name ?? g.title ?? 'Matière',
          subtitle: [teacherName || null, date || null, `coeff. ${g.coefficient}`]
            .filter(Boolean)
            .join(' · '),
          value: v != null ? `${v.toFixed(1)}/20` : `${g.score}/${g.maxScore}`,
        };
      }),
    [grades],
  );

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader
        eyebrow="Scolarité"
        title="Notes"
        subtitle={tuitionHidden?.length ? `Accès limité · ${tuitionHidden.join(', ')}` : `${data.length} évaluation(s)`}
      />
      <View style={screenPad.fill}>
        {role === 'PARENT' ? <ParentChildPicker /> : null}
        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
        ) : data.length === 0 ? (
          <PremiumEmpty icon="ribbon-outline" title="Aucune note" body="Les évaluations apparaîtront ici." />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }) => (
              <PremiumListItem title={item.title} subtitle={item.subtitle} value={item.value} />
            )}
          />
        )}
      </View>
    </View>
  );
}
