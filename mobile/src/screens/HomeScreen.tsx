import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import {
  ROLE_LABELS,
  normalizeRole,
} from '../lib/roles';
import { colors } from '../theme';
import { teacherApi } from '../api/teacher';
import { educatorApi } from '../api/educator';
import { studentApi, type StudentAbsence, type StudentGrade, type StudentPayment } from '../api/student';
import { parentApi } from '../api/parent';
import {
  PremiumCard,
  PremiumHero,
  PremiumKpi,
  PremiumKpiGrid,
  PremiumRow,
  screenPad,
} from '../components/premium/PremiumUi';

type AcademicSnapshot = {
  average20: number | null;
  gradesCount: number;
  lastGrades: StudentGrade[];
  absencesCount: number;
  lastAbsence: StudentAbsence | null;
  unpaidAmount: number;
  paymentsCount: number;
};

function to20(score: number, maxScore: number): number | null {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return null;
  return (score / maxScore) * 20;
}

function averageOn20(grades: StudentGrade[]): number | null {
  let sum = 0;
  let coef = 0;
  for (const g of grades) {
    const v = to20(Number(g.score), Number(g.maxScore));
    if (v == null) continue;
    const c = Number(g.coefficient) || 1;
    sum += v * c;
    coef += c;
  }
  return coef > 0 ? Math.round((sum / coef) * 10) / 10 : null;
}

function unpaidTotal(payments: StudentPayment[]): number {
  return payments
    .filter((p) => {
      const st = (p.status ?? '').toUpperCase();
      return st !== 'COMPLETED' && st !== 'PAID' && st !== 'SUCCESS';
    })
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { connected } = useRealtime();
  const role = normalizeRole(user?.role ?? '');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffLine, setStaffLine] = useState<string | null>(null);
  const [academic, setAcademic] = useState<AcademicSnapshot | null>(null);
  const [childName, setChildName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setStaffLine(null);
    setAcademic(null);
    setChildName(null);

    try {
      if (role === 'TEACHER') {
        const kpis = (await teacherApi.getDashboardKpis()) as {
          coursesCount?: number;
          studentsCount?: number;
        };
        const parts = [
          kpis.coursesCount != null ? `${kpis.coursesCount} cours` : null,
          kpis.studentsCount != null ? `${kpis.studentsCount} élèves` : null,
        ].filter(Boolean);
        if (parts.length) setStaffLine(parts.join(' · '));
        return;
      }

      if (role === 'EDUCATOR') {
        const stats = (await educatorApi.getStats()) as {
          studentsCount?: number;
          classesCount?: number;
        };
        const parts = [
          stats.classesCount != null ? `${stats.classesCount} classes` : null,
          stats.studentsCount != null ? `${stats.studentsCount} élèves` : null,
        ].filter(Boolean);
        if (parts.length) setStaffLine(parts.join(' · '));
        return;
      }

      if (role === 'STUDENT') {
        const [gradesRes, absences, payments] = await Promise.all([
          studentApi.getGrades(),
          studentApi.getAbsences(),
          studentApi.getPayments(),
        ]);
        const grades = [...gradesRes.grades].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setAcademic({
          average20: averageOn20(grades),
          gradesCount: grades.length,
          lastGrades: grades.slice(0, 3),
          absencesCount: absences.length,
          lastAbsence: absences[0] ?? null,
          unpaidAmount: unpaidTotal(payments),
          paymentsCount: payments.length,
        });
        return;
      }

      if (role === 'PARENT') {
        const children = await parentApi.getChildren();
        const child = children[0];
        if (!child) return;
        setChildName(
          `${child.user?.firstName ?? ''} ${child.user?.lastName ?? ''}`.trim() || 'Enfant',
        );
        const [gradesRes, absences, payments] = await Promise.all([
          parentApi.getChildGrades(child.id),
          parentApi.getChildAbsences(child.id),
          parentApi.getChildPayments(child.id),
        ]);
        const grades = [...(gradesRes.grades ?? [])].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ) as StudentGrade[];
        setAcademic({
          average20: averageOn20(grades),
          gradesCount: grades.length,
          lastGrades: grades.slice(0, 3),
          absencesCount: absences.length,
          lastAbsence: (absences[0] as StudentAbsence | undefined) ?? null,
          unpaidAmount: unpaidTotal(payments as StudentPayment[]),
          paymentsCount: payments.length,
        });
      }
    } catch {
      /* aperçu optionnel */
    }
  }, [user, role]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = () => {
    void (async () => {
      setRefreshing(true);
      await load();
      setRefreshing(false);
    })();
  };

  const roleLabel = ROLE_LABELS[role] || user?.role || 'Compte';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[screenPad.home, { paddingTop: Math.max(insets.top, 12) }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      <PremiumHero
        eyebrow="École à jour"
        title={`Bonjour${user?.firstName ? `, ${user.firstName}` : ''}`}
        subtitle={childName ? `${roleLabel} · suivi de ${childName}` : roleLabel}
        connected={connected}
      />

      {loading ? (
        <PremiumCard title="Chargement">
          <ActivityIndicator color={colors.gold} />
        </PremiumCard>
      ) : null}

      {staffLine ? (
        <PremiumCard eyebrow="Pilotage" title="Aperçu">
          <PremiumKpiGrid>
            <PremiumKpi icon="briefcase-outline" label="Charge" value={staffLine} />
          </PremiumKpiGrid>
        </PremiumCard>
      ) : null}

      {academic ? (
        <>
          <PremiumKpiGrid>
            <PremiumKpi
              icon="school-outline"
              label="Moyenne"
              value={academic.average20 != null ? `${academic.average20.toFixed(1)}/20` : '—'}
              hint={`${academic.gradesCount} note${academic.gradesCount > 1 ? 's' : ''}`}
            />
            <PremiumKpi
              icon="calendar-outline"
              label="Absences"
              value={String(academic.absencesCount)}
              hint={
                academic.lastAbsence
                  ? `Dernière ${fmtDate(academic.lastAbsence.date)}`
                  : 'Aucune récente'
              }
            />
            <PremiumKpi
              icon="card-outline"
              label="Paiements"
              value={
                academic.unpaidAmount > 0
                  ? `${Math.round(academic.unpaidAmount).toLocaleString('fr-FR')} F`
                  : academic.paymentsCount > 0
                    ? 'À jour'
                    : '—'
              }
              hint={academic.unpaidAmount > 0 ? 'Solde restant' : `${academic.paymentsCount} opération(s)`}
            />
          </PremiumKpiGrid>

          <PremiumCard eyebrow="Scolarité" title="Dernières notes">
            {academic.lastGrades.length === 0 ? (
              <PremiumRow title="Aucune note pour le moment" value="—" last />
            ) : (
              academic.lastGrades.map((g, i) => {
                const v = to20(Number(g.score), Number(g.maxScore));
                return (
                  <PremiumRow
                    key={g.id ?? `${g.course?.name}-${g.date}-${i}`}
                    title={g.course?.name ?? g.title ?? 'Matière'}
                    subtitle={fmtDate(g.date)}
                    value={v != null ? `${v.toFixed(1)}/20` : `${g.score}/${g.maxScore}`}
                    last={i === academic.lastGrades.length - 1}
                  />
                );
              })
            )}
          </PremiumCard>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
